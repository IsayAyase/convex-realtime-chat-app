"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useSearchUsers, useGetOrCreateConversation, useCreateGroup } from "@/lib/convexHooks";
import { useRouter } from "next/navigation";

interface CreateConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: any;
}

const USERS_LIMIT = 15;

export function CreateConversationDialog({ open, onOpenChange, currentUser }: CreateConversationDialogProps) {
  const [userSearch, setUserSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showGroupNameDialog, setShowGroupNameDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  
  const [userCursor, setUserCursor] = useState<number | undefined>(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);

  const usersData = useSearchUsers(userSearch, userCursor, USERS_LIMIT);
  const getOrCreateConversation = useGetOrCreateConversation();
  const createGroup = useCreateGroup();
  const router = useRouter();

  const users = usersData?.users || [];
  const nextUserCursor = usersData?.nextCursor;

  const filteredUsers = users.filter((u: any) => u._id !== currentUser?._id);
  const selfUser = currentUser;

  const handleUserToggle = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const loadMoreUsers = () => {
    if (nextUserCursor !== null && nextUserCursor !== undefined) {
      setUserCursor(nextUserCursor);
    } else {
      setHasMoreUsers(false);
    }
  };

  const handleCreate = async () => {
    if (selectedMembers.length === 0 || !currentUser?._id) return;

    if (selectedMembers.length === 1) {
      const convId = await getOrCreateConversation({
        currentUserId: currentUser._id as any,
        otherUserId: selectedMembers[0] as any,
      });
      onOpenChange(false);
      setSelectedMembers([]);
      setUserSearch("");
      router.push(`/conversation/${convId}`);
    } else {
      setShowGroupNameDialog(true);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1 || !currentUser?._id) return;

    const uniqueMembers = [...new Set([currentUser._id, ...selectedMembers])];

    const convId = await createGroup({
      currentUserId: currentUser._id as any,
      memberIds: uniqueMembers as any,
      groupName,
    });

    onOpenChange(false);
    setShowGroupNameDialog(false);
    setSelectedMembers([]);
    setUserSearch("");
    setGroupName("");
    router.push(`/conversation/${convId}`);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const threshold = 12;
    const position = target.scrollTop + target.clientHeight;
    const height = target.scrollHeight;

    if (position >= height - threshold && hasMoreUsers && !userSearch) {
      loadMoreUsers();
    }
  };

  const isLoadingUsers = usersData === undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Input 
              placeholder="Search users..." 
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setUserCursor(0);
                setHasMoreUsers(true);
              }}
              className="mb-4"
            />
            
            <ScrollArea 
              className="h-64"
              onScroll={handleScroll}
            >
              {isLoadingUsers ? (
                <div className="flex justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : filteredUsers.length === 0 && !selfUser ? (
                <p className="text-center text-muted-foreground py-4">
                  {userSearch ? "No users found" : "No users available"}
                </p>
              ) : (
                <>
                  {selfUser && (
                    <div
                      onClick={() => handleUserToggle(selfUser._id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent mb-2 ${
                        selectedMembers.includes(selfUser._id) ? "bg-secondary" : ""
                      }`}
                    >
                      <Checkbox 
                        checked={selectedMembers.includes(selfUser._id)}
                        onCheckedChange={() => handleUserToggle(selfUser._id)}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={selfUser.avatar} />
                        <AvatarFallback className="text-xs">{selfUser.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{selfUser.name} (You)</p>
                        <p className="text-xs text-muted-foreground">{selfUser.email}</p>
                      </div>
                    </div>
                  )}
                  {filteredUsers.map((user: any) => (
                    <div
                      key={user._id}
                      onClick={() => handleUserToggle(user._id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent ${
                        selectedMembers.includes(user._id) ? "bg-secondary" : ""
                      }`}
                    >
                      <Checkbox 
                        checked={selectedMembers.includes(user._id)}
                        onCheckedChange={() => handleUserToggle(user._id)}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-xs">{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  ))}
                  {hasMoreUsers && !userSearch && (
                    <div className="p-2 flex justify-center">
                      <Button variant="ghost" size="sm" onClick={loadMoreUsers}>
                        Load more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </ScrollArea>

            <p className="text-sm text-muted-foreground mt-2">
                {selectedMembers.length} selected {selectedMembers.length >= 2 && "(group)"}
              </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={selectedMembers.length === 0}
            >
              {selectedMembers.length === 1 ? "Start Chat" : selectedMembers.length >= 2 ? "Start Group" : "Select"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGroupNameDialog} onOpenChange={setShowGroupNameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Input 
              placeholder="Group name" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-2">
              {selectedMembers.length} members selected
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupNameDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGroup}
              disabled={!groupName.trim()}
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
