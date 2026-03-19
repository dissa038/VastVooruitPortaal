import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    orderId: v.optional(v.id("orders")),
    isApproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.orderId) {
      return await ctx.db
        .query("costMutations")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId!))
        .take(100);
    }
    if (args.isApproved !== undefined) {
      return await ctx.db
        .query("costMutations")
        .withIndex("by_isApproved", (q) =>
          q.eq("isApproved", args.isApproved!)
        )
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("costMutations").order("desc").take(50);
  },
});

export const create = mutation({
  args: {
    orderId: v.id("orders"),
    createdByUserId: v.id("users"),
    type: v.string(),
    description: v.string(),
    amountExVat: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("costMutations", {
      orderId: args.orderId,
      createdByUserId: args.createdByUserId,
      type: args.type as never,
      description: args.description,
      amountExVat: args.amountExVat,
      isApproved: false,
      notes: args.notes,
    });
  },
});

export const approve = mutation({
  args: {
    id: v.id("costMutations"),
    approvedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isApproved: true,
      approvedByUserId: args.approvedByUserId,
      approvedAt: new Date().toISOString(),
    });
  },
});
