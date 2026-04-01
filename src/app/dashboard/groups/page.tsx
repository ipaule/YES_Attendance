"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FolderOpen, BarChart3, CalendarPlus } from "lucide-react";
import type { Group } from "@/types";

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async (): Promise<Group[]> => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      return data.groups;
    },
  });

  const bulkDateMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      const res = await fetch("/api/dates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      return data;
    },
    onSuccess: (data) => {
      setResult(data.message);
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      setResult(error.message);
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">공동체 관리</h1>
        <button
          onClick={() => {
            setShowDateRange(!showDateRange);
            setResult(null);
          }}
          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
        >
          <CalendarPlus className="h-4 w-4" />
          날짜 일괄 추가
        </button>
      </div>

      {showDateRange && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">일요일 날짜 일괄 추가</h3>
            <p className="text-xs text-gray-500">
              시작일부터 종료일까지의 모든 일요일을 사랑·소망·믿음 순에 추가합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => {
                if (startDate && endDate) {
                  bulkDateMutation.mutate({ startDate, endDate });
                }
              }}
              disabled={!startDate || !endDate || bulkDateMutation.isPending}
              className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {bulkDateMutation.isPending ? "추가 중..." : "추가"}
            </button>
            <button
              onClick={() => {
                setShowDateRange(false);
                setResult(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              닫기
            </button>
          </div>

          {result && (
            <div className={`text-sm rounded-lg p-3 ${
              bulkDateMutation.isError
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}>
              {result}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data?.map((group) => (
          <Link
            key={`group-${group.id}`}
            href={`/dashboard/group/${group.id}`}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FolderOpen className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{group.name}</h3>
              <p className="text-xs text-gray-500">공동체 현황</p>
            </div>
          </Link>
        ))}
        {data?.map((group) => (
          <Link
            key={`graph-${group.id}`}
            href={`/dashboard/graphs/group/${group.id}`}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{group.name}</h3>
              <p className="text-xs text-gray-500">출석 그래프</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
