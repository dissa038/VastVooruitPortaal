import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

export const list = query({
  args: {
    companyId: v.optional(v.id("companies")),
    role: v.optional(v.string()),
    searchLastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Helper to enrich contacts with company name
    async function enrichWithCompany(contacts: any[]) {
      return Promise.all(
        contacts.map(async (contact) => {
          if (!contact.companyId) return { ...contact, companyName: null };
          const company = await ctx.db.get(contact.companyId);
          const companyName = company && "name" in company ? (company as any).name : null;
          return { ...contact, companyName };
        })
      );
    }

    // Full-text search by lastName
    if (args.searchLastName) {
      let searchQuery = ctx.db
        .query("contacts")
        .withSearchIndex("search_contacts", (q) => {
          let sq = q.search("lastName", args.searchLastName!);
          if (args.companyId) sq = sq.eq("companyId", args.companyId);
          if (args.role) sq = sq.eq("role", args.role as any);
          return sq;
        });
      const results = await searchQuery.take(50);
      return enrichWithCompany(results.filter((c) => !c.isArchived));
    }

    // Filter by companyId
    if (args.companyId) {
      const results = await ctx.db
        .query("contacts")
        .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId!))
        .take(50);
      return enrichWithCompany(results.filter((c) => !c.isArchived));
    }

    // Filter by role
    if (args.role) {
      const results = await ctx.db
        .query("contacts")
        .withIndex("by_role", (q) => q.eq("role", args.role as any))
        .take(50);
      return enrichWithCompany(results.filter((c) => !c.isArchived));
    }

    // Default: recent non-archived contacts
    const results = await ctx.db
      .query("contacts")
      .order("desc")
      .take(50);
    return enrichWithCompany(results.filter((c) => !c.isArchived));
  },
});

export const getById = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) return null;

    const company = contact.companyId
      ? await ctx.db.get(contact.companyId)
      : null;

    // Get linked orders (as contact or bewoner)
    const allOrders = await ctx.db.query("orders").take(500);
    const contactOrders = allOrders.filter(
      (o) => o.contactId === args.id || o.bewonerId === args.id
    );

    return { ...contact, company, orders: contactOrders };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    postcode: v.optional(v.string()),
    city: v.optional(v.string()),
    role: v.union(
      v.literal("EIGENAAR"),
      v.literal("HUURDER"),
      v.literal("OPDRACHTGEVER"),
      v.literal("BEWONER"),
      v.literal("CONTACTPERSOON"),
      v.literal("MAKELAAR"),
      v.literal("AANNEMER_CONTACT"),
      v.literal("OVERIG"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db.insert("contacts", {
      ...args,
      isArchived: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    companyId: v.optional(v.id("companies")),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    postcode: v.optional(v.string()),
    city: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("EIGENAAR"),
        v.literal("HUURDER"),
        v.literal("OPDRACHTGEVER"),
        v.literal("BEWONER"),
        v.literal("CONTACTPERSOON"),
        v.literal("MAKELAAR"),
        v.literal("AANNEMER_CONTACT"),
        v.literal("OVERIG"),
      ),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const { id, ...fields } = args;
    const contact = await ctx.db.get(id);
    if (!contact) throw new Error("Contact niet gevonden.");

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
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const contact = await ctx.db.get(args.id);
    if (!contact) throw new Error("Contact niet gevonden.");

    await ctx.db.patch(args.id, { isArchived: true });
    return args.id;
  },
});
