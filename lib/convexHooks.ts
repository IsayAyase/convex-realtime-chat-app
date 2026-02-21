import { useQuery, useMutation, useConvex as useConvexCore } from "convex/react";
import { api } from "@/convex/_generated/api";

export { useQuery, useMutation, useConvexCore as useConvex };

// User hooks
export function useCreateOrGetUser() {
  return useMutation(api.users.createOrGetUser);
}

export function useUpdateUserByClerkId() {
  return useMutation(api.users.updateUserByClerkId);
}

export function useGetCurrentUser(userId: string | undefined) {
  return useQuery(api.users.getCurrentUser, { userId: userId || undefined });
}

export function useGetAllUsers() {
  return useQuery(api.users.getAllUsers);
}

// Conversation hooks
export function useGetOrCreateConversation() {
  return useMutation(api.conversations.getOrCreateConversation);
}

export function useGetConversations(userId: string | undefined) {
  return useQuery(api.conversations.getConversations, { userId: userId as any });
}

export function useGetConversationMembers(conversationId: string) {
  return useQuery(api.conversations.getConversationMembers, { conversationId: conversationId as any });
}

// Message hooks
export function useGetMessages(conversationId: string) {
  return useQuery(api.messages.getMessages, { conversationId: conversationId as any });
}

export function useSendMessage() {
  return useMutation(api.messages.sendMessage);
}

export function useDeleteMessage() {
  return useMutation(api.messages.deleteMessage);
}

export function useGetLatestMessage(conversationId: string) {
  return useQuery(api.messages.getLatestMessage, { conversationId: conversationId as any });
}

// Reaction hooks
export function useAddReaction() {
  return useMutation(api.reactions.addReaction);
}

export function useGetReactions(messageId: string) {
  return useQuery(api.reactions.getReactions, { messageId: messageId as any });
}

// Typing hooks
export function useSetTyping() {
  return useMutation(api.reactions.setTyping);
}

export function useGetTypingUsers(conversationId: string, excludeUserId: string) {
  return useQuery(api.reactions.getTypingUsers, { 
    conversationId: conversationId as any, 
    excludeUserId: excludeUserId as any 
  });
}
