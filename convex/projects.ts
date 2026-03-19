import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

export const list = query({
  args: {
    type: v.optional(v.string()),
    status: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    if (args.companyId) {
      const results = await ctx.db
        .query("projects")
        .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId!))
        .take(50);
      return results.filter((p) => !p.isArchived);
    }

    if (args.type) {
      const results = await ctx.db
        .query("projects")
        .withIndex("by_type", (q) => q.eq("type", args.type as any))
        .take(50);
      return results.filter((p) => !p.isArchived);
    }

    if (args.status) {
      const results = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .take(50);
      return results.filter((p) => !p.isArchived);
    }

    // Default: recent non-archived projects
    const results = await ctx.db
      .query("projects")
      .order("desc")
      .take(50);
    return results.filter((p) => !p.isArchived);
  },
});

export const getById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;

    // Include order count
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.id))
      .take(1000);
    const orderCount = orders.filter((o) => !o.isArchived).length;

    return { ...project, orderCount };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    name: v.string(),
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    intermediaryId: v.optional(v.id("intermediaries")),
    type: v.union(
      v.literal("CORPORATIE"),
      v.literal("BELEGGER"),
      v.literal("NIEUWBOUW"),
      v.literal("PARTICULIER"),
      v.literal("MAKELAAR"),
      v.literal("OVERIG"),
    ),
    description: v.optional(v.string()),
    estimatedOrderCount: v.optional(v.number()),
    contractPriceExVat: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    deadline: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Generate reference code: TYPE-YY-NNN
    const typePrefix = args.type.substring(0, 3).toUpperCase();
    const yearSuffix = String(new Date().getFullYear()).slice(-2);
    const codePrefix = `${typePrefix}-${yearSuffix}-`;

    // Find highest existing code for this prefix
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_referenceCode")
      .take(500);

    let maxNumber = 0;
    for (const project of existingProjects) {
      if (project.referenceCode && project.referenceCode.startsWith(codePrefix)) {
        const numPart = parseInt(project.referenceCode.slice(codePrefix.length), 10);
        if (numPart > maxNumber) maxNumber = numPart;
      }
    }
    const referenceCode = `${codePrefix}${String(maxNumber + 1).padStart(3, "0")}`;

    return await ctx.db.insert("projects", {
      name: args.name,
      referenceCode,
      companyId: args.companyId,
      contactId: args.contactId,
      intermediaryId: args.intermediaryId,
      type: args.type,
      status: "CONCEPT",
      description: args.description,
      estimatedOrderCount: args.estimatedOrderCount,
      contractPriceExVat: args.contractPriceExVat,
      startDate: args.startDate,
      endDate: args.endDate,
      deadline: args.deadline,
      totalOrders: 0,
      completedOrders: 0,
      notes: args.notes,
      isArchived: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    intermediaryId: v.optional(v.id("intermediaries")),
    description: v.optional(v.string()),
    estimatedOrderCount: v.optional(v.number()),
    contractPriceExVat: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    deadline: v.optional(v.string()),
    notes: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const { id, ...fields } = args;
    const project = await ctx.db.get(id);
    if (!project) throw new Error("Project niet gevonden.");

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

export const updateStatus = mutation({
  args: {
    id: v.id("projects"),
    status: v.union(
      v.literal("CONCEPT"),
      v.literal("OFFERTE"),
      v.literal("ACTIEF"),
      v.literal("AFGEROND"),
      v.literal("GEANNULEERD"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project niet gevonden.");

    await ctx.db.patch(args.id, { status: args.status });
    return args.id;
  },
});
