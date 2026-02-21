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

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: args.currentUserId,
      joinedAt: Date.now(),
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
      .filter((q) => q.eq("conversationId", args.conversationId as string))
      .collect();

    if (currentMembers.length + args.memberIds.length > 20) {
      throw new Error("Group can have maximum 20 members");
    }

    for (const memberId of args.memberIds) {
      const existing = await ctx.db
        .query("conversationMembers")
        .filter((q) => 
          q.and(
            q.eq("conversationId", args.conversationId as string),
            q.eq("userId", memberId as string)
          )
        )
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
      .filter((q) => 
        q.and(
          q.eq("conversationId", args.conversationId as string),
          q.eq("userId", args.memberId as string)
        )
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

    const members = await ctx.db
      .query("conversationMembers")
      .filter((q) => q.eq("conversationId", args.conversationId as string))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.conversationId);
  },
});

export const getConversations = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];

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
      if (conv) {
        const otherMembers = await ctx.db
          .query("conversationMembers")
          .filter((q) => q.eq("conversationId", m.conversationId as string))
          .collect();

        const memberUsers = [];
        for (const om of otherMembers) {
          const user = await ctx.db.get(om.userId);
          if (user) memberUsers.push(user);
        }

        const latestMessage = await ctx.db
          .query("messages")
          .filter((q) => q.eq("conversationId", m.conversationId as string))
          .order("desc")
          .take(1);

        conversations.push({
          ...conv,
          memberUsers,
          latestMessage: latestMessage[0] || null,
        });
      }
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
