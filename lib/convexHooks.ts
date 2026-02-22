import { useQuery, useMutation, useConvex as useConvexCore } from "convex/react";
import { useState, useEffect } from "react";
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
  return useQuery(api.users.getCurrentUserQuery, { userId: userId || undefined });
}

export function useSearchUsers(search?: string, cursor?: number, limit?: number) {
  return useQuery(api.users.searchUsers, { search: search || undefined, cursor, limit });
}

// Conversation hooks
export function useGetOrCreateConversation() {
  return useMutation(api.conversations.getOrCreateConversation);
}

export function useCreateGroup() {
  return useMutation(api.conversations.createGroup);
}

export function useAddGroupMembers() {
  return useMutation(api.conversations.addGroupMembers);
}

export function useRemoveGroupMember() {
  return useMutation(api.conversations.removeGroupMember);
}

export function useDeleteGroup() {
  return useMutation(api.conversations.deleteGroup);
}

export function useGetConversations(userId: string | undefined, cursor?: number, limit?: number) {
  return useQuery(api.conversations.getConversations, { 
    userId: userId as any, 
    cursor, 
    limit 
  });
}

export function useGetConversationMembers(conversationId: string) {
  return useQuery(api.conversations.getConversationMembers, { conversationId: conversationId as any });
}

// Message hooks
export function useGetMessages(conversationId: string, cursor?: string, limit?: number) {
  return useQuery(api.messages.getMessages, { 
    conversationId: conversationId as any,
    cursor,
    limit 
  });
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

export function useClearTyping() {
  return useMutation(api.reactions.clearTyping);
}

export function useGetTypingUsers(conversationId: string, excludeUserId?: string) {
  const [pollKey, setPollKey] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPollKey(p => p + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return useQuery(api.reactions.getTypingUsers, { 
    conversationId: conversationId as any, 
    excludeUserId: (excludeUserId || undefined) as any 
  });
}

export function useGetConversation(conversationId: string) {
  return useQuery(api.conversations.getConversation, { conversationId: conversationId as any });
}

// Presence hooks
export function useSetOnline() {
  return useMutation(api.presence.setOnline);
}

export function useSetOffline() {
  return useMutation(api.presence.setOffline);
}

export function useGetUserPresence(userId: string | undefined) {
  return useQuery(api.presence.getUserPresence, { userId: (userId || undefined) as any });
}
