import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

/**
 * Get the currently authenticated user from Clerk identity.
 * Returns null if not authenticated or user not found in DB.
 */
export async function getAuthUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();

  return user;
}

/**
 * Require authentication. Throws if not authenticated.
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await getAuthUser(ctx);
  if (!user) {
    throw new Error("Niet ingelogd. Log in om verder te gaan.");
  }
  if (!user.isActive) {
    throw new Error("Account is gedeactiveerd. Neem contact op met een beheerder.");
  }
  return user;
}

/**
 * Require a specific role. Throws if user doesn't have one of the allowed roles.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  roles: string[]
): Promise<Doc<"users">> {
  const user = await requireAuth(ctx);
  if (!roles.includes(user.role)) {
    throw new Error(
      `Onvoldoende rechten. Vereiste rol: ${roles.join(", ")}.`
    );
  }
  return user;
}
