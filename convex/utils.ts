import { QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export async function getCurrentClerkUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return identity.subject;
}

export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const clerkUserId = await getCurrentClerkUserId(ctx);
  if (!clerkUserId) return null;
  
  return await ctx.db
    .query("users")
    .withIndex("by_userId", (q) => q.eq("userId", clerkUserId))
    .first();
}

export async function isUserInConversation(
  ctx: QueryCtx, 
  conversationId: Id<"conversations">, 
  clerkUserId: string
): Promise<boolean> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_userId", (q) => q.eq("userId", clerkUserId))
    .first();
  if (!user) return false;

  const membership = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .filter((q) => q.eq(q.field("userId"), user._id))
    .first();
  return !!membership;
}

export async function assertAuthenticated(ctx: QueryCtx): Promise<string> {
  const clerkUserId = await getCurrentClerkUserId(ctx);
  if (!clerkUserId) throw new Error("Unauthorized");
  return clerkUserId;
}

export async function assertUserAuthorized(
  clerkUserId: string, 
  expectedClerkUserId: string
): Promise<void> {
  if (clerkUserId !== expectedClerkUserId) {
    throw new Error("Unauthorized");
  }
}
