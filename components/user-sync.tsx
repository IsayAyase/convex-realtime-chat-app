"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useCreateOrGetUser, useUpdateUserByClerkId } from "@/lib/convexHooks";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const isSyncing = useRef(false);
  
  const createOrGetUser = useCreateOrGetUser();
  const updateUser = useUpdateUserByClerkId();
  const currentUser = useQuery(api.users.getCurrentUserQuery, { userId: user?.id });

  useEffect(() => {
    if (!isLoaded || !user || isSyncing.current) return;

    const userData = {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      name: user.fullName || user.username || user.firstName || "Unknown",
      avatar: user.imageUrl,
    };

    if (!currentUser) {
      isSyncing.current = true;
      createOrGetUser(userData)
        .then(() => {
          isSyncing.current = false;
        })
        .catch((err) => {
          isSyncing.current = false;
          console.error(err);
        });
    } else if (
      currentUser.name !== userData.name ||
      currentUser.avatar !== userData.avatar ||
      currentUser.email !== userData.email
    ) {
      updateUser({
        clerkUserId: user.id,
        name: userData.name,
        avatar: userData.avatar,
      }).catch(console.error);
    }
  }, [isLoaded, user, currentUser, createOrGetUser, updateUser]);

  return null;
}
