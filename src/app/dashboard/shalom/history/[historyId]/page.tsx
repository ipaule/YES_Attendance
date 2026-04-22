"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface ShalomRecord {
  name: string;
  gender: string;
  birthYear: string;
  phone: string;
  visitDate: string;
  inviter: string;
  leader: string;
  note: string;
  status: string;
}

export default function ShalomHistoryDetailPage() {
  const params = useParams();
  const historyId = params.historyId as string;
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["shalom-history", historyId],
    queryFn: async () => {
      const res = await fetch(`/api/shalom/history/${historyId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ id: string; name: string; createdAt: string; data: ShalomRecord[] }>;
    },
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-gray-500">로딩 중...</p></div>;
  if (!data) return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-red-500">데이터를 불러올 수 없습니다.</p></div>;

  const sorted = [...data.data].sort((a, b) => (b.visitDate || "").localeCompare(a.visitDate || ""));

  const statusColor = (s: string) => {
    if (s === "방문") return "bg-blue-50 text-blue-700";
    if (s === "등록") return "bg-green-50 text-green-700";
    if (s === "졸업") return "bg-purple-50 text-purple-700";
    return "bg-gray-50 text-gray-700";
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-xs text-gray-500">{new Date(data.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} · {sorted.length}명</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-2 text-center font-medium text-gray-400 w-8">#</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600">이름</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap">성별</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">또래</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">전화번호</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">방문 날짜</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">인도자</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">샬롬 순장</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">비고</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-2 py-1.5 text-center text-xs text-gray-400">{i + 1}</td>
                  <td className="px-2 py-1.5 text-sm">{m.name || "-"}</td>
                  <td className={`px-2 py-1.5 text-center text-xs font-medium ${m.gender === "남" ? "text-blue-600" : m.gender === "여" ? "text-red-600" : "text-gray-500"}`}>{m.gender || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500">{m.birthYear || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500">{m.phone || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500">{m.visitDate || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500">{m.inviter || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500">{m.leader || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500">{m.note || "-"}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor(m.status)}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
