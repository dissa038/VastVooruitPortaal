import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    status: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("quotes")
        .withIndex("by_status", (q) => q.eq("status", args.status as never))
        .order("desc")
        .take(50);
    }
    if (args.companyId) {
      return await ctx.db
        .query("quotes")
        .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId!))
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("quotes").order("desc").take(50);
  },
});

export const getById = query({
  args: { id: v.id("quotes") },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.id);
    if (!quote) return null;

    const lineItems = await ctx.db
      .query("quoteLineItems")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", args.id))
      .collect();

    const company = quote.companyId
      ? await ctx.db.get(quote.companyId)
      : null;
    const contact = quote.contactId
      ? await ctx.db.get(quote.contactId)
      : null;

    return { ...quote, lineItems, company, contact };
  },
});

export const create = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    projectId: v.optional(v.id("projects")),
    intermediaryId: v.optional(v.id("intermediaries")),
    title: v.optional(v.string()),
    introText: v.optional(v.string()),
    conditions: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    lineItems: v.array(
      v.object({
        productId: v.optional(v.id("products")),
        description: v.string(),
        quantity: v.number(),
        unitPriceExVat: v.number(),
        vatPercentage: v.number(),
        buildingType: v.optional(v.string()),
      })
    ),
    createdByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Generate reference code
    const year = new Date().getFullYear();
    const existing = await ctx.db
      .query("quotes")
      .order("desc")
      .take(1);
    const seq = existing.length > 0
      ? parseInt(existing[0].referenceCode.split("-").pop() || "0") + 1
      : 1;
    const referenceCode = `OFF-${year}-${String(seq).padStart(5, "0")}`;

    // Calculate totals
    let totalExVat = 0;
    let vatAmount = 0;
    const lineItemsToInsert = args.lineItems.map((item, index) => {
      const lineTotal = item.quantity * item.unitPriceExVat;
      totalExVat += lineTotal;
      vatAmount += Math.round(lineTotal * (item.vatPercentage / 100));
      return { ...item, totalExVat: lineTotal, sortOrder: index };
    });

    const quoteId = await ctx.db.insert("quotes", {
      referenceCode,
      companyId: args.companyId,
      contactId: args.contactId,
      projectId: args.projectId,
      intermediaryId: args.intermediaryId,
      status: "CONCEPT",
      title: args.title,
      introText: args.introText,
      conditions: args.conditions,
      totalExVat,
      totalInclVat: totalExVat + vatAmount,
      vatAmount,
      validUntil: args.validUntil,
      createdByUserId: args.createdByUserId,
      isArchived: false,
    });

    // Insert line items
    for (const item of lineItemsToInsert) {
      await ctx.db.insert("quoteLineItems", {
        quoteId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPriceExVat: item.unitPriceExVat,
        totalExVat: item.totalExVat,
        vatPercentage: item.vatPercentage,
        buildingType: item.buildingType as never,
        sortOrder: item.sortOrder,
      });
    }

    return quoteId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("quotes"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.id);
    if (!quote) throw new Error("Offerte niet gevonden");

    const updates: Record<string, unknown> = { status: args.status as never };

    if (args.status === "VERSTUURD") {
      updates.sentAt = new Date().toISOString();
    } else if (args.status === "GEACCEPTEERD") {
      updates.acceptedAt = new Date().toISOString();
    } else if (args.status === "AFGEWEZEN") {
      updates.rejectedAt = new Date().toISOString();
    }

    await ctx.db.patch(args.id, updates);
  },
});

// ============================================================================
// PUBLIC FUNCTIONS (no auth required)
// ============================================================================

/** Public query — returns quote + line items for the public acceptance page */
export const getPublicById = query({
  args: { id: v.id("quotes") },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.id);
    if (!quote || quote.isArchived) return null;

    const lineItems = await ctx.db
      .query("quoteLineItems")
      .withIndex("by_quoteId", (q) => q.eq("quoteId", args.id))
      .collect();

    const company = quote.companyId
      ? await ctx.db.get(quote.companyId)
      : null;
    const contact = quote.contactId
      ? await ctx.db.get(quote.contactId)
      : null;

    // Return only fields needed for public display
    return {
      _id: quote._id,
      referenceCode: quote.referenceCode,
      status: quote.status,
      title: quote.title,
      introText: quote.introText,
      conditions: quote.conditions,
      totalExVat: quote.totalExVat,
      totalInclVat: quote.totalInclVat,
      vatAmount: quote.vatAmount,
      sentAt: quote.sentAt,
      validUntil: quote.validUntil,
      acceptedAt: quote.acceptedAt,
      rejectedAt: quote.rejectedAt,
      signedByName: quote.signedByName,
      lineItems: lineItems.map((li) => ({
        _id: li._id,
        description: li.description,
        quantity: li.quantity,
        unitPriceExVat: li.unitPriceExVat,
        totalExVat: li.totalExVat,
        vatPercentage: li.vatPercentage,
        sortOrder: li.sortOrder,
      })),
      companyName: company?.name ?? null,
      contactName: contact
        ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
        : null,
      contactEmail: contact?.email ?? null,
    };
  },
});

/** Accept a quote — sets status, stores signature, creates project */
export const acceptQuote = mutation({
  args: {
    id: v.id("quotes"),
    signedByName: v.string(),
    signatureStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.id);
    if (!quote) throw new Error("Offerte niet gevonden");

    if (quote.status === "GEACCEPTEERD") {
      throw new Error("Deze offerte is al geaccepteerd");
    }
    if (quote.status === "AFGEWEZEN") {
      throw new Error("Deze offerte is afgewezen en kan niet meer geaccepteerd worden");
    }

    const now = new Date().toISOString();

    // Update quote status
    await ctx.db.patch(args.id, {
      status: "GEACCEPTEERD",
      acceptedAt: now,
      signedByName: args.signedByName,
      signedAt: now,
      signatureStorageId: args.signatureStorageId,
    });

    // Create project from quote
    const year = new Date().getFullYear();
    const yearSuffix = String(year).slice(-2);
    const codePrefix = `OVE-${yearSuffix}-`;

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

    const projectId = await ctx.db.insert("projects", {
      name: quote.title ?? `Project ${quote.referenceCode}`,
      referenceCode,
      companyId: quote.companyId,
      contactId: quote.contactId,
      intermediaryId: quote.intermediaryId,
      type: "OVERIG",
      status: "ACTIEF",
      description: `Automatisch aangemaakt vanuit geaccepteerde offerte ${quote.referenceCode}`,
      quoteId: args.id,
      startDate: now,
      totalOrders: 0,
      completedOrders: 0,
      isArchived: false,
    });

    // Link quote to project
    await ctx.db.patch(args.id, { projectId });

    // Log activity
    await ctx.db.insert("activityLog", {
      entityType: "QUOTE",
      entityId: args.id,
      action: "STATUS_CHANGED",
      description: `Offerte ${quote.referenceCode} geaccepteerd door ${args.signedByName}. Project ${referenceCode} aangemaakt.`,
      timestamp: now,
    });

    return { projectId, referenceCode };
  },
});

/** Reject a quote with optional reason */
export const rejectQuote = mutation({
  args: {
    id: v.id("quotes"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.id);
    if (!quote) throw new Error("Offerte niet gevonden");

    if (quote.status === "GEACCEPTEERD") {
      throw new Error("Deze offerte is al geaccepteerd en kan niet meer afgewezen worden");
    }
    if (quote.status === "AFGEWEZEN") {
      throw new Error("Deze offerte is al afgewezen");
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.id, {
      status: "AFGEWEZEN",
      rejectedAt: now,
      notes: args.reason
        ? `${quote.notes ? quote.notes + "\n" : ""}Afwijzingsreden: ${args.reason}`
        : quote.notes,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      entityType: "QUOTE",
      entityId: args.id,
      action: "REJECTED",
      description: `Offerte ${quote.referenceCode} afgewezen.${args.reason ? ` Reden: ${args.reason}` : ""}`,
      timestamp: now,
    });
  },
});

/** Generate upload URL for signature image */
export const generateSignatureUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
