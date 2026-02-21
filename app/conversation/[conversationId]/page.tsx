"use client";

import { useAuth } from "@clerk/nextjs";
import { useGetCurrentUser } from "@/lib/convexHooks";
import { ChatWindow } from "../_components/ChatWindow";
import { LoadingScreen } from "@/components/loading";
import { useParams } from "next/navigation";

export default function ConversationIdPage() {
  const { userId, isLoaded } = useAuth();
  const params = useParams();
  const currentUser = useGetCurrentUser(userId || undefined);
  const conversationId = params.conversationId as string;

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (!userId || !conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <ChatWindow 
      conversationId={conversationId}
      currentUserId={currentUser?._id}
    />
  );
}
