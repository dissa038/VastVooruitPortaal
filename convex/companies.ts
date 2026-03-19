import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

export const list = query({
  args: {
    type: v.optional(v.string()),
    searchName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Helper to enrich companies with contact count
    async function enrichWithContactCount(companies: any[]) {
      return Promise.all(
        companies.map(async (company) => {
          const contacts = await ctx.db
            .query("contacts")
            .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
            .take(50);
          return { ...company, contactCount: contacts.filter((c: any) => !c.isArchived).length };
        })
      );
    }

    // Full-text search by name
    if (args.searchName) {
      const searchQuery = ctx.db
        .query("companies")
        .withSearchIndex("search_companies", (q) => {
          let sq = q.search("name", args.searchName!);
          if (args.type) sq = sq.eq("type", args.type as any);
          sq = sq.eq("isArchived", false);
          return sq;
        });
      const results = await searchQuery.take(50);
      return enrichWithContactCount(results);
    }

    // Filter by type
    if (args.type) {
      const results = await ctx.db
        .query("companies")
        .withIndex("by_type", (q) => q.eq("type", args.type as any))
        .take(50);
      return enrichWithContactCount(results.filter((c) => !c.isArchived));
    }

    // Default: recent non-archived companies
    const results = await ctx.db
      .query("companies")
      .order("desc")
      .take(50);
    return enrichWithContactCount(results.filter((c) => !c.isArchived));
  },
});

export const getById = query({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.id);
    if (!company) return null;

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.id))
      .take(100);
    const activeContacts = contacts.filter((c) => !c.isArchived);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.id))
      .take(100);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.id))
      .take(100);

    const accountManager = company.accountManagerId
      ? await ctx.db.get(company.accountManagerId)
      : null;

    return {
      ...company,
      contacts: activeContacts,
      projects,
      invoices,
      accountManager,
      contactCount: activeContacts.length,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("CORPORATIE"),
      v.literal("BELEGGER"),
      v.literal("MAKELAARSKANTOOR"),
      v.literal("AANNEMER"),
      v.literal("BOUWBEDRIJF"),
      v.literal("BANK"),
      v.literal("MONUMENTENSTICHTING"),
      v.literal("VASTGOEDBEHEERDER"),
      v.literal("PARTNER"),
      v.literal("OVERIG"),
    ),
    kvkNumber: v.optional(v.string()),
    vatNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    postcode: v.optional(v.string()),
    city: v.optional(v.string()),
    invoiceEmail: v.optional(v.string()),
    invoiceAddress: v.optional(v.string()),
    invoicePostcode: v.optional(v.string()),
    invoiceCity: v.optional(v.string()),
    paymentTermDays: v.optional(v.number()),
    leadSource: v.optional(v.string()),
    accountManagerId: v.optional(v.id("users")),
    hasContract: v.optional(v.boolean()),
    contractStartDate: v.optional(v.string()),
    contractEndDate: v.optional(v.string()),
    contractNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db.insert("companies", {
      ...args,
      hasContract: args.hasContract ?? false,
      isArchived: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("CORPORATIE"),
        v.literal("BELEGGER"),
        v.literal("MAKELAARSKANTOOR"),
        v.literal("AANNEMER"),
        v.literal("BOUWBEDRIJF"),
        v.literal("BANK"),
        v.literal("MONUMENTENSTICHTING"),
        v.literal("VASTGOEDBEHEERDER"),
        v.literal("PARTNER"),
        v.literal("OVERIG"),
      ),
    ),
    kvkNumber: v.optional(v.string()),
    vatNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    postcode: v.optional(v.string()),
    city: v.optional(v.string()),
    invoiceEmail: v.optional(v.string()),
    invoiceAddress: v.optional(v.string()),
    invoicePostcode: v.optional(v.string()),
    invoiceCity: v.optional(v.string()),
    paymentTermDays: v.optional(v.number()),
    leadSource: v.optional(v.string()),
    accountManagerId: v.optional(v.id("users")),
    hasContract: v.optional(v.boolean()),
    contractStartDate: v.optional(v.string()),
    contractEndDate: v.optional(v.string()),
    contractNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const { id, ...fields } = args;
    const company = await ctx.db.get(id);
    if (!company) throw new Error("Bedrijf niet gevonden.");

    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(id, updates);
    }

    return id;
  },
});

export const archive = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const company = await ctx.db.get(args.id);
    if (!company) throw new Error("Bedrijf niet gevonden.");

    await ctx.db.patch(args.id, { isArchived: true });
    return args.id;
  },
});
