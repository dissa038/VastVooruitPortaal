import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

/** List appointments within a date range, optionally filtered by adviseur */
export const list = query({
  args: {
    startDate: v.string(), // ISO date string e.g. "2026-03-16"
    endDate: v.string(),
    adviseurId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let appointments;

    if (args.adviseurId) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_adviseurId_and_startTime", (q) =>
          q
            .eq("adviseurId", args.adviseurId!)
            .gte("startTime", args.startDate)
        )
        .take(200);
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_startTime", (q) =>
          q.gte("startTime", args.startDate)
        )
        .take(200);
    }

    // Filter by endDate (startTime < endDate + 1 day to include the end day)
    const endCutoff = args.endDate + "T23:59:59";
    appointments = appointments.filter((a) => a.startTime <= endCutoff);

    // Enrich with order, address, and adviseur data
    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const order = await ctx.db.get(apt.orderId);
        const address = await ctx.db.get(apt.addressId);
        const adviseur = await ctx.db.get(apt.adviseurId);

        return {
          ...apt,
          orderReferenceCode: order?.referenceCode ?? "—",
          orderStatus: order?.status ?? "—",
          addressLine: address
            ? `${address.street} ${address.houseNumber}${address.houseNumberAddition ? ` ${address.houseNumberAddition}` : ""}`
            : "—",
          city: address?.city ?? "—",
          adviseurName: adviseur
            ? `${adviseur.firstName} ${adviseur.lastName}`
            : "—",
        };
      })
    );

    return enriched;
  },
});

/** Get appointments for a specific adviseur */
export const getByAdviseur = query({
  args: {
    adviseurId: v.id("users"),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const start = args.startDate ?? new Date().toISOString().split("T")[0];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_adviseurId_and_startTime", (q) =>
        q.eq("adviseurId", args.adviseurId).gte("startTime", start)
      )
      .take(100);

    // Enrich with address
    return Promise.all(
      appointments.map(async (apt) => {
        const address = await ctx.db.get(apt.addressId);
        const order = await ctx.db.get(apt.orderId);
        return {
          ...apt,
          addressLine: address
            ? `${address.street} ${address.houseNumber}${address.houseNumberAddition ? ` ${address.houseNumberAddition}` : ""}`
            : "—",
          city: address?.city ?? "—",
          orderReferenceCode: order?.referenceCode ?? "—",
        };
      })
    );
  },
});

/** Get a single appointment by ID */
export const getById = query({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/** Create a new appointment and update the order status to INGEPLAND */
export const create = mutation({
  args: {
    orderId: v.id("orders"),
    adviseurId: v.id("users"),
    startTime: v.string(), // ISO datetime
    endTime: v.string(),
    isAllDay: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Opdracht niet gevonden.");

    // Create the appointment
    const appointmentId = await ctx.db.insert("appointments", {
      orderId: args.orderId,
      adviseurId: args.adviseurId,
      startTime: args.startTime,
      endTime: args.endTime,
      isAllDay: args.isAllDay ?? false,
      addressId: order.addressId,
      isSyncedToOutlook: false,
      status: "GEPLAND",
      notes: args.notes,
    });

    // Update order: assign adviseur, set scheduled date, update status
    const scheduledDate = args.startTime.split("T")[0];
    const previousStatus = order.status;

    await ctx.db.patch(args.orderId, {
      assignedAdviseurId: args.adviseurId,
      scheduledDate,
      status: "INGEPLAND",
    });

    // Create status history entry
    await ctx.db.insert("statusHistory", {
      orderId: args.orderId,
      previousStatus,
      newStatus: "INGEPLAND",
      changedByUserId: user._id,
      changedAt: new Date().toISOString(),
      reason: "Afspraak ingepland",
    });

    return appointmentId;
  },
});

/** Update an existing appointment */
export const update = mutation({
  args: {
    id: v.id("appointments"),
    adviseurId: v.optional(v.id("users")),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("GEPLAND"),
        v.literal("BEVESTIGD"),
        v.literal("ONDERWEG"),
        v.literal("VOLTOOID"),
        v.literal("NO_SHOW"),
        v.literal("GEANNULEERD"),
        v.literal("VERZET"),
      )
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const appointment = await ctx.db.get(args.id);
    if (!appointment) throw new Error("Afspraak niet gevonden.");

    const updates: Record<string, unknown> = {};
    if (args.adviseurId !== undefined) updates.adviseurId = args.adviseurId;
    if (args.startTime !== undefined) updates.startTime = args.startTime;
    if (args.endTime !== undefined) updates.endTime = args.endTime;
    if (args.status !== undefined) updates.status = args.status;
    if (args.notes !== undefined) updates.notes = args.notes;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.id, updates);
    }

    // If adviseur changed, also update the order
    if (args.adviseurId !== undefined) {
      await ctx.db.patch(appointment.orderId, {
        assignedAdviseurId: args.adviseurId,
      });
    }

    // If time changed, update scheduled date on order
    if (args.startTime !== undefined) {
      const scheduledDate = args.startTime.split("T")[0];
      await ctx.db.patch(appointment.orderId, { scheduledDate });
    }

    return args.id;
  },
});

/** Cancel an appointment */
export const cancel = mutation({
  args: {
    id: v.id("appointments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const appointment = await ctx.db.get(args.id);
    if (!appointment) throw new Error("Afspraak niet gevonden.");

    // Mark appointment as cancelled
    await ctx.db.patch(args.id, { status: "GEANNULEERD" });

    // Update order status back to GEACCEPTEERD
    const order = await ctx.db.get(appointment.orderId);
    if (order && order.status === "INGEPLAND") {
      await ctx.db.patch(appointment.orderId, {
        status: "GEACCEPTEERD",
        scheduledDate: undefined,
      });

      await ctx.db.insert("statusHistory", {
        orderId: appointment.orderId,
        previousStatus: "INGEPLAND",
        newStatus: "GEACCEPTEERD",
        changedByUserId: user._id,
        changedAt: new Date().toISOString(),
        reason: args.reason ?? "Afspraak geannuleerd",
      });
    }

    return args.id;
  },
});
