"use client";

import { useState, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#4f46e5",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#65a30d",
  "#ea580c",
  "#6366f1",
];

const OVERALL_KEYS = ["전체", "합산"];

interface AttendanceChartProps {
  chartData: Record<string, string | number>[];
  series: string[];
  title: string;
  subtitle?: string;
  mode?: "count" | "percentage";
  maxOverride?: number;
  onHoverDate?: (dateLabel: string | null) => void;
}

export function AttendanceChart({
  chartData,
  series,
  title,
  subtitle,
  maxOverride,
  onHoverDate,
  mode = "count",
}: AttendanceChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const sortedSeries = [
    ...series.filter((s) => !OVERALL_KEYS.includes(s)),
    ...series.filter((s) => OVERALL_KEYS.includes(s)),
  ];

  const filteredData = chartData.map((point) => {
    const filtered: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(point)) {
      if (!key.startsWith("_")) {
        filtered[key] = value;
      }
    }
    return filtered;
  });

  const maxValue = useMemo(() => {
    // Respect maxOverride (e.g. roster total) only while an overall series is
    // visible — once user hides 합산/전체, auto-zoom into the remaining lines.
    const anyOverallVisible = series.some(
      (s) => OVERALL_KEYS.includes(s) && !hiddenSeries.has(s),
    );
    if (maxOverride && anyOverallVisible) return maxOverride;
    if (mode === "percentage") return 100;
    let max = 0;
    for (const point of filteredData) {
      for (const [key, value] of Object.entries(point)) {
        if (key === "date" || typeof value !== "number") continue;
        if (hiddenSeries.has(key)) continue;
        if (value > max) max = value;
      }
    }
    return Math.max(max + 1, 5);
  }, [filteredData, mode, hiddenSeries, maxOverride, series]);

  const handleLegendClick = useCallback((name: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const getColor = (name: string, index: number) => {
    if (OVERALL_KEYS.includes(name)) return "#1f2937";
    return COLORS[index % COLORS.length];
  };

  const unit = mode === "count" ? "명" : "%";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>

      {filteredData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          데이터가 없습니다.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis
                domain={[0, maxValue]}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(v) => `${v}${unit}`}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (onHoverDate) {
                    const newDate = active && payload?.length ? (label as string) : null;
                    setTimeout(() => onHoverDate(newDate), 0);
                  }
                  if (!active || !payload?.length) return null;
                  const sorted = [...payload].sort((a, b) => {
                    const aOverall = OVERALL_KEYS.includes(String(a.name || ""));
                    const bOverall = OVERALL_KEYS.includes(String(b.name || ""));
                    if (aOverall && !bOverall) return 1;
                    if (!aOverall && bOverall) return -1;
                    return 0;
                  });
                  return (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 text-xs">
                      <p className="font-medium text-gray-700 mb-1.5">{label}</p>
                      {sorted.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: entry.color }} />
                            {entry.name}
                          </span>
                          <span className="font-medium">{entry.value}{unit}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {sortedSeries.map((name, index) => {
                const isOverall = OVERALL_KEYS.includes(name);
                const isHidden = hiddenSeries.has(name);
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={getColor(name, index)}
                    strokeWidth={isOverall ? 3 : 2}
                    strokeDasharray={isOverall ? "5 5" : undefined}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    hide={isHidden}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>

          {/* Custom legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
            {sortedSeries.map((name, index) => {
              const isHidden = hiddenSeries.has(name);
              const color = getColor(name, index);
              return (
                <button
                  key={name}
                  onClick={() => handleLegendClick(name)}
                  className="flex items-center gap-1.5 text-xs py-1 cursor-pointer"
                >
                  <span
                    className="inline-block w-3 h-0.5 rounded"
                    style={{ backgroundColor: isHidden ? "#d1d5db" : color }}
                  />
                  <span
                    style={{
                      color: isHidden ? "#d1d5db" : "#374151",
                      textDecoration: isHidden ? "line-through" : undefined,
                    }}
                  >
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
