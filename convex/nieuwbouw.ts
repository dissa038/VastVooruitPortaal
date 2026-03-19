import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ============================================================================
// ELEMENT / STATUS VALIDATORS
// ============================================================================

const elementValidator = v.union(
  v.literal("VLOER"),
  v.literal("GEVEL"),
  v.literal("DAK"),
  v.literal("KOZIJN"),
  v.literal("INSTALLATIE"),
  v.literal("ALGEMEEN"),
);

const requirementStatusValidator = v.union(
  v.literal("NIET_AANGELEVERD"),
  v.literal("AANGELEVERD"),
  v.literal("GOEDGEKEURD"),
  v.literal("AFGEKEURD"),
);

const documentTypeValidator = v.union(
  v.literal("TEKENING"),
  v.literal("GEDETAILLEERDE_TEKENING"),
  v.literal("FOTO"),
  v.literal("CERTIFICAAT"),
  v.literal("RC_BEREKENING"),
  v.literal("VERKLARING"),
  v.literal("OVERIG"),
);

// ============================================================================
// QUERIES
// ============================================================================

/** List all nieuwbouw projects enriched with project + aannemer info */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const nieuwbouwProjects = await ctx.db
      .query("nieuwbouwProjects")
      .take(100);

    const enriched = await Promise.all(
      nieuwbouwProjects.map(async (nb) => {
        const project = await ctx.db.get(nb.projectId);
        const aannemer = nb.aannemerId
          ? await ctx.db.get(nb.aannemerId)
          : null;

        return {
          ...nb,
          projectName: project?.name ?? "—",
          projectStatus: project?.status ?? "CONCEPT",
          aannemerName: aannemer?.name ?? "—",
        };
      })
    );

    return enriched;
  },
});

/** Get a nieuwbouw project by ID with all requirements and their documents */
export const getById = query({
  args: { id: v.id("nieuwbouwProjects") },
  handler: async (ctx, args) => {
    const nb = await ctx.db.get(args.id);
    if (!nb) return null;

    const project = await ctx.db.get(nb.projectId);
    const aannemer = nb.aannemerId
      ? await ctx.db.get(nb.aannemerId)
      : null;
    const aannemerContact = nb.aannemerContactId
      ? await ctx.db.get(nb.aannemerContactId)
      : null;

    // Get all requirements for this project
    const requirements = await ctx.db
      .query("nieuwbouwDocumentRequirements")
      .withIndex("by_nieuwbouwProjectId", (q) =>
        q.eq("nieuwbouwProjectId", args.id)
      )
      .take(200);

    // Enrich requirements with document URLs
    const enrichedRequirements = await Promise.all(
      requirements.map(async (req) => {
        let documentUrl: string | null = null;
        let documentName: string | null = null;
        if (req.documentId) {
          const doc = await ctx.db.get(req.documentId);
          if (doc) {
            documentUrl = await ctx.storage.getUrl(doc.storageId);
            documentName = doc.fileName;
          }
        }
        return {
          ...req,
          documentUrl,
          documentName,
        };
      })
    );

    // Sort by element then sortOrder
    enrichedRequirements.sort((a, b) => {
      if (a.element !== b.element) return a.element.localeCompare(b.element);
      return a.sortOrder - b.sortOrder;
    });

    return {
      ...nb,
      project,
      aannemer,
      aannemerContact,
      requirements: enrichedRequirements,
    };
  },
});

/** Public query: get by access token (no auth required) */
export const getByAccessToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const nb = await ctx.db
      .query("nieuwbouwProjects")
      .withIndex("by_accessToken", (q) => q.eq("accessToken", args.token))
      .first();

    if (!nb) return null;

    // Check expiry
    if (nb.accessTokenExpiresAt && new Date(nb.accessTokenExpiresAt) < new Date()) {
      return null;
    }

    const project = await ctx.db.get(nb.projectId);

    // Get all requirements
    const requirements = await ctx.db
      .query("nieuwbouwDocumentRequirements")
      .withIndex("by_nieuwbouwProjectId", (q) =>
        q.eq("nieuwbouwProjectId", nb._id)
      )
      .take(200);

    // Enrich with document URLs
    const enrichedRequirements = await Promise.all(
      requirements.map(async (req) => {
        let documentUrl: string | null = null;
        let documentName: string | null = null;
        if (req.documentId) {
          const doc = await ctx.db.get(req.documentId);
          if (doc) {
            documentUrl = await ctx.storage.getUrl(doc.storageId);
            documentName = doc.fileName;
          }
        }
        return {
          _id: req._id,
          element: req.element,
          documentType: req.documentType,
          description: req.description,
          isRequired: req.isRequired,
          status: req.status,
          rejectionReason: req.rejectionReason,
          documentUrl,
          documentName,
          sortOrder: req.sortOrder,
        };
      })
    );

    enrichedRequirements.sort((a, b) => {
      if (a.element !== b.element) return a.element.localeCompare(b.element);
      return a.sortOrder - b.sortOrder;
    });

    return {
      _id: nb._id,
      projectName: project?.name ?? "—",
      woningType: nb.woningType,
      aantalWoningen: nb.aantalWoningen,
      completenessPercentage: nb.completenessPercentage ?? 0,
      requirements: enrichedRequirements,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/** Create a document requirement for a nieuwbouw project */
export const createRequirement = mutation({
  args: {
    nieuwbouwProjectId: v.id("nieuwbouwProjects"),
    element: elementValidator,
    documentType: documentTypeValidator,
    description: v.string(),
    isRequired: v.boolean(),
    isProjectLevel: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db.insert("nieuwbouwDocumentRequirements", {
      nieuwbouwProjectId: args.nieuwbouwProjectId,
      element: args.element,
      documentType: args.documentType,
      description: args.description,
      isRequired: args.isRequired,
      isProjectLevel: args.isProjectLevel,
      status: "NIET_AANGELEVERD",
      sortOrder: args.sortOrder,
    });
  },
});

/** Update requirement status (goedkeuren/afkeuren) */
export const updateRequirementStatus = mutation({
  args: {
    id: v.id("nieuwbouwDocumentRequirements"),
    status: requirementStatusValidator,
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const req = await ctx.db.get(args.id);
    if (!req) throw new Error("Requirement niet gevonden.");

    await ctx.db.patch(args.id, {
      status: args.status,
      rejectionReason: args.rejectionReason,
      reviewedByUserId: user._id,
      reviewedAt: new Date().toISOString(),
    });

    // Recalculate completeness percentage
    const allRequirements = await ctx.db
      .query("nieuwbouwDocumentRequirements")
      .withIndex("by_nieuwbouwProjectId", (q) =>
        q.eq("nieuwbouwProjectId", req.nieuwbouwProjectId)
      )
      .take(200);

    const total = allRequirements.length;
    const fulfilled = allRequirements.filter(
      (r) =>
        (r._id === args.id ? args.status : r.status) === "GOEDGEKEURD"
    ).length;

    const percentage = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

    await ctx.db.patch(req.nieuwbouwProjectId, {
      completenessPercentage: percentage,
      fulfilledRequirements: fulfilled,
      totalRequirements: total,
    });

    return args.id;
  },
});

/** Generate access token for aannemer portal */
export const generateAccessToken = mutation({
  args: { id: v.id("nieuwbouwProjects") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const token = Array.from({ length: 12 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

    // Expires in 90 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await ctx.db.patch(args.id, {
      accessToken: token,
      accessTokenExpiresAt: expiresAt.toISOString(),
    });

    return token;
  },
});

/** Public mutation: generate upload URL for aannemer uploads (no auth) */
export const generatePublicUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Verify token
    const nb = await ctx.db
      .query("nieuwbouwProjects")
      .withIndex("by_accessToken", (q) => q.eq("accessToken", args.token))
      .first();

    if (!nb) throw new Error("Ongeldige toegangstoken.");
    if (nb.accessTokenExpiresAt && new Date(nb.accessTokenExpiresAt) < new Date()) {
      throw new Error("Toegangstoken is verlopen.");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

/** Public mutation: upload document for a requirement (aannemer portal, no auth) */
export const uploadDocument = mutation({
  args: {
    token: v.string(),
    requirementId: v.id("nieuwbouwDocumentRequirements"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify token
    const nb = await ctx.db
      .query("nieuwbouwProjects")
      .withIndex("by_accessToken", (q) => q.eq("accessToken", args.token))
      .first();

    if (!nb) throw new Error("Ongeldige toegangstoken.");
    if (nb.accessTokenExpiresAt && new Date(nb.accessTokenExpiresAt) < new Date()) {
      throw new Error("Toegangstoken is verlopen.");
    }

    // Verify requirement belongs to this project
    const req = await ctx.db.get(args.requirementId);
    if (!req || req.nieuwbouwProjectId !== nb._id) {
      throw new Error("Requirement hoort niet bij dit project.");
    }

    // Create document record
    const docId = await ctx.db.insert("documents", {
      storageId: args.storageId,
      nieuwbouwProjectId: nb._id,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSizeBytes: args.fileSizeBytes,
      category: "OVERIG",
      nieuwbouwElement: req.element,
      nieuwbouwDocType: req.documentType === "GEDETAILLEERDE_TEKENING" ? "TEKENING" : req.documentType as any,
      isProjectLevel: req.isProjectLevel,
      uploadedAt: new Date().toISOString(),
      isArchived: false,
    });

    // Link document to requirement and update status
    await ctx.db.patch(args.requirementId, {
      documentId: docId,
      status: "AANGELEVERD",
    });

    // Recalculate completeness
    const allRequirements = await ctx.db
      .query("nieuwbouwDocumentRequirements")
      .withIndex("by_nieuwbouwProjectId", (q) =>
        q.eq("nieuwbouwProjectId", nb._id)
      )
      .take(200);

    const total = allRequirements.length;
    const fulfilled = allRequirements.filter(
      (r) =>
        r.status === "GOEDGEKEURD" ||
        (r._id === args.requirementId ? "AANGELEVERD" : r.status) === "AANGELEVERD"
    ).length;

    // Only count GOEDGEKEURD as truly fulfilled for percentage
    const approved = allRequirements.filter(
      (r) => r.status === "GOEDGEKEURD"
    ).length;
    const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;

    await ctx.db.patch(nb._id, {
      completenessPercentage: percentage,
      fulfilledRequirements: approved,
      totalRequirements: total,
    });

    return docId;
  },
});
