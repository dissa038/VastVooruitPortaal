import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

export const getById = query({
  args: { id: v.id("addresses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const search = query({
  args: {
    postcode: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize postcode: remove spaces, uppercase
    const normalized = args.postcode.replace(/\s/g, "").toUpperCase();

    const results = await ctx.db
      .query("addresses")
      .withIndex("by_postcode", (q) => q.eq("postcode", normalized))
      .take(100);

    return results;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    street: v.string(),
    houseNumber: v.string(),
    houseNumberAddition: v.optional(v.string()),
    postcode: v.string(),
    city: v.string(),
    province: v.optional(v.string()),
    country: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isNieuwbouw: v.optional(v.boolean()),
    buildingType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Normalize postcode
    const postcode = args.postcode.replace(/\s/g, "").toUpperCase();

    return await ctx.db.insert("addresses", {
      street: args.street,
      houseNumber: args.houseNumber,
      houseNumberAddition: args.houseNumberAddition,
      postcode,
      city: args.city,
      province: args.province,
      country: args.country ?? "NL",
      latitude: args.latitude,
      longitude: args.longitude,
      isNieuwbouw: args.isNieuwbouw,
      buildingType: args.buildingType as any,
    });
  },
});

export const createFromBag = mutation({
  args: {
    street: v.string(),
    houseNumber: v.string(),
    houseNumberAddition: v.optional(v.string()),
    postcode: v.string(),
    city: v.string(),
    province: v.optional(v.string()),
    bagVerblijfsobjectId: v.optional(v.string()),
    bagPandId: v.optional(v.string()),
    bagOppervlakte: v.optional(v.number()),
    bagBouwjaar: v.optional(v.number()),
    bagGebruiksdoel: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isNieuwbouw: v.optional(v.boolean()),
    buildingType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const postcode = args.postcode.replace(/\s/g, "").toUpperCase();

    // Check if address with same BAG verblijfsobject ID already exists
    if (args.bagVerblijfsobjectId) {
      const existing = await ctx.db
        .query("addresses")
        .withIndex("by_bagVerblijfsobjectId", (q) =>
          q.eq("bagVerblijfsobjectId", args.bagVerblijfsobjectId!)
        )
        .first();

      if (existing) {
        // Update existing address with latest BAG data
        await ctx.db.patch(existing._id, {
          street: args.street,
          houseNumber: args.houseNumber,
          houseNumberAddition: args.houseNumberAddition,
          postcode,
          city: args.city,
          province: args.province,
          bagPandId: args.bagPandId,
          bagOppervlakte: args.bagOppervlakte,
          bagBouwjaar: args.bagBouwjaar,
          bagGebruiksdoel: args.bagGebruiksdoel,
          latitude: args.latitude,
          longitude: args.longitude,
          isNieuwbouw: args.isNieuwbouw,
          buildingType: args.buildingType as any,
        });
        return existing._id;
      }
    }

    return await ctx.db.insert("addresses", {
      street: args.street,
      houseNumber: args.houseNumber,
      houseNumberAddition: args.houseNumberAddition,
      postcode,
      city: args.city,
      province: args.province,
      country: "NL",
      bagVerblijfsobjectId: args.bagVerblijfsobjectId,
      bagPandId: args.bagPandId,
      bagOppervlakte: args.bagOppervlakte,
      bagBouwjaar: args.bagBouwjaar,
      bagGebruiksdoel: args.bagGebruiksdoel,
      latitude: args.latitude,
      longitude: args.longitude,
      isNieuwbouw: args.isNieuwbouw,
      buildingType: args.buildingType as any,
    });
  },
});
