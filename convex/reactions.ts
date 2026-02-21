import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .filter((q) => 
        q.and(
          q.eq("messageId", args.messageId as string),
          q.eq("userId", args.userId as string),
          q.eq("emoji", args.emoji)
        )
      )
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
    const reactions = await ctx.db
      .query("reactions")
      .filter((q) => q.eq("messageId", args.messageId as string))
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
    const existing = await ctx.db
      .query("typing")
      .filter((q) => 
        q.and(
          q.eq("conversationId", args.conversationId as string),
          q.eq("userId", args.userId as string)
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt: Date.now() + 3000 });
    } else {
      await ctx.db.insert("typing", {
        conversationId: args.conversationId,
        userId: args.userId,
        expiresAt: Date.now() + 3000,
      });
    }
  },
});

export const getTypingUsers = query({
  args: { conversationId: v.id("conversations"), excludeUserId: v.id("users") },
  handler: async (ctx, args) => {
    const typing = await ctx.db
      .query("typing")
      .filter((q) => q.eq("conversationId", args.conversationId as string))
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
