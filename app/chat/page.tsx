"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { 
  useGetAllUsers, 
  useGetCurrentUser, 
  useGetOrCreateConversation,
  useGetMessages,
  useSendMessage,
  useGetConversationMembers
} from "@/lib/convexHooks";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatPage() {
  const { userId, isLoaded } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const users = useGetAllUsers();
  const currentUser = useGetCurrentUser(userId || undefined);
  const getOrCreateConversation = useGetOrCreateConversation();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Please sign in to continue</p>
      </div>
    );
  }

  const filteredUsers = users?.filter((u: any) => 
    u.userId !== userId && 
    u.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleUserClick = async (otherUserId: string) => {
    if (!currentUser?._id) return;
    setSelectedUserId(otherUserId);
    const convId = await getOrCreateConversation({
      currentUserId: currentUser._id as any,
      otherUserId: otherUserId as any,
    });
    setConversationId(convId);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - User List */}
      <div className="w-80 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="font-semibold">Chats</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
        
        <div className="p-4">
          <Input 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="flex-1">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {search ? "No users found" : "No other users yet"}
            </div>
          ) : (
            filteredUsers.map((u: any) => (
              <div
                key={u._id}
                onClick={() => handleUserClick(u._id)}
                className="p-4 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
              >
                <Avatar>
                  <AvatarImage src={u.avatar} />
                  <AvatarFallback>{u.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {conversationId ? (
          <ChatWindow 
            conversationId={conversationId}
            currentUserId={currentUser?._id} 
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

function ChatWindow({ conversationId, currentUserId }: { conversationId: string, currentUserId?: string }) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const messages = useGetMessages(conversationId);
  const sendMessage = useSendMessage();
  const otherUser = useGetConversationMembers(conversationId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !currentUserId) return;
    sendMessage({
      conversationId: conversationId as any,
      senderId: currentUserId as any,
      content: message,
    });
    setMessage("");
  };

  const otherUserData = otherUser?.find((u: any) => u._id !== currentUserId);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar>
          <AvatarImage src={otherUserData?.avatar} />
          <AvatarFallback>{otherUserData?.name?.charAt(0) || "?"}</AvatarFallback>
        </Avatar>
        <h2 className="font-semibold">{otherUserData?.name || "Chat"}</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages?.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet</p>
        ) : (
          messages?.map((msg: any) => (
            <div
              key={msg._id}
              className={`mb-2 ${msg.senderId === currentUserId ? 'text-right' : 'text-left'}`}
            >
              <div className={`inline-block px-4 py-2 rounded-lg ${
                msg.senderId === currentUserId ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}>
                <p>{msg.content}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </ScrollArea>

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
