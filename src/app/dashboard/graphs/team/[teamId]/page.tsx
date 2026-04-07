"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AttendanceChart } from "@/components/graphs/AttendanceChart";

type GraphMode = "count" | "percentage";

export default function TeamGraphPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();
  const [mode, setMode] = useState<GraphMode>("count");

  const { data, isLoading } = useQuery({
    queryKey: ["graph", "team", teamId, mode],
    queryFn: async () => {
      const res = await fetch(`/api/graphs?scope=team&id=${teamId}&mode=${mode}`);
      if (!res.ok) throw new Error("Failed to fetch graph data");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">출석 그래프</h1>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode("count")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              mode === "count"
                ? "bg-white text-indigo-700 font-medium shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            출석 인원
          </button>
          <button
            onClick={() => setMode("percentage")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              mode === "percentage"
                ? "bg-white text-indigo-700 font-medium shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            출석률
          </button>
        </div>
      </div>

      <AttendanceChart
        chartData={data.chartData}
        series={data.series}
        title={`${data.teamName} ${mode === "count" ? "출석 인원" : "출석률"}`}
        subtitle={mode === "count" ? "순원별 출석 인원 추이 (점선: 전체 합계)" : "순원별 출석률 추이 (점선: 전체 평균)"}
        mode={mode}
      />
    </div>
  );
}
