"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AttendanceChart } from "@/components/graphs/AttendanceChart";

export default function GroupGraphPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["graph", "group", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/graphs?scope=group&id=${groupId}`);
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">공동체 그래프</h1>
      </div>

      <AttendanceChart
        chartData={data.chartData}
        series={data.series}
        title={`${data.groupName} 공동체 출석률`}
        subtitle="순별 출석률 추이 (점선: 공동체 전체 평균)"
      />
    </div>
  );
}
