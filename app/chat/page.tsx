"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { 
  useGetAllUsers, 
  useGetCurrentUser, 
  useGetOrCreateConversation,
  useGetMessages,
  useSendMessage,
  useGetConversations,
  useCreateGroup
} from "@/lib/convexHooks";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function ChatPage() {
  const { userId, isLoaded } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "users">("chats");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const users = useGetAllUsers();
  const currentUser = useGetCurrentUser(userId || undefined);
  const conversations = useGetConversations(currentUser?._id);
  const getOrCreateConversation = useGetOrCreateConversation();
  const createGroup = useCreateGroup();

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
    const convId = await getOrCreateConversation({
      currentUserId: currentUser._id as any,
      otherUserId: otherUserId as any,
    });
    setSelectedConversationId(convId);
    setActiveTab("chats");
  };

  const handleCreateGroup = async (groupName: string, memberIds: string[]) => {
    if (!currentUser?._id) return;
    await createGroup({
      currentUserId: currentUser._id as any,
      memberIds: memberIds as any,
      groupName,
    });
    setShowCreateGroup(false);
    setActiveTab("chats");
  };

  const getConversationName = (conv: any) => {
    if (conv.type === "group") return conv.name;
    const otherMember = conv.memberUsers?.find((u: any) => u.userId !== userId);
    return otherMember?.name || "Chat";
  };

  const getConversationAvatar = (conv: any) => {
    if (conv.type === "group") return null;
    const otherMember = conv.memberUsers?.find((u: any) => u.userId !== userId);
    return otherMember?.avatar;
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="font-semibold">Chats</h1>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowCreateGroup(true)}
            >
              + Group
            </Button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        <div className="p-4 flex gap-2">
          <Button 
            variant={activeTab === "chats" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setActiveTab("chats")}
            className="flex-1"
          >
            Chats
          </Button>
          <Button 
            variant={activeTab === "users" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setActiveTab("users")}
            className="flex-1"
          >
            Users
          </Button>
        </div>

        {activeTab === "users" && (
          <div className="px-4 pb-2">
            <Input 
              placeholder="Search users..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <ScrollArea className="flex-1">
          {activeTab === "chats" ? (
            conversations?.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations yet. Start a new chat!
              </div>
            ) : (
              conversations?.map((conv: any) => (
                <div
                  key={conv._id}
                  onClick={() => setSelectedConversationId(conv._id)}
                  className={`p-4 hover:bg-gray-100 cursor-pointer flex items-center gap-3 ${
                    selectedConversationId === conv._id ? "bg-gray-200" : ""
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={getConversationAvatar(conv)} />
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
                    <p className="text-sm text-gray-500 truncate">
                      {conv.latestMessage?.content || "No messages yet"}
                    </p>
                  </div>
                </div>
              ))
            )
          ) : (
            filteredUsers.length === 0 ? (
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
            )
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <ChatWindow 
            conversationId={selectedConversationId}
            currentUserId={currentUser?._id}
            currentUserIsAdmin={conversations?.find((c: any) => c._id === selectedConversationId)?.adminUserId === currentUser?._id}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupDialog
          users={users?.filter((u: any) => u.userId !== userId) || []}
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}

function ChatWindow({ 
  conversationId, 
  currentUserId,
  currentUserIsAdmin 
}: { 
  conversationId: string, 
  currentUserId?: string,
  currentUserIsAdmin?: boolean
}) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const messages = useGetMessages(conversationId);
  const sendMessage = useSendMessage();

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

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <h2 className="font-semibold">Chat</h2>
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

function CreateGroupDialog({ 
  users, 
  onClose, 
  onCreate 
}: { 
  users: any[], 
  onClose: () => void, 
  onCreate: (name: string, memberIds: string[]) => void 
}) {
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleSubmit = () => {
    if (groupName.trim() && selectedMembers.length > 0) {
      onCreate(groupName, selectedMembers);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Create Group</h2>
        
        <Input
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="mb-4"
        />

        <p className="text-sm text-gray-500 mb-2">Select members:</p>
        
        <ScrollArea className="flex-1 mb-4">
          {users.map((user: any) => (
            <div
              key={user._id}
              onClick={() => {
                setSelectedMembers(
                  selectedMembers.includes(user._id)
                    ? selectedMembers.filter(id => id !== user._id)
                    : [...selectedMembers, user._id]
                );
              }}
              className={`p-2 cursor-pointer flex items-center gap-2 rounded ${
                selectedMembers.includes(user._id) ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
            >
              <input 
                type="checkbox" 
                checked={selectedMembers.includes(user._id)}
                onChange={() => {}}
              />
              <Avatar className="w-6 h-6">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-xs">{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.name}</span>
            </div>
          ))}
        </ScrollArea>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={!groupName.trim() || selectedMembers.length === 0}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
