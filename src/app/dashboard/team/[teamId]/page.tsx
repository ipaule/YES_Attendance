"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import { Download } from "lucide-react";
import type { TeamWithData } from "@/types";

export default function TeamPage() {
  const params = useParams();
  const teamId = params.teamId as string;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {data.group?.name} - {data.name}
          </h1>
          {data.leader && (
            <p className="text-sm text-gray-500">
              순장: {data.leader.username}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            window.open(`/api/attendance/export?teamId=${teamId}`, "_blank");
          }}
          className="flex items-center gap-1.5 text-sm bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          엑셀 다운로드
        </button>
      </div>

      <AttendanceTable team={data} />
    </div>
  );
}
