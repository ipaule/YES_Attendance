"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AttendanceChart } from "@/components/graphs/AttendanceChart";

type GraphMode = "count" | "percentage";
type Preset = "term" | "6m" | "1y" | "all" | "custom";

interface RosterStats {
  total: number;
  assigned: number;
  attendanceByDate: Record<string, number>;
  closestSunday: string;
}

function getPresetDates(preset: Preset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  switch (preset) {
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return { start: d.toISOString().slice(0, 10), end };
    }
    case "1y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return { start: d.toISOString().slice(0, 10), end };
    }
    case "all":
      return { start: "2000-01-01", end: end };
    default: // "term" or "custom"
      return { start: "", end: "" };
  }
}

export default function CombinedGraphPage() {
  const router = useRouter();
  const [mode, setMode] = useState<GraphMode>("count");
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("term");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { startDate, endDate } = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    if (preset === "term") return { startDate: "", endDate: "" };
    const { start, end } = getPresetDates(preset);
    return { startDate: start, endDate: end };
  }, [preset, customStart, customEnd]);

  const { data, isLoading } = useQuery({
    queryKey: ["graph", "combined", mode, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ scope: "combined", mode });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/graphs?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["roster-stats"],
    queryFn: async (): Promise<RosterStats> => {
      const res = await fetch("/api/roster/stats");
      if (!res.ok) throw new Error("Failed");
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

  const total = stats?.total || 0;
  const assigned = stats?.assigned || 0;

  // Get attended count: prefer _attended from chart data (works for historical), fallback to stats
  const activeDate = hoveredDate || stats?.closestSunday || "";
  let attended = 0;
  if (hoveredDate && data.chartData) {
    const match = data.chartData.find((p: Record<string, string | number>) => p.date === hoveredDate);
    if (match && typeof match._attended === "number") {
      attended = match._attended;
    } else {
      attended = stats?.attendanceByDate?.[hoveredDate] || 0;
    }
  } else {
    attended = stats?.attendanceByDate?.[activeDate] || 0;
  }

  const pctOfTotal = total > 0 ? Math.round((attended / total) * 100) : 0;
  const pctOfAssigned = assigned > 0 ? Math.round((attended / assigned) * 100) : 0;

  const presetBtn = (p: Preset, label: string) => (
    <button
      onClick={() => setPreset(p)}
      className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
        preset === p
          ? "bg-white text-indigo-700 font-medium shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );

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
          <h1 className="text-xl font-bold text-gray-900">합산 그래프</h1>
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

      {/* Date range presets + custom picker */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {presetBtn("term", "이번 텀")}
          {presetBtn("6m", "최근 6개월")}
          {presetBtn("1y", "최근 1년")}
          {presetBtn("all", "전체")}
          {presetBtn("custom", "직접 선택")}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Stats label */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs font-medium text-indigo-500 mb-1">재적</p>
            <p className="text-3xl font-bold text-indigo-700">{total}<span className="text-lg ml-0.5">명</span></p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-medium text-emerald-500 mb-1">순 등록</p>
            <p className="text-3xl font-bold text-emerald-700">{assigned}<span className="text-lg ml-0.5">명</span></p>
            <p className="text-lg font-semibold text-emerald-600 mt-1">{total > 0 ? Math.round((assigned / total) * 100) : 0}%<span className="text-xs font-normal text-emerald-400 ml-1">of 재적</span></p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-600 mb-1">{activeDate || "-"} 출석</p>
            <p className="text-3xl font-bold text-amber-700">{attended}<span className="text-lg ml-0.5">명</span></p>
            <p className="text-lg font-semibold text-amber-600 mt-1">
              {pctOfTotal}%<span className="text-xs font-normal text-amber-400 ml-1">재적</span>
              <span className="text-amber-300 mx-1.5">·</span>
              {pctOfAssigned}%<span className="text-xs font-normal text-amber-400 ml-1">순등록</span>
            </p>
          </div>
        </div>
      )}

      <AttendanceChart
        chartData={data.chartData}
        series={data.series}
        title={`사랑 · 소망 · 믿음 합산 ${mode === "count" ? "출석 인원" : "출석률"}`}
        subtitle={
          mode === "count"
            ? "공동체별 출석 인원 추이 (점선: 합산 합계)"
            : "공동체별 출석률 추이 (점선: 합산 평균)"
        }
        mode={mode}
        maxOverride={mode === "count" && total > 0 ? total : undefined}
        onHoverDate={setHoveredDate}
      />
    </div>
  );
}
