"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FolderOpen, FolderPlus, Move } from "lucide-react";
import { fetchJson } from "@/lib/http";

interface ShalomRecord {
  id: string;
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

interface FolderSummary {
  id: string;
  name: string;
  count: number;
}

export default function ShalomHistoryDetailPage() {
  const params = useParams();
  const historyId = params.historyId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showMove, setShowMove] = useState(false);
  const [moveMode, setMoveMode] = useState<"existing" | "new">("existing");
  const [moveTargetId, setMoveTargetId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shalom-history", historyId],
    queryFn: async () => {
      return fetchJson<{ id: string; name: string; createdAt: string; data: ShalomRecord[] }>(
        `/api/shalom/history/${historyId}`
      );
    },
  });

  const { data: folders } = useQuery({
    queryKey: ["shalom-histories"],
    queryFn: async (): Promise<FolderSummary[]> => {
      const res = await fetchJson<{ folders: FolderSummary[] }>("/api/shalom/history");
      return res.folders;
    },
    enabled: showMove,
  });

  const moveMutation = useMutation({
    mutationFn: async (body: { toId?: string; newFolderName?: string; personIds: string[] }) => {
      const res = await fetch("/api/shalom/history/move-people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: historyId, ...body }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json.error || "이동에 실패했습니다.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shalom-history", historyId] });
      queryClient.invalidateQueries({ queryKey: ["shalom-histories"] });
      setSelected(new Set());
      setShowMove(false);
      setMoveTargetId("");
      setNewFolderName("");
      setMoveError(null);
    },
    onError: (e: Error) => setMoveError(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-gray-500">로딩 중...</p></div>;
  if (isError || !data) return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-red-500">데이터를 불러올 수 없습니다.</p></div>;

  const sorted = [...data.data].sort((a, b) => (b.visitDate || "").localeCompare(a.visitDate || ""));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map((p) => p.id)));
  };

  const handleMove = () => {
    if (selected.size === 0) return;
    if (moveMode === "existing" && !moveTargetId) return;
    if (moveMode === "new" && !newFolderName.trim()) return;
    moveMutation.mutate({
      personIds: Array.from(selected),
      ...(moveMode === "existing" ? { toId: moveTargetId } : { newFolderName }),
    });
  };

  const statusColor = (s: string) => {
    if (s === "방문") return "bg-blue-50 text-blue-700";
    if (s === "등록") return "bg-green-50 text-green-700";
    if (s === "졸업") return "bg-purple-50 text-purple-700";
    return "bg-gray-50 text-gray-700";
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{data.name}</h1>
            <p className="text-xs text-gray-500">{new Date(data.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} · {sorted.length}명</p>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-indigo-50 text-indigo-700 text-sm rounded-lg px-3 py-2">
          <span>{selected.size}명 선택됨</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set())} className="text-indigo-500 hover:text-indigo-700 font-medium">선택 해제</button>
            <button
              onClick={() => { setShowMove(true); setMoveError(null); }}
              className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition-colors font-medium"
            >
              <Move className="h-3.5 w-3.5" />
              이동
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-8 px-1 py-2"><input type="checkbox" checked={sorted.length > 0 && selected.size === sorted.length} onChange={toggleSelectAll} className="rounded" /></th>
                <th className="px-2 py-2 text-center font-medium text-gray-400 w-8">#</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600 whitespace-nowrap w-[80px]">이름</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap w-[44px]">성별</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap w-[44px]">또래</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap w-[120px]">전화번호</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap w-[95px]">방문 날짜</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap w-[80px]">인도자</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap w-[80px]">샬롬 순장</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap">비고</th>
                <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap w-[50px]">상태</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr key={m.id} className={`border-b border-gray-100 ${selected.has(m.id) ? "bg-indigo-50" : ""}`}>
                  <td className="px-1 py-1.5 text-center">
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} className="rounded" />
                  </td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-400">{i + 1}</td>
                  <td className="px-2 py-1.5 text-sm whitespace-nowrap">{m.name || "-"}</td>
                  <td className={`px-2 py-1.5 text-center text-xs font-medium whitespace-nowrap ${m.gender === "남" ? "text-blue-600" : m.gender === "여" ? "text-red-600" : "text-gray-500"}`}>{m.gender || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500 whitespace-nowrap">{m.birthYear || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500 whitespace-nowrap">{m.phone || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500 whitespace-nowrap">{m.visitDate || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500 whitespace-nowrap">{m.inviter || "-"}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500 whitespace-nowrap">{m.leader || "-"}</td>
                  <td className="px-2 py-1.5 text-xs text-gray-500 truncate max-w-[200px]">{m.note || "-"}</td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor(m.status)}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length === 0 && (
          <div className="text-center py-12 text-gray-400"><p>이 폴더는 비어 있습니다.</p></div>
        )}
      </div>

      {showMove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowMove(false)}
        >
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">{selected.size}명 이동</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setMoveMode("existing")}
                className={`flex-1 text-sm py-2 rounded-lg border ${moveMode === "existing" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500"}`}
              >
                기존 폴더로
              </button>
              <button
                onClick={() => setMoveMode("new")}
                className={`flex-1 text-sm py-2 rounded-lg border ${moveMode === "new" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500"}`}
              >
                새 폴더 만들기
              </button>
            </div>

            {moveMode === "existing" ? (
              <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
                {folders?.filter((f) => f.id !== historyId).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setMoveTargetId(f.id)}
                    className={`w-full text-left text-sm rounded-lg px-3 py-2 flex items-center gap-2 ${moveTargetId === f.id ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50"}`}
                  >
                    <FolderOpen className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{f.count}명</span>
                  </button>
                ))}
                {folders?.filter((f) => f.id !== historyId).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">이동할 다른 폴더가 없습니다.</p>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="새 폴더 이름"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            )}

            {moveError && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{moveError}</div>}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowMove(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">취소</button>
              <button
                onClick={handleMove}
                disabled={moveMutation.isPending || (moveMode === "existing" ? !moveTargetId : !newFolderName.trim())}
                className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FolderPlus className="h-4 w-4" />
                {moveMutation.isPending ? "이동 중..." : "이동"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
