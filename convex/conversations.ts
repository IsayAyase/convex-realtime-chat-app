import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
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

    if (args.currentUserId === args.otherUserId) {
      const existing = await ctx.db
        .query("conversationMembers")
        .withIndex("by_user", (q) => q.eq("userId", args.currentUserId as Id<"users">))
        .collect();

      for (const member of existing) {
        const conversation = await ctx.db.get(member.conversationId);
        if (!conversation || conversation.type !== "direct") continue;

        const otherMembers = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversation", (q) => q.eq("conversationId", member.conversationId))
          .collect();

        if (otherMembers.length === 1 && otherMembers[0].userId === args.currentUserId) {
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

      return conversationId;
    }

    const existing = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.currentUserId as Id<"users">))
      .collect();

    for (const member of existing) {
      const conversation = await ctx.db.get(member.conversationId);
      if (!conversation || conversation.type !== "direct") continue;

      const otherMembers = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) => q.eq("conversationId", member.conversationId))
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

export const createGroup = mutation({
  args: {
    currentUserId: v.id("users"),
    memberIds: v.array(v.id("users")),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser._id !== args.currentUserId) {
      throw new Error("Unauthorized");
    }

    const totalMembers = 1 + args.memberIds.length;
    if (totalMembers > 20) {
      throw new Error("Group can have maximum 20 members");
    }

    const conversationId = await ctx.db.insert("conversations", {
      type: "group",
      name: args.groupName,
      adminUserId: args.currentUserId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    for (const memberId of args.memberIds) {
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId: memberId,
        joinedAt: Date.now(),
      });
    }

    return conversationId;
  },
});

export const addGroupMembers = mutation({
  args: {
    conversationId: v.id("conversations"),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.type !== "group") {
      throw new Error("Conversation not found");
    }

    if (conversation.adminUserId !== args.memberIds[0]) {
      const currentUser = await getCurrentUser(ctx);
      if (!currentUser || conversation.adminUserId !== currentUser._id) {
        throw new Error("Only admin can add members");
      }
    }

    const currentMembers = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    if (currentMembers.length + args.memberIds.length > 20) {
      throw new Error("Group can have maximum 20 members");
    }

    for (const memberId of args.memberIds) {
      const existing = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
        .filter((q) => q.eq("userId", memberId as string))
        .first();

      if (!existing) {
        await ctx.db.insert("conversationMembers", {
          conversationId: args.conversationId,
          userId: memberId,
          joinedAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  },
});

export const removeGroupMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    memberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.type !== "group") {
      throw new Error("Conversation not found");
    }

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Unauthorized");

    const isAdmin = conversation.adminUserId === currentUser._id;
    const isSelf = args.memberId === currentUser._id;

    if (!isAdmin && !isSelf) {
      throw new Error("Only admin or self can remove members");
    }

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q) => 
        q.eq("conversationId", args.conversationId).eq("userId", args.memberId)
      )
      .first();

    if (membership) {
      await ctx.db.delete(membership._id);
    }

    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  },
});

export const deleteGroup = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.type !== "group") {
      throw new Error("Conversation not found");
    }

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || conversation.adminUserId !== currentUser._id) {
      throw new Error("Only admin can delete the group");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const msg of messages) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();
      for (const reaction of reactions) {
        await ctx.db.delete(reaction._id);
      }
      await ctx.db.delete(msg._id);
    }

    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.conversationId);
  },
});

export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) throw new Error("Unauthorized");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Unauthorized");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const msg of messages) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();
      for (const reaction of reactions) {
        await ctx.db.delete(reaction._id);
      }
      await ctx.db.delete(msg._id);
    }

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q) => 
        q.eq("conversationId", args.conversationId).eq("userId", currentUser._id)
      )
      .first();

    if (membership) {
      await ctx.db.delete(membership._id);
    }

    await ctx.db.delete(args.conversationId);
  },
});

export const getConversations = query({
  args: { 
    userId: v.optional(v.id("users")),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) return { conversations: [], nextCursor: null };

    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return { conversations: [], nextCursor: null };

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser._id !== args.userId) {
      return { conversations: [], nextCursor: null };
    }

    const userId = args.userId as string;

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .collect();

    const allConversations = [];
    for (const m of memberships) {
      const conv = await ctx.db.get(m.conversationId);
      if (conv) {
        const otherMembers = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversation", (q) => q.eq("conversationId", m.conversationId))
          .collect();

        const memberUsers = [];
        for (const om of otherMembers) {
          const user = await ctx.db.get(om.userId);
          if (user) memberUsers.push(user);
        }

        const latestMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", m.conversationId))
          .order("desc")
          .take(1);

        const unreadRecord = await ctx.db
          .query("unread")
          .withIndex("by_conversation_user", (q) => 
            q.eq("conversationId", m.conversationId).eq("userId", userId as Id<"users">)
          )
          .first();

        allConversations.push({
          ...conv,
          memberUsers,
          latestMessage: latestMessage[0] || null,
          unreadCount: unreadRecord?.count || 0,
        });
      }
    }

    const sortedConversations = allConversations.sort((a, b) => b.updatedAt - a.updatedAt);

    const limit = args.limit || 15;
    const cursor = args.cursor || 0;
    const paginatedConversations = sortedConversations.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < sortedConversations.length ? cursor + limit : null;

    return { conversations: paginatedConversations, nextCursor };
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
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const users = [];
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (user) users.push(user);
    }
    return users;
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return null;

    const hasAccess = await isUserInConversation(ctx, args.conversationId, clerkUserId);
    if (!hasAccess) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const memberUsers = [];
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (user) memberUsers.push(user);
    }

    return { ...conversation, memberUsers };
  },
});
