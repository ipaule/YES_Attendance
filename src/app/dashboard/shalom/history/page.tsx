"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Folder, FolderPlus, Pencil, Trash2, Check, X } from "lucide-react";
import { fetchJson } from "@/lib/http";

interface FolderSummary {
  id: string;
  name: string;
  count: number;
  createdAt: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
  return data;
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
  return data;
}

export default function ShalomHistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shalom-histories"],
    queryFn: async (): Promise<FolderSummary[]> => {
      const res = await fetchJson<{ folders: FolderSummary[] }>("/api/shalom/history");
      return res.folders;
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => postJson("/api/shalom/history", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shalom-histories"] });
      setCreating(false);
      setNewFolderName("");
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => patchJson(`/api/shalom/history/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shalom-histories"] });
      setEditingId(null);
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shalom/history/${id}`, { method: "DELETE" });
      const text = await res.text();
      const body = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(body.error || "서버 오류가 발생했습니다.");
      return body;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shalom-histories"] }),
    onError: (e: Error) => setActionError(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-gray-500">로딩 중...</p></div>;
  }

  if (isError) {
    return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-red-500">기록을 불러올 수 없습니다.</p></div>;
  }

  const folders = data ?? [];

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold text-gray-900">샬롬 기록</h1>
        </div>
        <button
          onClick={() => { setCreating(true); setNewFolderName(""); }}
          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
        >
          <FolderPlus className="h-4 w-4" />
          새 폴더
        </button>
      </div>

      {actionError && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2"><X className="h-4 w-4" /></button>
        </div>
      )}

      {creating && (
        <div className="flex items-center gap-2 bg-white rounded-lg border border-indigo-300 px-3 py-2">
          <FolderPlus className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && newFolderName.trim() && !createFolderMutation.isPending) createFolderMutation.mutate(newFolderName);
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="폴더 이름"
            className="flex-1 min-w-0 text-sm border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
          <button
            onClick={() => newFolderName.trim() && !createFolderMutation.isPending && createFolderMutation.mutate(newFolderName)}
            disabled={createFolderMutation.isPending}
            className="text-indigo-600 hover:text-indigo-800 flex-shrink-0 disabled:opacity-50"
          ><Check className="h-4 w-4" /></button>
          <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}

      {folders.length === 0 && !creating ? (
        <div className="text-center py-12 text-gray-400"><p>저장된 폴더가 없습니다.</p></div>
      ) : (
        <div className="space-y-1">
          {folders.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 px-3 py-2.5 transition-colors"
            >
              {editingId === f.id ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Folder className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing && editName.trim() && !renameMutation.isPending) renameMutation.mutate({ id: f.id, name: editName });
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 min-w-0 text-sm border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    onClick={() => editName.trim() && !renameMutation.isPending && renameMutation.mutate({ id: f.id, name: editName })}
                    disabled={renameMutation.isPending}
                    className="text-indigo-600 hover:text-indigo-800 flex-shrink-0 disabled:opacity-50"
                  ><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => router.push(`/dashboard/shalom/history/${f.id}`)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <Folder className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{f.count}명</span>
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingId(f.id); setEditName(f.name); }} className="text-gray-300 hover:text-indigo-500" title="이름 변경">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        const msg = f.count > 0
                          ? `"${f.name}" 폴더에는 ${f.count}명이 있어 삭제할 수 없습니다. 먼저 다른 폴더로 이동해주세요.`
                          : `"${f.name}" 폴더를 삭제하시겠습니까?`;
                        if (f.count > 0) { alert(msg); return; }
                        if (confirm(msg)) deleteMutation.mutate(f.id);
                      }}
                      className="text-gray-300 hover:text-red-500"
                      title="삭제"
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
