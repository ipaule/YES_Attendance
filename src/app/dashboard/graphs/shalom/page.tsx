"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function getDefaults() {
  const now = new Date();
  const start = `${now.getFullYear()}-01-01`;
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

export default function ShalomGraphPage() {
  const router = useRouter();
  const defaults = getDefaults();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const { data, isLoading } = useQuery({
    queryKey: ["shalom-graph", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/shalom/graph?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        statusCounts: { 방문: number; 등록: number; 졸업: number };
        gradeCounts: { A: number; B: number; C: number; "D이하": number };
        totalGraduates: number;
        matchedGraduates: number;
      }>;
    },
  });

  const statusData = data
    ? [
        { name: "방문", value: data.statusCounts.방문 },
        { name: "등록", value: data.statusCounts.등록 },
        { name: "졸업", value: data.statusCounts.졸업 },
      ]
    : [];

  const statusColors = ["#3b82f6", "#22c55e", "#a855f7"];

  const gradeData = data
    ? [
        { name: "A", value: data.gradeCounts.A },
        { name: "B", value: data.gradeCounts.B },
        { name: "C", value: data.gradeCounts.C },
        { name: "D이하", value: data.gradeCounts["D이하"] },
      ]
    : [];

  const gradeColors = ["#22c55e", "#3b82f6", "#eab308", "#ef4444"];

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">샬롬 그래프</h1>
      </div>

      {/* Date range picker */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-end gap-3">
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
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
          >
            초기화
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[20vh]">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : (
        <>
          {/* Bar Graph 1: Status counts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">방문/등록/졸업 현황</h3>
            <p className="text-sm text-gray-500 mb-4">
              {startDate || endDate
                ? `${startDate || "처음"} ~ ${endDate || "현재"} 기간`
                : "전체 기간"} (현재 + 기록 포함)
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 14 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value}명`, undefined]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={statusColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2 text-sm">
              {statusData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: statusColors[i] }} />
                  {d.name}: <span className="font-semibold">{d.value}명</span>
                </span>
              ))}
            </div>
          </div>

          {/* Bar Graph 2: Graduate grade distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">졸업생 출석 등급</h3>
            <p className="text-sm text-gray-500 mb-4">
              졸업생 {data?.totalGraduates || 0}명 중 {data?.matchedGraduates || 0}명 매칭됨 (사랑·소망·믿음 현재 + 기록)
            </p>
            {(data?.matchedGraduates || 0) > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gradeData} barSize={60}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 14 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`${value}명`, undefined]} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {gradeData.map((_, i) => (
                        <Cell key={i} fill={gradeColors[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2 text-sm">
                  {gradeData.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: gradeColors[i] }} />
                      {d.name}: <span className="font-semibold">{d.value}명</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400">
                매칭된 졸업생이 없습니다.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
