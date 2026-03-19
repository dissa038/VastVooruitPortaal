import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("NIEUW"),
        v.literal("OFFERTE_VERSTUURD"),
        v.literal("GEACCEPTEERD"),
        v.literal("INGEPLAND"),
        v.literal("OPNAME_GEDAAN"),
        v.literal("IN_UITWERKING"),
        v.literal("CONCEPT_GEREED"),
        v.literal("CONTROLE"),
        v.literal("GEREGISTREERD"),
        v.literal("VERZONDEN"),
        v.literal("AFGEROND"),
        v.literal("ON_HOLD"),
        v.literal("GEANNULEERD"),
        v.literal("NO_SHOW"),
      ),
    ),
    assignedAdviseurId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    // Use the composite index for the most common filter combination
    if (args.status && args.assignedAdviseurId) {
      return await ctx.db
        .query("orders")
        .withIndex("by_status_and_assignedAdviseurId", (q) =>
          q.eq("status", args.status!).eq("assignedAdviseurId", args.assignedAdviseurId!)
        )
        .take(50);
    }

    if (args.status) {
      const results = await ctx.db
        .query("orders")
        .withIndex("by_isArchived_and_status", (q) =>
          q.eq("isArchived", false).eq("status", args.status!)
        )
        .take(50);
      return results;
    }

    if (args.assignedAdviseurId) {
      const results = await ctx.db
        .query("orders")
        .withIndex("by_assignedAdviseurId", (q) =>
          q.eq("assignedAdviseurId", args.assignedAdviseurId!)
        )
        .take(50);
      return results.filter((o) => !o.isArchived);
    }

    if (args.projectId) {
      const results = await ctx.db
        .query("orders")
        .withIndex("by_projectId", (q) =>
          q.eq("projectId", args.projectId!)
        )
        .take(50);
      return results.filter((o) => !o.isArchived);
    }

    if (args.companyId) {
      const results = await ctx.db
        .query("orders")
        .withIndex("by_companyId", (q) =>
          q.eq("companyId", args.companyId!)
        )
        .take(50);
      return results.filter((o) => !o.isArchived);
    }

    // Default: all non-archived orders
    const results = await ctx.db
      .query("orders")
      .withIndex("by_isArchived_and_status", (q) =>
        q.eq("isArchived", false)
      )
      .take(50);
    return results;
  },
});

export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    const address = await ctx.db.get(order.addressId);

    return { ...order, address };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const statuses = [
      "NIEUW",
      "OFFERTE_VERSTUURD",
      "GEACCEPTEERD",
      "INGEPLAND",
      "OPNAME_GEDAAN",
      "IN_UITWERKING",
      "CONCEPT_GEREED",
      "CONTROLE",
      "GEREGISTREERD",
      "VERZONDEN",
      "AFGEROND",
      "ON_HOLD",
      "GEANNULEERD",
      "NO_SHOW",
    ] as const;

    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const items = await ctx.db
        .query("orders")
        .withIndex("by_isArchived_and_status", (q) =>
          q.eq("isArchived", false).eq("status", status)
        )
        .take(1000);
      counts[status] = items.length;
    }

    return counts;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    addressId: v.id("addresses"),
    projectId: v.optional(v.id("projects")),
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    bewonerId: v.optional(v.id("contacts")),
    intermediaryId: v.optional(v.id("intermediaries")),
    assignedAdviseurId: v.optional(v.id("users")),
    buildingType: v.optional(v.string()),
    deelgebied: v.optional(v.string()),
    isNieuwbouw: v.optional(v.boolean()),
    requestedDate: v.optional(v.string()),
    totalPriceExVat: v.optional(v.number()),
    totalPriceInclVat: v.optional(v.number()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Generate reference code: VV-YYYY-NNNNN
    const year = new Date().getFullYear();
    const prefix = `VV-${year}-`;

    // Find the highest existing code for this year
    const existingOrders = await ctx.db
      .query("orders")
      .withIndex("by_referenceCode")
      .take(100);

    let maxNumber = 0;
    for (const order of existingOrders) {
      if (order.referenceCode.startsWith(prefix)) {
        const numPart = parseInt(order.referenceCode.slice(prefix.length), 10);
        if (numPart > maxNumber) maxNumber = numPart;
      }
    }
    const nextNumber = maxNumber + 1;
    const referenceCode = `${prefix}${String(nextNumber).padStart(5, "0")}`;

    const orderId = await ctx.db.insert("orders", {
      referenceCode,
      addressId: args.addressId,
      projectId: args.projectId,
      companyId: args.companyId,
      contactId: args.contactId,
      bewonerId: args.bewonerId,
      intermediaryId: args.intermediaryId,
      assignedAdviseurId: args.assignedAdviseurId,
      status: "NIEUW",
      buildingType: args.buildingType as any,
      deelgebied: args.deelgebied as any,
      isNieuwbouw: args.isNieuwbouw ?? false,
      requestedDate: args.requestedDate,
      totalPriceExVat: args.totalPriceExVat,
      totalPriceInclVat: args.totalPriceInclVat,
      source: args.source as any,
      notes: args.notes,
      isNoShow: false,
      costsConfirmedByAdviseur: false,
      isArchived: false,
    });

    // Create linked dossier
    await ctx.db.insert("dossiers", {
      orderId,
      projectId: args.projectId,
      completenessPercentage: 0,
      isComplete: false,
      requiredDocumentTypes: [],
      isAuditable: false,
      isArchivedForRetention: false,
    });

    // Create initial status history entry
    await ctx.db.insert("statusHistory", {
      orderId,
      newStatus: "NIEUW",
      changedByUserId: user._id,
      changedAt: new Date().toISOString(),
      reason: "Opdracht aangemaakt",
    });

    return orderId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    newStatus: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("Opdracht niet gevonden.");

    // Valid status transitions
    const validTransitions: Record<string, string[]> = {
      NIEUW: ["OFFERTE_VERSTUURD", "GEACCEPTEERD", "INGEPLAND", "GEANNULEERD"],
      OFFERTE_VERSTUURD: ["GEACCEPTEERD", "GEANNULEERD"],
      GEACCEPTEERD: ["INGEPLAND", "ON_HOLD", "GEANNULEERD"],
      INGEPLAND: ["OPNAME_GEDAAN", "NO_SHOW", "GEANNULEERD", "VERZET"],
      OPNAME_GEDAAN: ["IN_UITWERKING", "ON_HOLD"],
      IN_UITWERKING: ["CONCEPT_GEREED", "ON_HOLD"],
      CONCEPT_GEREED: ["CONTROLE", "IN_UITWERKING"],
      CONTROLE: ["GEREGISTREERD", "IN_UITWERKING"],
      GEREGISTREERD: ["VERZONDEN"],
      VERZONDEN: ["AFGEROND"],
      ON_HOLD: ["NIEUW", "GEACCEPTEERD", "INGEPLAND", "OPNAME_GEDAAN", "IN_UITWERKING", "GEANNULEERD"],
      NO_SHOW: ["INGEPLAND", "GEANNULEERD"],
      GEANNULEERD: [],
      AFGEROND: [],
    };

    const allowed = validTransitions[order.status];
    if (allowed && !allowed.includes(args.newStatus)) {
      throw new Error(
        `Status overgang van "${order.status}" naar "${args.newStatus}" is niet toegestaan.`
      );
    }

    const previousStatus = order.status;

    // Update order
    const updateFields: Record<string, any> = { status: args.newStatus };
    if (args.newStatus === "AFGEROND") {
      updateFields.completedAt = new Date().toISOString();
    }
    if (args.newStatus === "NO_SHOW") {
      updateFields.isNoShow = true;
      updateFields.noShowCount = (order.noShowCount ?? 0) + 1;
    }

    await ctx.db.patch(args.id, updateFields);

    // Create status history entry
    await ctx.db.insert("statusHistory", {
      orderId: args.id,
      previousStatus,
      newStatus: args.newStatus,
      changedByUserId: user._id,
      changedAt: new Date().toISOString(),
      reason: args.reason,
    });

    return args.id;
  },
});

export const update = mutation({
  args: {
    id: v.id("orders"),
    assignedAdviseurId: v.optional(v.id("users")),
    contactId: v.optional(v.id("contacts")),
    bewonerId: v.optional(v.id("contacts")),
    intermediaryId: v.optional(v.id("intermediaries")),
    buildingType: v.optional(v.string()),
    deelgebied: v.optional(v.string()),
    requestedDate: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    totalPriceExVat: v.optional(v.number()),
    totalPriceInclVat: v.optional(v.number()),
    notes: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...fields } = args;

    const order = await ctx.db.get(id);
    if (!order) throw new Error("Opdracht niet gevonden.");

    // Only patch defined fields
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
