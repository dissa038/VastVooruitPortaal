import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listForUser = query({
  args: {
    userId: v.id("users"),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.unreadOnly) {
      return await ctx.db
        .query("notifications")
        .withIndex("by_userId_and_isRead", (q) =>
          q.eq("userId", args.userId).eq("isRead", false)
        )
        .order("desc")
        .take(20);
    }
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isRead: true,
      readAt: new Date().toISOString(),
    });
  },
});

export const markAllAsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .take(100);

    for (const notif of unread) {
      await ctx.db.patch(notif._id, {
        isRead: true,
        readAt: new Date().toISOString(),
      });
    }
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    quoteId: v.optional(v.id("quotes")),
    invoiceId: v.optional(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type as never,
      orderId: args.orderId,
      projectId: args.projectId,
      quoteId: args.quoteId,
      invoiceId: args.invoiceId,
      isRead: false,
    });
  },
});

export const getUnreadCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .take(100);
    return unread.length;
  },
});
