import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  conversations: defineTable({
    type: v.union(v.literal("direct"), v.literal("group")),
    name: v.optional(v.string()),
    adminUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_updatedAt", ["updatedAt"]),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    joinedAt: v.number(),
  }).index("by_conversation", ["conversationId"])
   .index("by_user", ["userId"])
   .index("by_conversation_user", ["conversationId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    deleted: v.boolean(),
    createdAt: v.number(),
    status: v.optional(v.union(v.literal("sent"), v.literal("delivered"), v.literal("read"))),
  }).index("by_conversation", ["conversationId"])
   .index("by_createdAt", ["createdAt"]),

  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  }).index("by_message", ["messageId"])
   .index("by_user_message", ["userId", "messageId"]),

  unread: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    count: v.number(),
  }).index("by_conversation_user", ["conversationId", "userId"]),

  typing: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    expiresAt: v.number(),
  }).index("by_conversation_user", ["conversationId", "userId"]),

  presence: defineTable({
    userId: v.id("users"),
    online: v.boolean(),
    lastSeen: v.number(),
  }).index("by_user", ["userId"])
   .index("by_online", ["online"]),
});
