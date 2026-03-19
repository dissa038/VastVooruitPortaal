import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    userId: v.optional(v.id("users")),
    date: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    if (args.userId && args.date) {
      return await ctx.db
        .query("timeEntries")
        .withIndex("by_userId_and_date", (q) =>
          q.eq("userId", args.userId!).eq("date", args.date!)
        )
        .take(50);
    }
    if (args.userId) {
      return await ctx.db
        .query("timeEntries")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(50);
    }
    if (args.projectId) {
      return await ctx.db
        .query("timeEntries")
        .withIndex("by_projectId", (q) =>
          q.eq("projectId", args.projectId!)
        )
        .order("desc")
        .take(100);
    }
    return await ctx.db.query("timeEntries").order("desc").take(50);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    date: v.string(),
    durationMinutes: v.number(),
    workType: v.string(),
    description: v.optional(v.string()),
    isBillable: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("timeEntries", {
      userId: args.userId,
      orderId: args.orderId,
      projectId: args.projectId,
      date: args.date,
      durationMinutes: args.durationMinutes,
      workType: args.workType as never,
      description: args.description,
      isBillable: args.isBillable,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("timeEntries"),
    durationMinutes: v.optional(v.number()),
    workType: v.optional(v.string()),
    description: v.optional(v.string()),
    isBillable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    await ctx.db.patch(id, cleanUpdates);
  },
});

export const remove = mutation({
  args: { id: v.id("timeEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/** Weekly summary for a user */
export const getWeeklySummary = query({
  args: {
    userId: v.id("users"),
    weekStartDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get entries for the week (7 days from start)
    const startDate = new Date(args.weekStartDate);
    const entries = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const dayEntries = await ctx.db
        .query("timeEntries")
        .withIndex("by_userId_and_date", (q) =>
          q.eq("userId", args.userId).eq("date", dateStr)
        )
        .take(20);

      entries.push({
        date: dateStr,
        entries: dayEntries,
        totalMinutes: dayEntries.reduce((sum, e) => sum + e.durationMinutes, 0),
      });
    }

    const totalMinutes = entries.reduce((sum, d) => sum + d.totalMinutes, 0);

    return { days: entries, totalMinutes };
  },
});
