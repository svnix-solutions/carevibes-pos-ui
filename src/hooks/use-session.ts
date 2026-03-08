"use client";

import { useQuery } from "@tanstack/react-query";

interface SessionInfo {
  email: string;
  full_name: string;
  expires_at: number;
}

export function useSession() {
  return useQuery<SessionInfo>({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
