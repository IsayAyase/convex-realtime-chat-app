"use client";

import { useGetMessages, useSendMessage, useGetConversationMembers, useSetTyping, useGetTypingUsers, useAddReaction, useGetReactions, useDeleteMessage, useGetConversation } from "@/lib/convexHooks";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  
  const messages = useGetMessages(conversationId);
  const sendMessage = useSendMessage();
  const setTyping = useSetTyping();
  const typingUsers = useGetTypingUsers(conversationId, currentUserId || "");
  const addReaction = useAddReaction();
  const deleteMessage = useDeleteMessage();
  const members = useGetConversationMembers(conversationId);
  const conversation = useGetConversation(conversationId);
  const { userId: clerkUserId } = useAuth();

  const isLoading = !messages;

  useEffect(() => {
    if (scrollRef.current && messages) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTyping = useCallback(() => {
    if (!currentUserId) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setTyping({
      conversationId: conversationId as any,
      userId: currentUserId as any,
    });
    
    typingTimeoutRef.current = setTimeout(() => {
    }, 3000);
  }, [conversationId, currentUserId, setTyping]);

  const handleSend = () => {
    if (!message.trim() || !currentUserId) return;
    sendMessage({
      conversationId: conversationId as any,
      senderId: currentUserId as any,
      content: message,
    });
    setMessage("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
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
    <div className="flex-1 flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar>
          <AvatarImage src={avatarSrc || undefined} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <h2 className="font-semibold">{chatName}</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4 bg-muted" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : messages?.length === 0 ? (
          <p className="text-muted-foreground text-center">No messages yet</p>
        ) : (
          messages?.map((msg: any) => (
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
          ))
        )}
        {typingText && (
          <p className="text-sm text-muted-foreground italic ml-2">{typingText}</p>
        )}
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
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
  const reactions = useGetReactions(message._id);
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
            isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
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
