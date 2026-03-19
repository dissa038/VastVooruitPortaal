import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

export const listByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("documents")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(100);
    return results.filter((d) => !d.isArchived);
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const listByDossier = query({
  args: { dossierId: v.id("dossiers") },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("documents")
      .withIndex("by_dossierId", (q) => q.eq("dossierId", args.dossierId))
      .take(100);
    return results.filter((d) => !d.isArchived);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    storageId: v.id("_storage"),
    dossierId: v.optional(v.id("dossiers")),
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    nieuwbouwProjectId: v.optional(v.id("nieuwbouwProjects")),
    fileName: v.string(),
    fileType: v.string(),
    fileSizeBytes: v.number(),
    category: v.union(
      v.literal("FOTO_BUITEN"),
      v.literal("FOTO_BINNEN"),
      v.literal("OPNAMEFORMULIER"),
      v.literal("ENERGIELABEL_PDF"),
      v.literal("VERDUURZAMINGSADVIES_PDF"),
      v.literal("NEN2580_RAPPORT"),
      v.literal("WWS_RAPPORT"),
      v.literal("BENG_BEREKENING"),
      v.literal("BLOWERDOORTEST_RAPPORT"),
      v.literal("BOUWTEKENING"),
      v.literal("RC_BEREKENING"),
      v.literal("ISOLATIE_CERTIFICAAT"),
      v.literal("VERKLARING"),
      v.literal("PLATTEGROND"),
      v.literal("OFFERTE_PDF"),
      v.literal("FACTUUR_PDF"),
      v.literal("CONTRACT"),
      v.literal("CORRESPONDENTIE"),
      v.literal("OVERIG"),
    ),
    nieuwbouwElement: v.optional(
      v.union(
        v.literal("VLOER"),
        v.literal("GEVEL"),
        v.literal("DAK"),
        v.literal("KOZIJN"),
        v.literal("INSTALLATIE"),
        v.literal("ALGEMEEN"),
      ),
    ),
    nieuwbouwDocType: v.optional(
      v.union(
        v.literal("TEKENING"),
        v.literal("FOTO"),
        v.literal("CERTIFICAAT"),
        v.literal("RC_BEREKENING"),
        v.literal("VERKLARING"),
        v.literal("OVERIG"),
      ),
    ),
    isProjectLevel: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    return await ctx.db.insert("documents", {
      storageId: args.storageId,
      dossierId: args.dossierId,
      orderId: args.orderId,
      projectId: args.projectId,
      nieuwbouwProjectId: args.nieuwbouwProjectId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSizeBytes: args.fileSizeBytes,
      category: args.category,
      nieuwbouwElement: args.nieuwbouwElement,
      nieuwbouwDocType: args.nieuwbouwDocType,
      isProjectLevel: args.isProjectLevel ?? false,
      uploadedByUserId: user._id,
      uploadedAt: new Date().toISOString(),
      notes: args.notes,
      isArchived: false,
    });
  },
});

export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document niet gevonden.");

    await ctx.db.patch(args.id, { isArchived: true });
    return args.id;
  },
});
