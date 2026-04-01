"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { AttendanceChart } from "@/components/graphs/AttendanceChart";

export default function GroupGraphPage() {
  const params = useParams();
  const groupId = params.groupId as string;

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
      <h1 className="text-xl font-bold text-gray-900">그룹 그래프</h1>

      <AttendanceChart
        chartData={data.chartData}
        series={data.series}
        title={`${data.groupName} 그룹 출석률`}
        subtitle="조별 출석률 추이 (점선: 그룹 전체 평균)"
      />
    </div>
  );
}
