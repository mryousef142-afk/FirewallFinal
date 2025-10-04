﻿import { initDataState, type User, useSignal } from "@telegram-apps/sdk-react";

interface OwnerProfile {
  user?: User;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

function buildDisplayName(user?: User): string {
  if (!user) {
    return "\u06A9\u0627\u0631\u0628\u0631 \u0646\u0627\u0634\u0646\u0627\u0633";
  }
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : user.username ?? "\u06A9\u0627\u0631\u0628\u0631";
}

export function useOwnerProfile(): OwnerProfile {
  const initData = useSignal(initDataState);
  const user = initData?.user;

  return {
    user,
    displayName: buildDisplayName(user),
    username: user?.username,
    avatarUrl: user?.photo_url,
  };
}
