"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, FolderOpen, Pencil, Check, X } from "lucide-react";

interface HistorySummary {
  id: string;
  name: string;
  createdAt: string;
}

export default function ShalomHistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["shalom-histories"],
    queryFn: async (): Promise<HistorySummary[]> => {
      const res = await fetch("/api/shalom/history");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).histories;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shalom/history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shalom-histories"] }),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/shalom/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["shalom-histories"] }); setEditingId(null); },
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-gray-500">로딩 중...</p></div>;

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold text-gray-900">샬롬 기록</h1>
      </div>

      {(!data || data.length === 0) ? (
        <div className="text-center py-12 text-gray-400"><p>저장된 기록이 없습니다.</p></div>
      ) : (
        <div className="space-y-3">
          {data.map((h) => (
            <div key={h.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all">
              {editingId === h.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <FolderOpen className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && editName.trim()) renameMutation.mutate({ id: h.id, name: editName }); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1 text-sm border border-indigo-300 rounded-lg px-3 py-1.5" autoFocus />
                  <button onClick={() => editName.trim() && renameMutation.mutate({ id: h.id, name: editName })} className="text-indigo-600"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <>
                  <button onClick={() => router.push(`/dashboard/shalom/history/${h.id}`)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0"><FolderOpen className="h-5 w-5 text-amber-600" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{h.name}</h3>
                      <p className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => { setEditingId(h.id); setEditName(h.name); }} className="text-gray-300 hover:text-indigo-500"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { if (confirm(`"${h.name}" 기록을 삭제하시겠습니까?`)) deleteMutation.mutate(h.id); }} className="text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
