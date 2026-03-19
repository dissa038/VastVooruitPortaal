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
        .query("invoices")
        .withIndex("by_status", (q) => q.eq("status", args.status as never))
        .order("desc")
        .take(50);
    }
    if (args.companyId) {
      return await ctx.db
        .query("invoices")
        .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId!))
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("invoices").order("desc").take(50);
  },
});

export const getById = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) return null;

    const lineItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_invoiceId", (q) => q.eq("invoiceId", args.id))
      .collect();

    const company = invoice.companyId
      ? await ctx.db.get(invoice.companyId)
      : null;
    const contact = invoice.contactId
      ? await ctx.db.get(invoice.contactId)
      : null;

    return { ...invoice, lineItems, company, contact };
  },
});

export const create = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    projectId: v.optional(v.id("projects")),
    invoiceDate: v.string(),
    dueDate: v.string(),
    lineItems: v.array(
      v.object({
        orderId: v.optional(v.id("orders")),
        productId: v.optional(v.id("products")),
        description: v.string(),
        quantity: v.number(),
        unitPriceExVat: v.number(),
        vatPercentage: v.number(),
      })
    ),
    createdByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Generate reference code
    const year = new Date().getFullYear();
    const existing = await ctx.db
      .query("invoices")
      .order("desc")
      .take(1);
    const seq = existing.length > 0
      ? parseInt(existing[0].referenceCode.split("-").pop() || "0") + 1
      : 1;
    const referenceCode = `FAC-${year}-${String(seq).padStart(5, "0")}`;

    // Calculate totals
    let totalExVat = 0;
    let vatAmount = 0;
    const lineItemsToInsert = args.lineItems.map((item, index) => {
      const lineTotal = item.quantity * item.unitPriceExVat;
      totalExVat += lineTotal;
      vatAmount += Math.round(lineTotal * (item.vatPercentage / 100));
      return { ...item, totalExVat: lineTotal, sortOrder: index };
    });

    const invoiceId = await ctx.db.insert("invoices", {
      referenceCode,
      companyId: args.companyId,
      contactId: args.contactId,
      projectId: args.projectId,
      status: "CONCEPT",
      totalExVat,
      totalInclVat: totalExVat + vatAmount,
      vatAmount,
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
      createdByUserId: args.createdByUserId,
      isArchived: false,
    });

    // Insert line items
    for (const item of lineItemsToInsert) {
      await ctx.db.insert("invoiceLineItems", {
        invoiceId,
        orderId: item.orderId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPriceExVat: item.unitPriceExVat,
        totalExVat: item.totalExVat,
        vatPercentage: item.vatPercentage,
        sortOrder: item.sortOrder,
      });
    }

    return invoiceId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) throw new Error("Factuur niet gevonden");

    const updates: Record<string, unknown> = { status: args.status as never };

    if (args.status === "VERSTUURD") {
      updates.sentAt = new Date().toISOString();
    } else if (args.status === "BETAALD") {
      updates.paidAt = new Date().toISOString();
    } else if (args.status === "HERINNERING") {
      updates.reminderCount = (invoice.reminderCount || 0) + 1;
      updates.lastReminderSentAt = new Date().toISOString();
    }

    await ctx.db.patch(args.id, updates);
  },
});

/** Get invoice aging stats for dashboard */
export const getAgingStats = query({
  args: {},
  handler: async (ctx) => {
    const unpaid = await ctx.db
      .query("invoices")
      .withIndex("by_status", (q) => q.eq("status", "VERSTUURD"))
      .take(200);

    const now = new Date();
    let current = 0;
    let overdue30 = 0;
    let overdue60 = 0;
    let overdue90 = 0;

    for (const inv of unpaid) {
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue <= 0) current += inv.totalInclVat;
      else if (daysOverdue <= 30) overdue30 += inv.totalInclVat;
      else if (daysOverdue <= 60) overdue60 += inv.totalInclVat;
      else overdue90 += inv.totalInclVat;
    }

    return { current, overdue30, overdue60, overdue90, total: unpaid.length };
  },
});
