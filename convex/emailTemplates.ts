import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ============================================================================
// HELPER: Render template by replacing {{placeholders}} with data
// ============================================================================

export function renderTemplate(
  template: string,
  data: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] ?? match;
  });
}

// ============================================================================
// QUERIES
// ============================================================================

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("emailTemplates").take(100);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    subject: v.string(),
    body: v.string(),
    triggerEvent: v.optional(
      v.union(
        v.literal("APPOINTMENT_CONFIRMED"),
        v.literal("APPOINTMENT_REMINDER"),
        v.literal("LABEL_DELIVERED"),
        v.literal("QUOTE_SENT"),
        v.literal("INVOICE_SENT"),
        v.literal("PAYMENT_REMINDER"),
        v.literal("STATUS_UPDATE"),
        v.literal("NIEUWBOUW_ACCESS"),
        v.literal("CUSTOM"),
      ),
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Check slug uniqueness
    const existing = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      throw new Error(`Template met slug "${args.slug}" bestaat al.`);
    }

    return await ctx.db.insert("emailTemplates", {
      name: args.name,
      slug: args.slug,
      subject: args.subject,
      body: args.body,
      triggerEvent: args.triggerEvent,
      isActive: args.isActive ?? true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("emailTemplates"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    triggerEvent: v.optional(
      v.union(
        v.literal("APPOINTMENT_CONFIRMED"),
        v.literal("APPOINTMENT_REMINDER"),
        v.literal("LABEL_DELIVERED"),
        v.literal("QUOTE_SENT"),
        v.literal("INVOICE_SENT"),
        v.literal("PAYMENT_REMINDER"),
        v.literal("STATUS_UPDATE"),
        v.literal("NIEUWBOUW_ACCESS"),
        v.literal("CUSTOM"),
      ),
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const template = await ctx.db.get(args.id);
    if (!template) throw new Error("Template niet gevonden.");

    // Check slug uniqueness if slug is changing
    if (args.slug && args.slug !== template.slug) {
      const existing = await ctx.db
        .query("emailTemplates")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .first();
      if (existing) {
        throw new Error(`Template met slug "${args.slug}" bestaat al.`);
      }
    }

    const { id, ...updates } = args;
    // Filter out undefined values
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
    return args.id;
  },
});
