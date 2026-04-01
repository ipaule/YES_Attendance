"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, FolderOpen, Pencil, Check, X } from "lucide-react";

interface TermSummary {
  id: string;
  name: string;
  createdAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["terms"],
    queryFn: async (): Promise<TermSummary[]> => {
      const res = await fetch("/api/terms");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.terms;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (termId: string) => {
      const res = await fetch(`/api/terms/${termId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["terms"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ termId, name }: { termId: string; name: string }) => {
      const res = await fetch(`/api/terms/${termId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["terms"] });
      setEditingId(null);
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">지난 텀 기록</h1>
      </div>

      {(!data || data.length === 0) ? (
        <div className="text-center py-12 text-gray-400">
          <p>저장된 텀 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((term) => (
            <div
              key={term.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all"
            >
              {editingId === term.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="h-5 w-5 text-amber-600" />
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editName.trim()) {
                        renameMutation.mutate({ termId: term.id, name: editName });
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 text-sm border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    onClick={() => editName.trim() && renameMutation.mutate({ termId: term.id, name: editName })}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => router.push(`/dashboard/history/${term.id}`)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{term.name}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(term.createdAt).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => {
                        setEditingId(term.id);
                        setEditName(term.name);
                      }}
                      className="text-gray-300 hover:text-indigo-500 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${term.name}" 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
                          deleteMutation.mutate(term.id);
                        }
                      }}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
