import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/** Public query — no auth required */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const track = await ctx.db
      .query("trackAndTrace")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!track || !track.isActive) return null;

    // Check expiry
    if (track.expiresAt && new Date(track.expiresAt) < new Date()) {
      return null;
    }

    return {
      code: track.code,
      lastPublicStatus: track.lastPublicStatus,
      lastPublicStatusUpdatedAt: track.lastPublicStatusUpdatedAt,
      appointmentDate: track.appointmentDate,
      adviseurFirstName: track.adviseurFirstName,
    };
  },
});

export const createForOrder = mutation({
  args: {
    orderId: v.id("orders"),
    contactId: v.optional(v.id("contacts")),
  },
  handler: async (ctx, args) => {
    // Generate unique code: VV-XXXX-XXXX
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const part1 = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    const part2 = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    const code = `VV-${part1}-${part2}`;

    // Expire 90 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    return await ctx.db.insert("trackAndTrace", {
      orderId: args.orderId,
      code,
      contactId: args.contactId,
      lastPublicStatus: "Uw opdracht is ontvangen",
      lastPublicStatusUpdatedAt: new Date().toISOString(),
      isActive: true,
      expiresAt: expiresAt.toISOString(),
    });
  },
});
