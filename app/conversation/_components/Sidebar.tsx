"use client";

import { LoadingSpinner } from "@/components/loading";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetConversations } from "@/lib/convexHooks";
import { UserButton } from "@clerk/nextjs";
import { MessageSquarePlus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CreateConversationDialog } from "./CreateConversationDialog";

interface SidebarProps {
  userId: string;
  currentUser: any;
}

const CONVERSATIONS_LIMIT = 15;

interface ConversationItemProps {
  conversation: any;
  currentUserId: string;
  isActive: boolean;
}

function formatMessageTime(timestamp: number): string {
  const msgDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDay = msgDate.toDateString();
  const todayDay = today.toDateString();
  const yesterdayDay = yesterday.toDateString();

  if (msgDay === todayDay) {
    return msgDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (msgDay === yesterdayDay) {
    return "Yesterday";
  }

  return msgDate.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationItem({
  conversation,
  currentUserId,
  isActive,
}: ConversationItemProps) {
  const getConversationName = () => {
    if (conversation.type === "group") return conversation.name;
    const otherMember = conversation.memberUsers?.find(
      (u: any) => u.userId !== currentUserId,
    );
    if (otherMember) return otherMember.name;
    const selfMember = conversation.memberUsers?.find(
      (u: any) => u.userId === currentUserId,
    );
    if (selfMember) return `${selfMember.name} (You)`;
    return "Chat";
  };

  const getConversationAvatar = () => {
    if (conversation.type === "group") return null;
    const otherMember = conversation.memberUsers?.find(
      (u: any) => u.userId !== currentUserId,
    );
    if (otherMember) return otherMember.avatar;
    const selfMember = conversation.memberUsers?.find(
      (u: any) => u.userId === currentUserId,
    );
    return selfMember?.avatar;
  };

  return (
    <Link
      key={conversation._id}
      href={`/conversation/${conversation._id}`}
      className={`px-4 py-2 hover:bg-accent cursor-pointer flex items-center gap-3 ${
        isActive ? "bg-muted/50" : ""
      }`}
    >
      <div className="relative">
        <Avatar>
          <AvatarImage src={getConversationAvatar() || undefined} />
          <AvatarFallback>
            {getConversationName()?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        {conversation.type === "group" && (
          <span className="absolute bottom-0 right-0 bg-foreground rounded-full p-0.5">
            <Users className="size-2.5 text-background" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium truncate max-w-60">
            {getConversationName()}
          </p>
          {conversation.latestMessage?.createdAt && (
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {formatMessageTime(conversation.latestMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate max-w-60">
            {conversation.latestMessage?.content || "No messages yet"}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="shrink-0 ml-2 bg-primary text-primary-foreground text-xs font-medium rounded-full min-w-5 h-5 flex items-center justify-center px-1.5">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function Sidebar({ userId, currentUser }: SidebarProps) {
  const [conversationSearch, setConversationSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [conversationCursor, setConversationCursor] = useState<
    number | undefined
  >(0);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);

  const conversationsData = useGetConversations(
    currentUser?._id,
    conversationCursor,
    CONVERSATIONS_LIMIT,
  );
  const pathname = usePathname();

  const conversations = conversationsData?.conversations || [];
  const nextConversationCursor = conversationsData?.nextCursor;

  useEffect(() => {
    setConversationCursor(0);
    setHasMoreConversations(true);
  }, [conversationSearch]);

  const loadMoreConversations = useCallback(() => {
    if (
      nextConversationCursor !== null &&
      nextConversationCursor !== undefined
    ) {
      setConversationCursor(nextConversationCursor);
    } else {
      setHasMoreConversations(false);
    }
  }, [nextConversationCursor]);

  const filteredConversations =
    conversations?.filter((conv: any) => {
      const name =
        conv.type === "group"
          ? conv.name
          : conv.memberUsers?.find((u: any) => u.userId !== userId)?.name || "";
      return name.toLowerCase().includes(conversationSearch.toLowerCase());
    }) || [];

  const isActive = (convId: string) => pathname === `/conversation/${convId}`;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const threshold = 12;
    const position = target.scrollTop + target.clientHeight;
    const height = target.scrollHeight;

    if (
      position >= height - threshold &&
      hasMoreConversations &&
      !conversationSearch
    ) {
      loadMoreConversations();
    }
  };

  const isLoadingConversations = conversationsData === undefined;
  const isConversationPage = pathname !== "/conversation";

  return (
    <div
      className={`${isConversationPage ? "hidden md:block" : "w-full"} md:w-80 border-r flex flex-col h-full relative`}
    >
      <div className="p-4 border-b flex gap-4 items-center justify-between">
        <Link href={"/"}>
          <h1 className="font-semibold text-4xl">Chats</h1>
        </Link>
        <div className="flex gap-4 items-center justify-end">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: {
                  width: "32px",
                  height: "32px",
                },
              },
            }}
          />
          <ModeToggle />
        </div>
      </div>

      <div className="p-4">
        <Input
          placeholder="Search conversations..."
          value={conversationSearch}
          onChange={(e) => setConversationSearch(e.target.value)}
        />
      </div>

      <ScrollArea className="flex-1" onScroll={handleScroll}>
        {isLoadingConversations ? (
          <div className="flex items-center justify-center p-4">
            <LoadingSpinner />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Start a conversation by clicking the message bubble
          </div>
        ) : (
          <>
            {filteredConversations.map((conv: any) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                currentUserId={userId}
                isActive={isActive(conv._id)}
              />
            ))}
            {hasMoreConversations && !conversationSearch && (
              <div className="p-2 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMoreConversations}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </ScrollArea>

      <Button
        className="absolute bottom-4 right-4 w-10 h-10 rounded-full p-0"
        onClick={() => setShowCreateDialog(true)}
      >
        <MessageSquarePlus className="w-5 h-5" />
      </Button>

      <CreateConversationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        currentUser={currentUser}
      />
    </div>
  );
}
