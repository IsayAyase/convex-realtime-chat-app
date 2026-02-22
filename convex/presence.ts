import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentClerkUserId, getCurrentUser } from "./utils";

export const setOnline = mutation({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return;

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return;

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: Date.now(), online: true });
    } else {
      await ctx.db.insert("presence", {
        userId: currentUser._id,
        online: true,
        lastSeen: Date.now(),
      });
    }
  },
});

export const setOffline = mutation({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return;

    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return;

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { online: false, lastSeen: Date.now() });
    }
  },
});

export const getOnlineUsers = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return [];

    const presence = await ctx.db
      .query("presence")
      .withIndex("by_online", (q) => q.eq("online", true))
      .collect();

    return presence.map((p) => p.userId);
  },
});

export const getUserPresence = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return null;

    const presence = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!presence) return { online: false, lastSeen: null };

    return {
      online: presence.online,
      lastSeen: presence.lastSeen,
    };
  },
});
