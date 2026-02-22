"use client";

import { useGetMessages, useSendMessage, useGetConversationMembers, useSetTyping, useGetTypingUsers, useAddReaction, useGetReactions, useDeleteMessage, useGetConversation, useClearTyping } from "@/lib/convexHooks";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/loading";
import { MoreVertical, Smile, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@clerk/nextjs";

interface ChatWindowProps {
  conversationId: string;
  currentUserId?: string;
}

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export function ChatWindow({ conversationId, currentUserId }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [loadedMessages, setLoadedMessages] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingSetRef = useRef(false);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  
  const messageData = useGetMessages(conversationId, cursor ?? undefined, 15);
  
  useEffect(() => {
    if (!messageData) return;
    
    const newMessages = messageData.messages;
    
    setLoadedMessages(prev => {
      const existingIds = new Set(prev.map(m => m._id));
      const uniqueNew = newMessages.filter(m => !existingIds.has(m._id));
      if (uniqueNew.length === 0) return prev;
      
      if (!cursor) {
        return [...prev, ...uniqueNew];
      }
      return [...uniqueNew, ...prev];
    });
  }, [messageData, cursor]);
  
  const messages = loadedMessages;
  const hasMore = !!messageData?.continueCursor;
  const isLoading = !messageData;
  const setTyping = useSetTyping();
  const clearTyping = useClearTyping();
  
  const typingUsers = useGetTypingUsers(conversationId, currentUserId);
  const addReaction = useAddReaction();
  const deleteMessage = useDeleteMessage();
  const members = useGetConversationMembers(conversationId);
  const conversation = useGetConversation(conversationId);
  const { userId: clerkUserId } = useAuth();
  const sendMessage = useSendMessage();

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !hasMore) return;
    
    const { scrollTop } = scrollRef.current;
    
    if (scrollTop < 200 && messageData?.continueCursor) {
      setCursor(messageData.continueCursor);
    }
  }, [hasMore, messageData]);

  useEffect(() => {
    if (!scrollRef.current) return;
    // Only scroll to bottom on initial load, not when loading more
    if (messages.length > 0 && !cursor) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages, cursor]);

  useEffect(() => {
    if (!currentUserId) return;

    if (!message.trim()) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingSetRef.current) {
        isTypingSetRef.current = false;
        clearTyping({ conversationId: conversationId as any, userId: currentUserId as any });
      }
      return;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setTyping({ conversationId: conversationId as any, userId: currentUserId as any });
      isTypingSetRef.current = true;

      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingSetRef.current) {
          isTypingSetRef.current = false;
          clearTyping({ conversationId: conversationId as any, userId: currentUserId as any });
        }
      }, 2000);
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [message, conversationId, currentUserId, setTyping, clearTyping]);

  const handleSend = () => {
    if (!message.trim() || !currentUserId) return;
    
    sendMessage({
      conversationId: conversationId as any,
      senderId: currentUserId as any,
      content: message,
    });
    setMessage("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingSetRef.current) {
      isTypingSetRef.current = false;
      clearTyping({
        conversationId: conversationId as any,
        userId: currentUserId as any,
      });
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!currentUserId) return;
    addReaction({
      messageId: messageId as any,
      userId: currentUserId as any,
      emoji,
    });
  };

  const handleDelete = (messageId: string) => {
    deleteMessage({ messageId: messageId as any });
  };

  const otherUserData = members?.find((u: any) => u._id !== currentUserId);

  const getChatAvatar = () => {
    if (conversation?.type === "group") {
      return null;
    }
    if (otherUserData) return otherUserData?.avatar;
    const selfMember = members?.find((u: any) => u._id === currentUserId);
    return selfMember?.avatar;
  };

  const avatarSrc = getChatAvatar();
  const avatarFallback = conversation?.type === "group" 
    ? conversation.name?.charAt(0) || "G"
    : (otherUserData?.name?.charAt(0) || members?.[0]?.name?.charAt(0) || "?");
  
  const getChatName = () => {
    if (conversation?.type === "group") {
      return conversation.name || "Group Chat";
    }
    if (conversation?.type === "direct") {
      if (otherUserData) return otherUserData.name;
      const selfMember = members?.find((u: any) => u._id === currentUserId);
      if (selfMember) return `${selfMember.name} (You)`;
      if (members && members.length === 1 && members[0]._id === currentUserId) {
        return `${members[0].name} (You)`;
      }
    }
    return "Chat";
  };

  const chatName = getChatName();

  const getTypingText = () => {
    if (!typingUsers || typingUsers.length === 0) return null;
    const names = typingUsers.map((u: any) => u.name);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  };

  const typingText = getTypingText();

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar>
          <AvatarImage src={avatarSrc || undefined} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <h2 className="font-semibold">{chatName}</h2>
      </div>
      
      <div 
        className="flex-1 p-4 bg-muted overflow-auto" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground text-center">No messages yet</p>
        ) : (
          <>
            {messages.map((msg: any) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                currentUserId={currentUserId}
                isHovered={hoveredMessage === msg._id}
                onMouseEnter={() => setHoveredMessage(msg._id)}
                onMouseLeave={() => setHoveredMessage(null)}
                onReaction={handleReaction}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
        {typingText && (
          <p className="text-sm text-muted-foreground italic ml-2">{typingText}</p>
        )}
      </div>

      <div className="p-4 border-t flex gap-2">
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button onClick={handleSend}>Send</Button>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: any;
  currentUserId?: string;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onReaction: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

function MessageBubble({ message, currentUserId, isHovered, onMouseEnter, onMouseLeave, onReaction, onDelete }: MessageBubbleProps) {
  const reactions = message._id.toString().startsWith("temp-") ? undefined : useGetReactions(message._id);
  const isOwn = message.senderId === currentUserId;
  const isDeleted = message.deleted;

  return (
    <div
      className={`mb-2 group ${isOwn ? 'text-right' : 'text-left'}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isDeleted ? (
        <p className="text-muted-foreground text-sm italic">This message was deleted</p>
      ) : (
        <div className={`inline-block relative ${isOwn ? 'text-right' : 'text-left'}`}>
          {isHovered && !isDeleted && (
            <div className={`absolute -top-8 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-background rounded shadow-md p-1`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Smile className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {EMOJI_REACTIONS.map((emoji) => (
                    <DropdownMenuItem key={emoji} onClick={() => onReaction(message._id, emoji)}>
                      {emoji}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {isOwn && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onDelete(message._id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          <div className={`px-4 py-2 rounded-lg ${
            isOwn ? 'bg-primary text-primary-foreground' : 'bg-background'
          }`}>
            <p>{message.content}</p>
          </div>
          {reactions && reactions.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {reactions.map((r: any, idx: number) => (
                <span
                  key={idx}
                  className="text-xs bg-background border rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-accent"
                  onClick={() => onReaction(message._id, r.emoji)}
                >
                  {r.emoji} {r.count}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  );
}
