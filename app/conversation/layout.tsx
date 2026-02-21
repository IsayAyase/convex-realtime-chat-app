"use client";

import { useAuth } from "@clerk/nextjs";
import { 
  useGetCurrentUser 
} from "@/lib/convexHooks";
import { Sidebar } from "./_components/Sidebar";
import { LoadingScreen } from "@/components/loading";

export default function ConversationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, isLoaded } = useAuth();
  const currentUser = useGetCurrentUser(userId || undefined);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Please sign in to continue</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar 
        userId={userId}
        currentUser={currentUser}
      />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
