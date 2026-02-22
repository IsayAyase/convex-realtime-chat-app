"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/loading";
import { useGetConversationMembers, useAddGroupMembers, useRemoveGroupMember, useGetConversation, useSearchUsers } from "@/lib/convexHooks";
import { UserPlus, X } from "lucide-react";

interface GroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentUserId?: string;
  mode: "view" | "add" | "remove";
}

export function GroupMembersDialog({
  open,
  onOpenChange,
  conversationId,
  currentUserId,
  mode,
}: GroupMembersDialogProps) {
  const [userSearch, setUserSearch] = useState("");
  const [userCursor, setUserCursor] = useState<number | undefined>(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);

  const members = useGetConversationMembers(conversationId);
  const conversation = useGetConversation(conversationId);
  const addMembers = useAddGroupMembers();
  const removeMember = useRemoveGroupMember();
  
  const usersData = useSearchUsers(userSearch, userCursor, 15);

  const isAdmin = conversation?.adminUserId === currentUserId;

  const currentMemberIds = members?.map((m: any) => m._id) || [];
  const users = usersData?.users || [];
  const nextUserCursor = usersData?.nextCursor;
  
  const availableUsers = users.filter((u: any) => !currentMemberIds.includes(u._id));

  const handleAddMember = async (userId: string) => {
    await addMembers({ conversationId: conversationId as any, memberIds: [userId as any] });
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMember({ conversationId: conversationId as any, memberId: userId as any });
  };

  const otherMembers = members?.filter((m: any) => m._id !== currentUserId) || [];

  const loadMoreUsers = () => {
    if (nextUserCursor !== null && nextUserCursor !== undefined) {
      setUserCursor(nextUserCursor);
    } else {
      setHasMoreUsers(false);
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "view" && "Group Members"}
            {mode === "add" && "Add Members"}
            {mode === "remove" && "Remove Members"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-96 overflow-auto px-1 -mx-1">
          {mode === "view" && (
            <>
              {/* Current user first */}
              {members?.find((m: any) => m._id === currentUserId) && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={members?.find((m: any) => m._id === currentUserId)?.avatar} />
                    <AvatarFallback>{members?.find((m: any) => m._id === currentUserId)?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {members?.find((m: any) => m._id === currentUserId)?.name} (You)
                  </span>
                </div>
              )}
              
              {/* Admin */}
              {conversation?.adminUserId && conversation?.adminUserId !== currentUserId && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={members?.find((m: any) => m._id === conversation.adminUserId)?.avatar} />
                    <AvatarFallback>{members?.find((m: any) => m._id === conversation.adminUserId)?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {members?.find((m: any) => m._id === conversation.adminUserId)?.name} (Admin)
                  </span>
                </div>
              )}
              
              {/* Other members */}
              {otherMembers
                .filter((m: any) => m._id !== conversation?.adminUserId)
                .map((member: any) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                    </div>
                  </div>
                ))}
            </>
          )}

          {mode === "add" && isAdmin && (
            <>
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserCursor(0);
                  setHasMoreUsers(true);
                }}
                className="my-1"
              />

              {isLoadingUsers ? (
                <div className="flex justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {userSearch ? "No users found" : "No users available to add"}
                </p>
              ) : (
                <>
                  {availableUsers.map((user: any) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddMember(user._id)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
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
            </>
          )}

          {mode === "remove" && isAdmin && (
            <>
              {otherMembers.map((member: any) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member._id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
