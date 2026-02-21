import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentClerkUserId, getCurrentUser, isUserInConversation } from "./utils";

export const getOrCreateConversation = mutation({
  args: {
    currentUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser._id !== args.currentUserId) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("conversationMembers")
      .filter((q) => q.eq("userId", args.currentUserId as string))
      .collect();

    for (const member of existing) {
      const conversation = await ctx.db.get(member.conversationId);
      if (!conversation || conversation.type !== "direct") continue;

      const otherMembers = await ctx.db
        .query("conversationMembers")
        .filter((q) => q.eq("conversationId", member.conversationId as string))
        .collect();

      if (otherMembers.some((m) => m.userId === args.otherUserId)) {
        return member.conversationId;
      }
    }

    const conversationId = await ctx.db.insert("conversations", {
      type: "direct",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: args.currentUserId,
      joinedAt: Date.now(),
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: args.otherUserId,
      joinedAt: Date.now(),
    });

    return conversationId;
  },
});

export const getConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return [];

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser._id !== args.userId) {
      return [];
    }

    const memberships = await ctx.db
      .query("conversationMembers")
      .filter((q) => q.eq("userId", args.userId as string))
      .collect();

    const conversations = [];
    for (const m of memberships) {
      const conv = await ctx.db.get(m.conversationId);
      if (conv) conversations.push(conv);
    }

    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getConversationMembers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return [];

    const hasAccess = await isUserInConversation(ctx, args.conversationId, clerkUserId);
    if (!hasAccess) return [];

    const members = await ctx.db
      .query("conversationMembers")
      .filter((q) => q.eq("conversationId", args.conversationId as string))
      .collect();

    const users = [];
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (user) users.push(user);
    }
    return users;
  },
});
