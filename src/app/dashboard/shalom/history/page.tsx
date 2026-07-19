"use client";

import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderPlus } from "lucide-react";
import { fetchJson } from "@/lib/http";
import { HistoryTree, type HistoryTreeHandle, type HistoryTreeNode } from "@/components/HistoryTree";

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
  const treeRef = useRef<HistoryTreeHandle>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shalom-histories"],
    queryFn: async (): Promise<HistoryTreeNode[]> => {
      const res = await fetchJson<{ histories: HistoryTreeNode[] }>("/api/shalom/history");
      return res.histories;
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => patchJson(`/api/shalom/history/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shalom-histories"] }),
  });

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      postJson("/api/shalom/history", { name, parentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shalom-histories"] }),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      patchJson(`/api/shalom/history/${id}`, { parentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shalom-histories"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => postJson("/api/shalom/history/reorder", { orderedIds }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shalom-histories"] }),
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
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-gray-500">로딩 중...</p></div>;
  }

  if (isError) {
    return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-red-500">기록을 불러올 수 없습니다.</p></div>;
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold text-gray-900">샬롬 기록</h1>
        </div>
        <button
          onClick={() => treeRef.current?.createRootFolder()}
          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
        >
          <FolderPlus className="h-4 w-4" />
          새 폴더
        </button>
      </div>

      <HistoryTree
        ref={treeRef}
        nodes={data ?? []}
        onCreateFolder={(name, parentId) => createFolderMutation.mutate({ name, parentId })}
        onRename={(id, name) => renameMutation.mutate({ id, name })}
        onMove={async (id, parentId) => { await moveMutation.mutateAsync({ id, parentId }); }}
        onReorder={(orderedIds) => reorderMutation.mutate(orderedIds)}
        detailHref={(node) => `/dashboard/shalom/history/${node.id}`}
        folderNameOpensDetail
        canDelete={(node) => node.type === "FOLDER"}
        onDelete={async (node) => { await deleteMutation.mutateAsync(node.id); }}
        deleteConfirmText={(node) =>
          `"${node.name}" 폴더를 삭제하시겠습니까?\n안에 있던 항목들은 삭제되지 않고 상위 폴더로 이동됩니다.`
        }
      />
    </div>
  );
}
