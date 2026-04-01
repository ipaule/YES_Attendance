"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FolderOpen, BarChart3 } from "lucide-react";
import type { Group } from "@/types";

export default function GroupsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async (): Promise<Group[]> => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      return data.groups;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <h1 className="text-xl font-bold text-gray-900">전체 그룹</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data?.map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              {group.name}
            </h3>
            <div className="flex gap-2">
              <Link
                href={`/dashboard/group/${group.id}`}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg px-3 py-2 transition-colors"
              >
                <FolderOpen className="h-4 w-4" />
                그룹 현황
              </Link>
              <Link
                href={`/dashboard/graphs/group/${group.id}`}
                className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2 transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                그래프
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
