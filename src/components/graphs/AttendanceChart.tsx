"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

interface AttendanceChartProps {
  chartData: Record<string, string | number>[];
  series: string[];
  title: string;
  subtitle?: string;
}

export function AttendanceChart({
  chartData,
  series,
  title,
  subtitle,
}: AttendanceChartProps) {
  // Filter out internal fields
  const filteredData = chartData.map((point) => {
    const filtered: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(point)) {
      if (!key.startsWith("_")) {
        filtered[key] = value;
      }
    }
    return filtered;
  });

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
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, undefined]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend />
            {series.map((name, index) => {
              const isOverall =
                name === "전체" || name === "합산";
              return (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={
                    isOverall ? "#1f2937" : COLORS[index % COLORS.length]
                  }
                  strokeWidth={isOverall ? 3 : 2}
                  strokeDasharray={isOverall ? "5 5" : undefined}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
