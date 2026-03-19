import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const intermediaryTypeValidator = v.union(
  v.literal("MAKELAAR"),
  v.literal("BANK"),
  v.literal("VASTGOEDBEHEERDER"),
  v.literal("BOUWBEDRIJF"),
  v.literal("HOMEVISUALS"),
  v.literal("TIMAX"),
  v.literal("OVERIG"),
);

export const list = query({
  args: {
    type: v.optional(intermediaryTypeValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.search && args.search.trim().length > 0) {
      const results = await ctx.db
        .query("intermediaries")
        .withSearchIndex("search_intermediaries", (q) => {
          let sq = q.search("name", args.search!);
          if (args.type) {
            sq = sq.eq("type", args.type);
          }
          return sq;
        })
        .take(100);
      return results;
    }

    let dbQuery;
    if (args.type) {
      dbQuery = ctx.db
        .query("intermediaries")
        .withIndex("by_type", (q) => q.eq("type", args.type!));
    } else {
      dbQuery = ctx.db.query("intermediaries");
    }

    return await dbQuery.take(200);
  },
});

export const getById = query({
  args: { id: v.id("intermediaries") },
  handler: async (ctx, args) => {
    const intermediary = await ctx.db.get(args.id);
    if (!intermediary) return null;

    const company = intermediary.companyId
      ? await ctx.db.get(intermediary.companyId)
      : null;
    const contact = intermediary.contactId
      ? await ctx.db.get(intermediary.contactId)
      : null;

    // Count referred orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_intermediaryId", (q) =>
        q.eq("intermediaryId", args.id)
      )
      .take(500);

    return {
      ...intermediary,
      company,
      contact,
      referredOrderCount: orders.length,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: intermediaryTypeValidator,
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    ccEmailOnDelivery: v.optional(v.string()),
    preferredChecklistType: v.optional(v.string()),
    invoiceViaIntermediary: v.boolean(),
    invoiceEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.insert("intermediaries", {
      ...args,
      totalOrdersReferred: 0,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("intermediaries"),
    name: v.optional(v.string()),
    type: v.optional(intermediaryTypeValidator),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    ccEmailOnDelivery: v.optional(v.string()),
    invoiceViaIntermediary: v.optional(v.boolean()),
    invoiceEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return id;
  },
});
