"use client";

import { LoadingSpinner } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  useAddReaction,
  useClearTyping,
  useDeleteMessage,
  useGetConversation,
  useGetConversationMembers,
  useGetMessages,
  useGetReactions,
  useGetTypingUsers,
  useSendMessage,
  useSetTyping,
} from "@/lib/convexHooks";
import { useAuth } from "@clerk/nextjs";
import { Smile, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ChatWindowProps {
  conversationId: string;
  currentUserId?: string;
}

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

function getDateLabel(timestamp: number): string {
  const msgDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const msgDay = msgDate.toDateString();
  const todayDay = today.toDateString();
  const yesterdayDay = yesterday.toDateString();
  
  if (msgDay === todayDay) return "Today";
  if (msgDay === yesterdayDay) return "Yesterday";
  
  return msgDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function DateSeparator({ date }: { date: number }) {
  return (
    <div className="flex justify-center my-4">
      <span className="bg-background text-xs px-3 py-1 rounded-full text-muted-foreground shadow-sm">
        {getDateLabel(date)}
      </span>
    </div>
  );
}

export function ChatWindow({ conversationId, currentUserId }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [loadedMessages, setLoadedMessages] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingShownRef = useRef(false);
  const isTypingSetRef = useRef(false);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);

  const messageData = useGetMessages(conversationId, cursor ?? undefined, 15);

  useEffect(() => {
    if (!messageData) return;

    const newMessages = messageData.messages;

    setLoadedMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m._id));
      const uniqueNew = newMessages.filter((m) => !existingIds.has(m._id));
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
      typingShownRef.current = false;
      if (isTypingSetRef.current) {
        isTypingSetRef.current = false;
        clearTyping({
          conversationId: conversationId as any,
          userId: currentUserId as any,
        });
      }
      return;
    }

    if (!typingShownRef.current) {
      typingShownRef.current = true;
      typingTimeoutRef.current = setTimeout(() => {
        setTyping({
          conversationId: conversationId as any,
          userId: currentUserId as any,
        });
        isTypingSetRef.current = true;
      }, 1000);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingSetRef.current) {
        isTypingSetRef.current = false;
        clearTyping({
          conversationId: conversationId as any,
          userId: currentUserId as any,
        });
      }
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
  const avatarFallback =
    conversation?.type === "group"
      ? conversation.name?.charAt(0) || "G"
      : otherUserData?.name?.charAt(0) || members?.[0]?.name?.charAt(0) || "?";

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
            {messages.reduce((acc: React.ReactNode[], msg: any, index: number) => {
              const msgDate = new Date(msg.createdAt).toDateString();
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const prevDate = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
              
              if (!prevDate || msgDate !== prevDate) {
                acc.push(
                  <DateSeparator key={`date-${msg._id}`} date={msg.createdAt} />
                );
              }
              
              acc.push(
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
              );
              
              return acc;
            }, [])}
          </>
        )}
        {typingText && <TypingMessageBubble />}
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

function MessageBubble({
  message,
  currentUserId,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onReaction,
  onDelete,
}: MessageBubbleProps) {
  const reactions = message._id.toString().startsWith("temp-")
    ? undefined
    : useGetReactions(message._id);
  const isOwn = message.senderId === currentUserId;
  const isDeleted = message.deleted;

  return (
    <div
      className={`mb-2 group ${isOwn ? "text-right" : "text-left"}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isDeleted ? (
        <p className="text-muted-foreground text-sm italic">
          This message was deleted
        </p>
      ) : (
        <div
          className={`inline-block relative max-w-[80%] md:max-w-[70%] lg:max-w-md ${isOwn ? "text-right" : "text-left"}`}
        >
          {isHovered && !isDeleted && (
            <div
              className={`absolute -top-8 ${isOwn ? "right-0" : "left-0"} flex gap-1 bg-background rounded shadow-md p-1`}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Smile className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {EMOJI_REACTIONS.map((emoji) => (
                    <DropdownMenuItem
                      key={emoji}
                      onClick={() => onReaction(message._id, emoji)}
                    >
                      {emoji}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {isOwn && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onDelete(message._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          <div
            className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
          >
            <div
              className={`px-3 py-1 rounded-sm w-full ${
                isOwn ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p
                className={`text-[10px] text-end ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}
              >
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
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
          </div>
        </div>
      )}
    </div>
  );
}

function TypingMessageBubble() {
  return (
    <div className="mb-2 text-left">
      <div className="inline-block px-2 py-1 rounded-lg bg-background">
        <div className="flex gap-1 h-8 items-center">
          <span
            className="size-1.5 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></span>
          <span
            className="size-1.5 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></span>
          <span
            className="size-1.5 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></span>
        </div>
      </div>
    </div>
  );
}
