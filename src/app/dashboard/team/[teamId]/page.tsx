"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import { TodayAttendanceList } from "@/components/attendance/TodayAttendanceList";
import { fetchJson } from "@/lib/http";
import type { TeamWithData } from "@/types";

export default function TeamPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();
  const [tab, setTab] = useState<"check" | "table">("check");

  const { data, isLoading, error } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async (): Promise<TeamWithData> => {
      const data = await fetchJson<{ team: TeamWithData }>(`/api/teams/${teamId}`);
      return data.team;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500 animate-pulse">로딩 중...</p>
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

      <div className="flex lg:hidden border-b border-gray-200">
        <button
          onClick={() => setTab("check")}
          className={`flex-1 min-h-[44px] text-sm font-medium ${tab === "check" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400"}`}
        >
          체크
        </button>
        <button
          onClick={() => setTab("table")}
          className={`flex-1 min-h-[44px] text-sm font-medium ${tab === "table" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400"}`}
        >
          전체표
        </button>
      </div>

      <TodayAttendanceList team={data} className={tab === "check" ? "lg:hidden" : "hidden"} />
      <AttendanceTable team={data} className={tab === "table" ? "block lg:block" : "hidden lg:block"} />
    </div>
  );
}
