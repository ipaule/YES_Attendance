"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import type { TeamWithData } from "@/types";

export default function TeamPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async (): Promise<TeamWithData> => {
      const res = await fetch(`/api/teams/${teamId}`);
      if (!res.ok) throw new Error("Failed to fetch team");
      const data = await res.json();
      return data.team;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {data.group?.name} - {data.name}
        </h1>
      </div>

      <AttendanceTable team={data} />
    </div>
  );
}
