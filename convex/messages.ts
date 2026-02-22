import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentClerkUserId, getCurrentUser, isUserInConversation } from "./utils";

export const getMessages = query({
  args: { 
    conversationId: v.id("conversations"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return { messages: [], continueCursor: null };

    const hasAccess = await isUserInConversation(ctx, args.conversationId, clerkUserId);
    if (!hasAccess) return { messages: [], continueCursor: null };

    const limit = args.limit ?? 15;
    
    let query = ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc");

    let result;
    if (args.cursor) {
      result = await query.paginate({ cursor: args.cursor, numItems: limit });
    } else {
      result = await query.paginate({ cursor: null, numItems: limit });
    }

    return {
      messages: result.page.reverse(),
      continueCursor: result.continueCursor,
    };
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const hasAccess = await isUserInConversation(ctx, args.conversationId, clerkUserId);
    if (!hasAccess) throw new Error("Unauthorized");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      deleted: false,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });

    return messageId;
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || message.senderId !== currentUser._id) {
      throw new Error("Unauthorized - can only delete your own messages");
    }

    await ctx.db.patch(args.messageId, { deleted: true });
  },
});

export const getLatestMessage = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return null;

    const hasAccess = await isUserInConversation(ctx, args.conversationId, clerkUserId);
    if (!hasAccess) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(1);
    return messages[0] || null;
  },
});
