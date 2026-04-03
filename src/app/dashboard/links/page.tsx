"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, Copy, ClipboardCopy, GripVertical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LinkItem {
  id: string;
  title: string;
  url: string;
  order: number;
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex gap-2">
      <button {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none mt-4 flex-shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function LinksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const canWrite = user?.role === "PASTOR" || user?.role === "EXECUTIVE";

  const reorderMutation = useMutation({
    mutationFn: async (linkIds: string[]) => {
      const res = await fetch("/api/links/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkIds }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["links"] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !links) return;
    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(links, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((l) => l.id));
  };

  const { data: links } = useQuery({
    queryKey: ["links"],
    queryFn: async (): Promise<LinkItem[]> => {
      const res = await fetch("/api/links");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).links;
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ title, url }: { title: string; url: string }) => {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
      setShowAdd(false);
      setNewTitle("");
      setNewUrl("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, url }: { id: string; title: string; url: string }) => {
      const res = await fetch(`/api/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["links"] }),
  });

  const copyOne = (link: LinkItem) => {
    navigator.clipboard.writeText(`${link.title} : ${link.url}`);
    setCopied(link.id);
    setTimeout(() => setCopied(null), 1500);
  };

  const copyAll = () => {
    if (!links?.length) return;
    const text = links.map((l) => `${l.title} : ${l.url}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied("all");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">공지사항</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyAll}
            className={`flex items-center gap-1.5 text-sm rounded-lg px-4 py-2 transition-colors ${
              copied === "all"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <ClipboardCopy className="h-4 w-4" />
            {copied === "all" ? "복사됨!" : "전체 복사"}
          </button>
          {canWrite && (
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAdd && canWrite && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">제목</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="공지 제목"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">내용 (링크)</label>
            <textarea
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="공지 내용 또는 링크를 입력하세요"
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => newTitle && addMutation.mutate({ title: newTitle, url: newUrl || "" })}
              disabled={!newTitle || addMutation.isPending}
              className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
            >
              추가
            </button>
            <button onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:text-gray-700">
              취소
            </button>
          </div>
        </div>
      )}

      {/* Announcements */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={(links || []).map((l) => l.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-3">
        {links?.map((link, idx) => (
          <SortableItem key={link.id} id={link.id}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            {editingId === link.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-sm font-semibold border border-indigo-300 rounded-lg px-3 py-2 focus:outline-none"
                />
                <textarea
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-indigo-300 rounded-lg px-3 py-2 focus:outline-none resize-y"
                />
                <div className="flex gap-2">
                  <button onClick={() => updateMutation.mutate({ id: link.id, title: editTitle, url: editUrl })} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    <Check className="h-4 w-4" />저장
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <X className="h-4 w-4" />취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">{idx + 1}</span>
                      <h3 className="font-semibold text-gray-800">{link.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{link.url}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => copyOne(link)}
                      className={`transition-colors p-1 rounded ${copied === link.id ? "text-green-500" : "text-gray-300 hover:text-indigo-500"}`}
                      title="복사"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {canWrite && (
                      <>
                        <button
                          onClick={() => { setEditingId(link.id); setEditTitle(link.title); setEditUrl(link.url); }}
                          className="text-gray-300 hover:text-indigo-500 p-1 rounded"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`"${link.title}" 공지를 삭제하시겠습니까?`)) deleteMutation.mutate(link.id); }}
                          className="text-gray-300 hover:text-red-500 p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          </SortableItem>
        ))}
      </div>
      </SortableContext>
      </DndContext>

      {(!links || links.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <p>공지사항이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
