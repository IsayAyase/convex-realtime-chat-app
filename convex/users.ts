import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentClerkUserId, getCurrentUser } from "./utils";

export const getCurrentUserQuery = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
      .first();
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return [];
    
    return await ctx.db.query("users").collect();
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const createOrGetUser = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId || clerkUserId !== args.userId) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      return existing;
    }

    return await ctx.db.insert("users", {
      userId: args.userId,
      email: args.email,
      name: args.name,
      avatar: args.avatar,
    });
  },
});

export const updateUserByClerkId = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId || clerkUserId !== args.clerkUserId) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.clerkUserId))
      .first();

    if (!existing) return null;

    await ctx.db.patch(existing._id, {
      ...(args.name && { name: args.name }),
      ...(args.avatar && { avatar: args.avatar }),
    });
    return existing;
  },
});

export const searchUsers = query({
  args: { 
    search: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return { users: [], nextCursor: null };
    
    const allUsers = await ctx.db.query("users").collect();
    
    let filteredUsers = allUsers;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filteredUsers = allUsers.filter((u) => 
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }

    const limit = args.limit || 15;
    const cursor = args.cursor || 0;
    const paginatedUsers = filteredUsers.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < filteredUsers.length ? cursor + limit : null;

    return { users: paginatedUsers, nextCursor };
  },
});
