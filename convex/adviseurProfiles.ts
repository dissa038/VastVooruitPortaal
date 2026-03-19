import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// QUERIES
// ============================================================================

/** List all active adviseurs with their user profile data */
export const list = query({
  args: {},
  handler: async (ctx) => {
    // Get all adviseur profiles
    const profiles = await ctx.db
      .query("adviseurProfiles")
      .take(50);

    // Enrich with user data
    const enriched = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          firstName: user?.firstName ?? "—",
          lastName: user?.lastName ?? "—",
          email: user?.email ?? "—",
          avatarUrl: user?.avatarUrl ?? null,
          role: user?.role ?? "—",
          isUserActive: user?.isActive ?? false,
        };
      })
    );

    // Only return profiles where the user is active
    return enriched.filter((p) => p.isUserActive);
  },
});

/** Get adviseur profile by user ID */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("adviseurProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) return null;

    const user = await ctx.db.get(args.userId);
    return {
      ...profile,
      firstName: user?.firstName ?? "—",
      lastName: user?.lastName ?? "—",
      email: user?.email ?? "—",
      avatarUrl: user?.avatarUrl ?? null,
    };
  },
});

/** Get adviseur profile by ID */
export const getById = query({
  args: { id: v.id("adviseurProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.id);
    if (!profile) return null;

    const user = await ctx.db.get(profile.userId);
    return {
      ...profile,
      firstName: user?.firstName ?? "—",
      lastName: user?.lastName ?? "—",
      email: user?.email ?? "—",
      avatarUrl: user?.avatarUrl ?? null,
    };
  },
});

/**
 * Calculate a match score for an adviseur given an order.
 * Score breakdown:
 * - Specialization fit: 0-30 points
 * - Distance (postcode proximity): 0-30 points
 * - Availability: 0-25 points
 * - Existing appointments that day (clustering): 0-15 points
 */
export const getMatchScore = query({
  args: {
    adviseurProfileId: v.id("adviseurProfiles"),
    orderPostcode: v.string(),
    orderBuildingType: v.optional(v.string()),
    preferredDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.adviseurProfileId);
    if (!profile) return null;

    let totalScore = 0;
    const breakdown: Record<string, number> = {};

    // 1. Specialization score (0-30)
    // Check if the adviseur's building type experience matches
    let specScore = 15; // Base score for having a profile
    if (args.orderBuildingType && profile.buildingTypeExperience) {
      const isExperienced = profile.buildingTypeExperience.includes(
        args.orderBuildingType as any
      );
      specScore = isExperienced ? 30 : 10;
    }
    // Bonus for specializations
    if (profile.specializations && profile.specializations.length > 0) {
      specScore = Math.min(30, specScore + 5);
    }
    breakdown.specialization = specScore;
    totalScore += specScore;

    // 2. Distance score (0-30) based on postcode prefix match
    let distanceScore = 0;
    const orderPrefix = args.orderPostcode.replace(/\s/g, "").substring(0, 4);
    const homePrefix = profile.homePostcode.replace(/\s/g, "").substring(0, 4);

    if (orderPrefix === homePrefix) {
      distanceScore = 30; // Same postcode area
    } else if (orderPrefix.substring(0, 3) === homePrefix.substring(0, 3)) {
      distanceScore = 22; // Close area
    } else if (orderPrefix.substring(0, 2) === homePrefix.substring(0, 2)) {
      distanceScore = 15; // Same region
    } else if (orderPrefix.substring(0, 1) === homePrefix.substring(0, 1)) {
      distanceScore = 8; // Same province roughly
    } else {
      distanceScore = 3;
    }
    breakdown.distance = distanceScore;
    totalScore += distanceScore;

    // 3. Availability score (0-25)
    let availScore = 0;
    if (profile.isAvailable) {
      availScore = 25;
    } else {
      availScore = 0;
    }
    breakdown.availability = availScore;
    totalScore += availScore;

    // 4. Clustering score (0-15) — check if adviseur already has appointments nearby
    let clusterScore = 0;
    if (args.preferredDate) {
      const dayStart = args.preferredDate;
      const dayEnd = args.preferredDate + "T23:59:59";

      const dayAppointments = await ctx.db
        .query("appointments")
        .withIndex("by_adviseurId_and_startTime", (q) =>
          q
            .eq("adviseurId", profile.userId)
            .gte("startTime", dayStart)
        )
        .take(20);

      const sameDayAppointments = dayAppointments.filter(
        (a) => a.startTime <= dayEnd && a.status !== "GEANNULEERD"
      );

      if (sameDayAppointments.length > 0) {
        // Check if any of those appointments are in the same postcode area
        for (const apt of sameDayAppointments) {
          const aptAddress = await ctx.db.get(apt.addressId);
          if (aptAddress) {
            const aptPrefix = aptAddress.postcode
              .replace(/\s/g, "")
              .substring(0, 4);
            if (aptPrefix === orderPrefix) {
              clusterScore = 15; // Same area = great clustering
              break;
            } else if (aptPrefix.substring(0, 2) === orderPrefix.substring(0, 2)) {
              clusterScore = Math.max(clusterScore, 10);
            }
          }
        }
        // Even if not same area, having appointments = some clustering
        if (clusterScore === 0) {
          clusterScore = 5;
        }
      }
    }
    breakdown.clustering = clusterScore;
    totalScore += clusterScore;

    return {
      adviseurProfileId: args.adviseurProfileId,
      userId: profile.userId,
      totalScore,
      maxScore: 100,
      breakdown,
    };
  },
});

/** Get match scores for ALL adviseurs for a given order */
export const getMatchScoresForOrder = query({
  args: {
    orderPostcode: v.string(),
    orderBuildingType: v.optional(v.string()),
    preferredDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profiles = await ctx.db.query("adviseurProfiles").take(50);

    const scores = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        if (!user || !user.isActive) return null;

        // Inline the scoring logic to avoid calling another query
        let totalScore = 0;
        const breakdown: Record<string, number> = {};

        // Specialization
        let specScore = 15;
        if (args.orderBuildingType && profile.buildingTypeExperience) {
          specScore = profile.buildingTypeExperience.includes(
            args.orderBuildingType as any
          )
            ? 30
            : 10;
        }
        if (profile.specializations?.length > 0) specScore = Math.min(30, specScore + 5);
        breakdown.specialization = specScore;
        totalScore += specScore;

        // Distance
        let distanceScore = 0;
        const orderPrefix = args.orderPostcode.replace(/\s/g, "").substring(0, 4);
        const homePrefix = profile.homePostcode.replace(/\s/g, "").substring(0, 4);
        if (orderPrefix === homePrefix) distanceScore = 30;
        else if (orderPrefix.substring(0, 3) === homePrefix.substring(0, 3)) distanceScore = 22;
        else if (orderPrefix.substring(0, 2) === homePrefix.substring(0, 2)) distanceScore = 15;
        else if (orderPrefix.substring(0, 1) === homePrefix.substring(0, 1)) distanceScore = 8;
        else distanceScore = 3;
        breakdown.distance = distanceScore;
        totalScore += distanceScore;

        // Availability
        const availScore = profile.isAvailable ? 25 : 0;
        breakdown.availability = availScore;
        totalScore += availScore;

        // Clustering
        let clusterScore = 0;
        if (args.preferredDate) {
          const dayStart = args.preferredDate;
          const dayEnd = args.preferredDate + "T23:59:59";
          const dayAppointments = await ctx.db
            .query("appointments")
            .withIndex("by_adviseurId_and_startTime", (q) =>
              q.eq("adviseurId", profile.userId).gte("startTime", dayStart)
            )
            .take(20);
          const sameDayApts = dayAppointments.filter(
            (a) => a.startTime <= dayEnd && a.status !== "GEANNULEERD"
          );
          if (sameDayApts.length > 0) {
            for (const apt of sameDayApts) {
              const aptAddr = await ctx.db.get(apt.addressId);
              if (aptAddr) {
                const aptPre = aptAddr.postcode.replace(/\s/g, "").substring(0, 4);
                if (aptPre === orderPrefix) { clusterScore = 15; break; }
                else if (aptPre.substring(0, 2) === orderPrefix.substring(0, 2))
                  clusterScore = Math.max(clusterScore, 10);
              }
            }
            if (clusterScore === 0) clusterScore = 5;
          }
        }
        breakdown.clustering = clusterScore;
        totalScore += clusterScore;

        return {
          adviseurProfileId: profile._id,
          userId: profile.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl ?? null,
          homePostcode: profile.homePostcode,
          homeCity: profile.homeCity,
          isAvailable: profile.isAvailable,
          specializations: profile.specializations,
          totalScore,
          maxScore: 100,
          breakdown,
        };
      })
    );

    // Filter nulls and sort by score descending
    return scores
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.totalScore - a.totalScore);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/** Create or update an adviseur profile */
export const upsert = mutation({
  args: {
    userId: v.id("users"),
    specializations: v.array(v.string()),
    buildingTypeExperience: v.array(v.string()),
    homePostcode: v.string(),
    homeCity: v.string(),
    maxTravelDistanceKm: v.optional(v.number()),
    travelWillingness: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
    ),
    weeklyCapacityHours: v.number(),
    canDoNieuwbouw: v.boolean(),
    canDoUtiliteit: v.boolean(),
    isAvailable: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["ADMIN", "PLANNER"]);

    const existing = await ctx.db
      .query("adviseurProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const profileData = {
      userId: args.userId,
      specializations: args.specializations as any,
      buildingTypeExperience: args.buildingTypeExperience as any,
      homePostcode: args.homePostcode.replace(/\s/g, "").toUpperCase(),
      homeCity: args.homeCity,
      maxTravelDistanceKm: args.maxTravelDistanceKm,
      travelWillingness: args.travelWillingness,
      weeklyCapacityHours: args.weeklyCapacityHours,
      canDoNieuwbouw: args.canDoNieuwbouw,
      canDoUtiliteit: args.canDoUtiliteit,
      isAvailable: args.isAvailable,
      notes: args.notes,
    };

    if (existing) {
      await ctx.db.patch(existing._id, profileData);
      return existing._id;
    }

    return await ctx.db.insert("adviseurProfiles", profileData);
  },
});

/** Toggle availability of an adviseur */
export const toggleAvailability = mutation({
  args: {
    id: v.id("adviseurProfiles"),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.id, { isAvailable: args.isAvailable });
    return args.id;
  },
});
