"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { 
  useGetCurrentUser, 
  useGetConversations
} from "@/lib/convexHooks";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/loading";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreateConversationDialog } from "./CreateConversationDialog";

interface SidebarProps {
  userId: string;
  currentUser: any;
}

const CONVERSATIONS_LIMIT = 15;

export function Sidebar({ userId, currentUser }: SidebarProps) {
  const [conversationSearch, setConversationSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [conversationCursor, setConversationCursor] = useState<number | undefined>(0);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);

  const conversationsData = useGetConversations(currentUser?._id, conversationCursor, CONVERSATIONS_LIMIT);
  const pathname = usePathname();

  const conversations = conversationsData?.conversations || [];
  const nextConversationCursor = conversationsData?.nextCursor;

  useEffect(() => {
    setConversationCursor(0);
    setHasMoreConversations(true);
  }, [conversationSearch]);

  const loadMoreConversations = useCallback(() => {
    if (nextConversationCursor !== null && nextConversationCursor !== undefined) {
      setConversationCursor(nextConversationCursor);
    } else {
      setHasMoreConversations(false);
    }
  }, [nextConversationCursor]);

  const filteredConversations = conversations?.filter((conv: any) => {
    const name = conv.type === "group" 
      ? conv.name 
      : conv.memberUsers?.find((u: any) => u.userId !== userId)?.name || "";
    return name.toLowerCase().includes(conversationSearch.toLowerCase());
  }) || [];

  const getConversationName = (conv: any) => {
    if (conv.type === "group") return conv.name;
    const otherMember = conv.memberUsers?.find((u: any) => u.userId !== userId);
    if (otherMember) return otherMember.name;
    const selfMember = conv.memberUsers?.find((u: any) => u.userId === userId);
    if (selfMember) return `${selfMember.name} (You)`;
    return "Chat";
  };

  const getConversationAvatar = (conv: any) => {
    if (conv.type === "group") return null;
    const otherMember = conv.memberUsers?.find((u: any) => u.userId !== userId);
    if (otherMember) return otherMember.avatar;
    const selfMember = conv.memberUsers?.find((u: any) => u.userId === userId);
    return selfMember?.avatar;
  };

  const isActive = (convId: string) => pathname === `/conversation/${convId}`;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const threshold = 12;
    const position = target.scrollTop + target.clientHeight;
    const height = target.scrollHeight;

    if (position >= height - threshold && hasMoreConversations && !conversationSearch) {
      loadMoreConversations();
    }
  };

  const isLoadingConversations = conversationsData === undefined;

  return (
    <div className="w-80 border-r flex flex-col h-full relative">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="font-semibold">Chats</h1>
        <UserButton afterSignOutUrl="/" />
      </div>

      <div className="p-4">
        <Input 
          placeholder="Search conversations..." 
          value={conversationSearch}
          onChange={(e) => setConversationSearch(e.target.value)}
        />
      </div>

      <ScrollArea 
        className="flex-1"
        onScroll={handleScroll}
      >
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
              <Link
                key={conv._id}
                href={`/conversation/${conv._id}`}
                className={`p-4 hover:bg-accent cursor-pointer flex items-center gap-3 ${
                  isActive(conv._id) ? "bg-accent" : ""
                }`}
              >
                <Avatar>
                  <AvatarImage src={getConversationAvatar(conv) || undefined} />
                  <AvatarFallback>
                    {getConversationName(conv)?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">
                      {getConversationName(conv)}
                    </p>
                    {conv.type === "group" && (
                      <Badge variant="secondary">Group</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.latestMessage?.content || "No messages yet"}
                  </p>
                </div>
              </Link>
            ))}
            {hasMoreConversations && !conversationSearch && (
              <div className="p-2 flex justify-center">
                <Button variant="ghost" size="sm" onClick={loadMoreConversations}>
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
        <MessageCircle className="w-5 h-5" />
      </Button>

      <CreateConversationDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        currentUser={currentUser}
      />
    </div>
  );
}
