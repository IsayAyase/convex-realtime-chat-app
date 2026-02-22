"use client";

import { LoadingSpinner } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Smile, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

  return msgDate.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ChatWindow({ conversationId, currentUserId }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  // Stores only the older (paginated) messages loaded via cursor
  const [olderMessages, setOlderMessages] = useState<any[]>([]);
  // The cursor used to fetch the next (older) page
  const [cursor, setCursor] = useState<string | null>(null);
  // The cursor to use for the next load (tracks the last continueCursor from olderData)
  const [olderContinueCursor, setOlderContinueCursor] = useState<string | null>(
    null,
  );
  // Tracks whether we've exhausted all older messages (no more to load)
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  // Prevents duplicate scroll triggers while a page is loading
  const [loadingMore, setLoadingMore] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingShownRef = useRef(false);
  const isTypingSetRef = useRef(false);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [openActionMessage, setOpenActionMessage] = useState<string | null>(
    null,
  );
  // Track whether this is the very first load so we can auto-scroll to bottom once
  const initialScrollDoneRef = useRef(false);

  // --- LIVE QUERY (no cursor) -----------------------------------------------
  // This query is always reactive. Convex will push real-time updates here
  // whenever a message is sent or deleted, because it never has a cursor.
  const liveData = useGetMessages(conversationId, undefined, 20);

  // --- PAGINATED QUERY (older pages) ---------------------------------------
  // Only active when the user scrolls up and we have a cursor to fetch.
  const olderData = useGetMessages(conversationId, cursor ?? undefined, 20);

  // --- MERGE OLDER PAGES ---------------------------------------------------
  // When olderData arrives (i.e., user scrolled up and cursor was set),
  // prepend the fetched messages to olderMessages, deduplicating by ID.
  useEffect(() => {
    if (!cursor || !olderData) return;

    setOlderMessages((prev) => {
      const existingIds = new Set(prev.map((m: any) => m._id));
      const uniqueNew = olderData.messages.filter(
        (m: any) => !existingIds.has(m._id),
      );
      if (uniqueNew.length === 0) return prev;
      // Prepend so older messages appear at the top
      return [...uniqueNew, ...prev];
    });

    // Update the cursor for the next batch of older messages
    if (olderData.continueCursor) {
      setOlderContinueCursor(olderData.continueCursor);
    } else {
      // No more older messages to load
      setOlderContinueCursor(null);
      setHasMoreOlder(false);
    }

    setCursor(null);
    setLoadingMore(false);
  }, [olderData, cursor]);

  // --- COMBINE: older pages + live page ------------------------------------
  // The live query already contains the most recent 20 messages reactively.
  // We deduplicate against it so boundary messages aren't shown twice.
  const allMessages = useMemo(() => {
    if (!liveData) return olderMessages;
    const liveIds = new Set(liveData.messages.map((m: any) => m._id));
    const dedupedOlder = olderMessages.filter((m: any) => !liveIds.has(m._id));
    return [...dedupedOlder, ...liveData.messages];
  }, [olderMessages, liveData]);

  const isLoading = !liveData;

  const setTyping = useSetTyping();
  const clearTyping = useClearTyping();
  const typingUsers = useGetTypingUsers(conversationId, currentUserId);
  const addReaction = useAddReaction();
  const deleteMessage = useDeleteMessage();
  const members = useGetConversationMembers(conversationId);
  const conversation = useGetConversation(conversationId);
  const sendMessage = useSendMessage();

  // --- SCROLL TO BOTTOM ON INITIAL LOAD ------------------------------------
  useEffect(() => {
    if (
      !initialScrollDoneRef.current &&
      allMessages.length > 0 &&
      scrollRef.current
    ) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          initialScrollDoneRef.current = true;
        }
      });
    }
  }, [allMessages]);

  // --- SCROLL TO BOTTOM WHEN A NEW MESSAGE ARRIVES (live) ------------------
  // We detect "new" messages by watching liveData. If the user is near the
  // bottom we scroll down; if they've scrolled up we leave them alone.
  const prevLiveLengthRef = useRef(0);
  useEffect(() => {
    if (!liveData) return;
    const newLength = liveData.messages.length;
    const prevLength = prevLiveLengthRef.current;

    if (
      newLength > prevLength &&
      scrollRef.current &&
      initialScrollDoneRef.current
    ) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Auto-scroll only if user is within 200px of the bottom
      if (distanceFromBottom < 200) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    }

    prevLiveLengthRef.current = newLength;
  }, [liveData]);

  // --- INFINITE SCROLL HANDLER ----------------------------------------------
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loadingMore) return;

    const { scrollTop } = scrollRef.current;

    // Use olderContinueCursor if we have one and there are more, otherwise use liveData's cursor
    const nextCursor = hasMoreOlder
      ? (olderContinueCursor ?? liveData?.continueCursor)
      : null;

    if (scrollTop < 300 && nextCursor) {
      setLoadingMore(true);
      setCursor(nextCursor);
    }
  }, [hasMoreOlder, loadingMore, liveData, olderContinueCursor]);

  // --- TYPING INDICATORS --------------------------------------------------
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
      setTyping({
        conversationId: conversationId as any,
        userId: currentUserId as any,
      });
      isTypingSetRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingSetRef.current) {
        isTypingSetRef.current = false;
        typingShownRef.current = false;
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

  // --- SEND MESSAGE ---------------------------------------------------------
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
      typingShownRef.current = false;
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

  // --- HEADER METADATA ------------------------------------------------------
  const otherUserData = members?.find((u: any) => u._id !== currentUserId);

  const getChatAvatar = () => {
    if (conversation?.type === "group") return null;
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
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar>
          <AvatarImage src={avatarSrc || undefined} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <h2 className="font-semibold">{chatName}</h2>
      </div>

      {/* Message list */}
      <div
        className="flex-1 p-4 bg-muted overflow-auto"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : allMessages.length === 0 ? (
          <p className="text-muted-foreground text-center">No messages yet</p>
        ) : (
          <>
            {loadingMore && (
              <div className="flex justify-center my-2">
                <LoadingSpinner />
              </div>
            )}

            {allMessages.reduce(
              (acc: React.ReactNode[], msg: any, index: number) => {
                const msgDate = new Date(msg.createdAt).toDateString();
                const prevMsg = index > 0 ? allMessages[index - 1] : null;
                const prevDate = prevMsg
                  ? new Date(prevMsg.createdAt).toDateString()
                  : null;

                if (!prevDate || msgDate !== prevDate) {
                  acc.push(
                    <DateSeparator
                      key={`date-${msg._id}`}
                      date={msg.createdAt}
                    />,
                  );
                }

                acc.push(
                  <MessageBubble
                    key={msg._id}
                    message={msg}
                    currentUserId={currentUserId}
                    isHovered={hoveredMessage === msg._id}
                    isActionOpen={openActionMessage === msg._id}
                    onMouseEnter={() => {
                      setHoveredMessage(msg._id);
                      setOpenActionMessage(null);
                    }}
                    onMouseLeave={() => setHoveredMessage(null)}
                    onOpenAction={() => setOpenActionMessage(msg._id)}
                    onCloseAction={() => setOpenActionMessage(null)}
                    onReaction={handleReaction}
                    onDelete={handleDelete}
                  />,
                );

                return acc;
              },
              [],
            )}
          </>
        )}

        {typingText && <TypingMessageBubble />}
      </div>

      {/* Input area */}
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

function DateSeparator({ date }: { date: number }) {
  return (
    <div className="flex justify-center my-4">
      <span className="bg-background text-xs px-3 py-1 rounded-full text-muted-foreground shadow-sm">
        {getDateLabel(date)}
      </span>
    </div>
  );
}

interface MessageBubbleProps {
  message: any;
  currentUserId?: string;
  isHovered: boolean;
  isActionOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onOpenAction: () => void;
  onCloseAction: () => void;
  onReaction: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

function MessageBubble({
  message,
  currentUserId,
  isHovered,
  isActionOpen,
  onMouseEnter,
  onMouseLeave,
  onOpenAction,
  onCloseAction,
  onReaction,
  onDelete,
}: MessageBubbleProps) {
  const [isActionBarHovered, setIsActionBarHovered] = useState(false);

  const reactions = message._id.toString().startsWith("temp-")
    ? undefined
    : useGetReactions(message._id);

  const isOwn = message.senderId === currentUserId;
  const isDeleted = message.deleted;

  const currentUserReaction = useMemo(() => {
    if (!reactions || !currentUserId) return undefined;
    const found = reactions.find((r: any) => r.userIds.includes(currentUserId));
    return found?.emoji;
  }, [reactions, currentUserId]);

  const showActions =
    (isHovered || isActionOpen || isActionBarHovered) && !isDeleted;

  return (
    <div
      className={`mb-2 group relative ${isOwn ? "text-right" : "text-left"}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={`relative inline-block max-w-[80%] md:max-w-[70%] lg:max-w-md ${
          isOwn ? "text-right" : "text-left"
        }`}
      >
        {/* Hover action bar (reactions + delete) */}
        {showActions && (
          <div
            className={`absolute top-0 ${
              isOwn ? "right-full" : "left-full"
            } flex gap-1 bg-background rounded-sm shadow-md p-1 mx-1 z-10`}
            onMouseEnter={() => setIsActionBarHovered(true)}
            onMouseLeave={() => setIsActionBarHovered(false)}
          >
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onOpenAction()}
              >
                <Smile className="h-4 w-4" />
              </Button>
              <ReactionPicker
                isOpen={isActionOpen}
                isOwn={isOwn}
                currentUserReaction={currentUserReaction}
                onOpenChange={(open) => !open && onCloseAction()}
                onSelect={(emoji) => onReaction(message._id, emoji)}
              />
            </div>

            {isOwn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onDelete(message._id)}
              >
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
          <div
            className={`px-3 py-1 rounded-sm w-full ${
              isOwn ? "bg-primary text-primary-foreground" : "bg-background"
            }`}
          >
            {isDeleted ? (
              <p
                className={`text-sm italic ${
                  isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                This message was deleted
              </p>
            ) : (
              <>
                <p className="text-sm">{message.content}</p>
                <p
                  className={`text-[10px] text-end ${
                    isOwn
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </>
            )}
          </div>

          {/* Reaction pills */}
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
    </div>
  );
}

interface ReactionPickerProps {
  isOpen: boolean;
  isOwn: boolean;
  currentUserReaction: string | undefined;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
}

function ReactionPicker({
  isOpen,
  isOwn,
  currentUserReaction,
  onOpenChange,
  onSelect,
}: ReactionPickerProps) {
  if (!isOpen) return null;

  return (
    <div
      className={`absolute top-full ${isOwn ? "right-0" : "left-0"} mt-2 bg-background rounded-full shadow-lg p-1 flex gap-1 z-20`}
    >
      {EMOJI_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          className={`w-7 h-7 flex items-center justify-center rounded-full text-lg transition-colors ${
            currentUserReaction === emoji ? "bg-primary/20" : "hover:bg-accent"
          }`}
          onClick={() => {
            onSelect(emoji);
            onOpenChange(false);
          }}
        >
          {emoji}
        </button>
      ))}
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
          />
          <span
            className="size-1.5 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="size-1.5 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}
