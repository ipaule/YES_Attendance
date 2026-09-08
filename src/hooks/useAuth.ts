"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        // Cookie was a structurally-valid JWT (middleware let us through) but
        // the session is dead — revoked tokenVersion, expired past the
        // absolute cap, or a deleted account. Middleware can't see any of
        // that, so bounce here instead of rendering a blank dashboard.
        router.replace("/login");
      }
    } catch {
      setUser(null); // transient network failure — do NOT bounce
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
    router.push("/login");
  };

  return { user, loading, logout, refetchUser: fetchUser };
}
