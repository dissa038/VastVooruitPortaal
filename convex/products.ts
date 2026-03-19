import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.isActive !== undefined) {
      return await ctx.db
        .query("products")
        .withIndex("by_isActive", (q) => q.eq("isActive", args.isActive!))
        .take(50);
    }
    return await ctx.db.query("products").take(50);
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    description: v.optional(v.string()),
    basePriceExVat: v.number(),
    vatPercentage: v.number(),
    sortOrder: v.number(),
    requiresOnSiteVisit: v.boolean(),
    estimatedDurationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", {
      name: args.name,
      type: args.type as never,
      description: args.description,
      basePriceExVat: args.basePriceExVat,
      vatPercentage: args.vatPercentage,
      isActive: true,
      sortOrder: args.sortOrder,
      requiresOnSiteVisit: args.requiresOnSiteVisit,
      estimatedDurationMinutes: args.estimatedDurationMinutes,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    basePriceExVat: v.optional(v.number()),
    vatPercentage: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    await ctx.db.patch(id, cleanUpdates);
  },
});

/**
 * Resolve price for a product based on building type, client type, volume.
 * Most specific match wins: company-specific > client-type > building-type > base.
 */
export const resolvePrice = query({
  args: {
    productId: v.id("products"),
    buildingType: v.optional(v.string()),
    clientType: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    // Get all pricing rules for this product
    const rules = await ctx.db
      .query("pricingRules")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(100);

    const activeRules = rules.filter((r) => r.isActive && !r.isSurcharge);

    // Score each rule by specificity
    let bestRule = null;
    let bestScore = -1;

    for (const rule of activeRules) {
      let score = 0;

      // Company-specific is most specific (score +100)
      if (rule.companyId && rule.companyId === args.companyId) score += 100;
      else if (rule.companyId) continue; // Company mismatch = skip

      // Client type match (+10)
      if (rule.clientType && rule.clientType === args.clientType) score += 10;
      else if (rule.clientType) continue;

      // Building type match (+5)
      if (rule.buildingType && rule.buildingType === args.buildingType) score += 5;
      else if (rule.buildingType) continue;

      // Volume match (+3)
      if (rule.minQuantity && args.quantity) {
        if (args.quantity >= rule.minQuantity) {
          if (!rule.maxQuantity || args.quantity <= rule.maxQuantity) {
            score += 3;
          } else continue;
        } else continue;
      }

      if (score > bestScore) {
        bestScore = score;
        bestRule = rule;
      }
    }

    const priceExVat = bestRule ? bestRule.priceExVat : product.basePriceExVat;

    // Get applicable surcharges
    const surcharges = rules.filter((r) => r.isActive && r.isSurcharge);

    return {
      priceExVat,
      vatPercentage: product.vatPercentage,
      priceInclVat: priceExVat + Math.round(priceExVat * (product.vatPercentage / 100)),
      appliedRule: bestRule?._id,
      availableSurcharges: surcharges.map((s) => ({
        id: s._id,
        type: s.surchargeType,
        description: s.surchargeDescription,
        amount: s.priceExVat,
      })),
    };
  },
});
