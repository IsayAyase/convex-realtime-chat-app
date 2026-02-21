import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCurrentUser = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    return await ctx.db
      .query("users")
      .filter((q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
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
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq("userId", args.userId))
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
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq("userId", args.clerkUserId))
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
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    if (!args.search) return allUsers;
    
    const searchLower = args.search.toLowerCase();
    return allUsers.filter((u) => 
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    );
  },
});
