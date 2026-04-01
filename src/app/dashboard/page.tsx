"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.teamId) {
      router.push(`/dashboard/team/${user.teamId}`);
    } else if (user.role === "EXECUTIVE" || user.role === "PASTOR") {
      router.push(`/dashboard/group/${user.groupId}`);
    } else {
      // Leader without team - show a message
    }
  }, [user, loading, router]);

  if (loading) return null;

  // Leader without a team assignment
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        아직 배정된 조가 없습니다
      </h2>
      <p className="text-gray-500">
        목사님이 조를 배정해주실 때까지 기다려주세요.
      </p>
    </div>
  );
}
