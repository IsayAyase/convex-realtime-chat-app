import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentClerkUserId, getCurrentUser, isUserInConversation } from "./utils";

export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser._id !== args.userId) {
      throw new Error("Unauthorized");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const hasAccess = await isUserInConversation(ctx, message.conversationId, clerkUserId);
    if (!hasAccess) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq("userId", args.userId as string))
      .filter((q) => q.eq("emoji", args.emoji))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return null;
    }

    return await ctx.db.insert("reactions", {
      messageId: args.messageId,
      userId: args.userId,
      emoji: args.emoji,
    });
  },
});

export const getReactions = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return [];

    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    const hasAccess = await isUserInConversation(ctx, message.conversationId, clerkUserId);
    if (!hasAccess) return [];

    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
    
    const grouped: Record<string, { emoji: string; count: number; userIds: string[] }> = {};
    
    for (const r of reactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].userIds.push(r.userId);
    }
    
    return Object.values(grouped);
  },
});

export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser._id !== args.userId) {
      throw new Error("Unauthorized");
    }

    const hasAccess = await isUserInConversation(ctx, args.conversationId, clerkUserId);
    if (!hasAccess) throw new Error("Unauthorized");

    const now = Date.now();
    const allTyping = await ctx.db
      .query("typing")
      .withIndex("by_conversation_user", (q) => 
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    
    for (const t of allTyping) {
      if (t.expiresAt <= now) {
        await ctx.db.delete(t._id);
      }
    }

    const existing = await ctx.db
      .query("typing")
      .withIndex("by_conversation_user", (q) => 
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt: Date.now() + 4000 });
    } else {
      await ctx.db.insert("typing", {
        conversationId: args.conversationId,
        userId: args.userId,
        expiresAt: Date.now() + 4000,
      });
    }
  },
});

export const clearTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return;

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser._id !== args.userId) {
      return;
    }

    const existing = await ctx.db
      .query("typing")
      .withIndex("by_conversation_user", (q) => 
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getTypingUsers = query({
  args: { conversationId: v.id("conversations"), excludeUserId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return [];

    const hasAccess = await isUserInConversation(ctx, args.conversationId, clerkUserId);
    if (!hasAccess) return [];

    const typing = await ctx.db
      .query("typing")
      .withIndex("by_conversation_user", (q) => 
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const now = Date.now();
    const validTyping = typing.filter((t) => t.expiresAt > now && t.userId !== args.excludeUserId);

    const users = [];
    for (const t of validTyping) {
      const user = await ctx.db.get(t.userId);
      if (user) users.push(user);
    }
    return users;
  },
});
