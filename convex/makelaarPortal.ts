import { v } from "convex/values";
import { query } from "./_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/** Public query: get intermediary + their referred orders by portal code */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    // Find intermediary by matching on name-based code
    // The code is stored as a field on the intermediary or we look up by a simple match
    // For now: we use the intermediary ID as the code (URL-safe base)
    // Or we search by a generated portal code

    // Strategy: search all intermediaries for one whose portal code matches
    // Since we don't have a dedicated portalCode field yet, we'll use the
    // intermediary's _id as the code. The URL will be /makelaar/[intermediaryId]
    const allIntermediaries = await ctx.db
      .query("intermediaries")
      .take(500);

    const intermediary = allIntermediaries.find(
      (i) => i._id === args.code || i.name.toLowerCase().replace(/\s+/g, "-") === args.code.toLowerCase()
    );

    if (!intermediary) return null;
    if (!intermediary.isActive) return null;

    // Get all orders referred by this intermediary
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_intermediaryId", (q) =>
        q.eq("intermediaryId", intermediary._id)
      )
      .take(200);

    const activeOrders = orders.filter((o) => !o.isArchived);

    // Enrich orders with address data
    const enrichedOrders = await Promise.all(
      activeOrders.map(async (order) => {
        const address = await ctx.db.get(order.addressId);

        return {
          _id: order._id,
          referenceCode: order.referenceCode,
          status: order.status,
          scheduledDate: order.scheduledDate,
          completedAt: order.completedAt,
          address: address
            ? `${address.street} ${address.houseNumber}${address.houseNumberAddition ? ` ${address.houseNumberAddition}` : ""}`
            : "—",
          city: address?.city ?? "",
          postcode: address?.postcode ?? "",
          epOnlineLabelNieuw: order.epOnlineLabelNieuw,
        };
      })
    );

    return {
      intermediaryName: intermediary.name,
      intermediaryType: intermediary.type,
      orders: enrichedOrders,
    };
  },
});
