"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Plus, Trash2, ArrowUpDown, Save, GripVertical } from "lucide-react";

interface ShalomMember {
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

interface HistorySummary {
  id: string;
  name: string;
  createdAt: string;
}

type SortKey = "name" | "gender" | "birthYear" | "visitDate" | "inviter" | "leader" | "status";
type SortDir = "none" | "asc" | "desc";

function SortableTableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100 hover:bg-gray-50" {...attributes}>
      <td className="px-1 py-1 text-center w-6">
        <button {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </td>
      {children}
    </tr>
  );
}

export default function ShalomListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "", gender: "", birthYear: "", phone: "", visitDate: "", inviter: "", leader: "", note: "", status: "방문",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ShalomMember>>({});
  const [sortKey, setSortKey] = useState<SortKey>("visitDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFlush, setShowFlush] = useState(false);
  const [flushMode, setFlushMode] = useState<"new" | "existing">("new");
  const [flushName, setFlushName] = useState("");
  const [flushHistoryId, setFlushHistoryId] = useState("");

  const { data: members } = useQuery({
    queryKey: ["shalom-members"],
    queryFn: async (): Promise<ShalomMember[]> => {
      const res = await fetch("/api/shalom");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).members;
    },
  });

  const { data: histories } = useQuery({
    queryKey: ["shalom-histories"],
    queryFn: async (): Promise<HistorySummary[]> => {
      const res = await fetch("/api/shalom/history");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).histories;
    },
    enabled: showFlush,
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof newMember) => {
      const res = await fetch("/api/shalom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["shalom-members"] });
      setShowAdd(false);
      setNewMember({ name: "", gender: "", birthYear: "", phone: "", visitDate: "", inviter: "", leader: "", note: "", status: "방문" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ShalomMember> }) => {
      const res = await fetch(`/api/shalom/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["shalom-members"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shalom/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shalom-members"] }),
  });

  const flushMutation = useMutation({
    mutationFn: async (body: { memberIds: string[]; historyId?: string; historyName?: string }) => {
      const res = await fetch("/api/shalom/flush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["shalom-members"] });
      queryClient.invalidateQueries({ queryKey: ["shalom-histories"] });
      setShowFlush(false);
      setSelected(new Set());
      setFlushName("");
      setFlushHistoryId("");
    },
  });

  const sorted = useMemo(() => {
    if (!members) return [];
    if (sortDir === "none") return members;
    return [...members].sort((a, b) => {
      const va = (a[sortKey] || "") as string;
      const vb = (b[sortKey] || "") as string;
      const cmp = va.localeCompare(vb, "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [members, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("desc"); }
    else setSortDir((p) => p === "desc" ? "asc" : p === "asc" ? "none" : "desc");
  };

  const sortIcon = (key: SortKey) => (
    <ArrowUpDown className={`h-3 w-3 inline-block ml-0.5 ${sortKey === key && sortDir !== "none" ? "text-indigo-600" : "text-gray-400"}`} />
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!members) return;
    if (selected.size === members.length) setSelected(new Set());
    else setSelected(new Set(members.map((m) => m.id)));
  };

  const handleFlush = () => {
    if (selected.size === 0) return;
    if (flushMode === "new" && !flushName.trim()) return;
    if (flushMode === "existing" && !flushHistoryId) return;

    flushMutation.mutate({
      memberIds: Array.from(selected),
      ...(flushMode === "new" ? { historyName: flushName } : { historyId: flushHistoryId }),
    });
  };

  const reorderMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      const res = await fetch("/api/shalom/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shalom-members"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !members) return;

    // Reset sort when dragging
    setSortKey("visitDate");
    setSortDir("none");

    const oldIndex = sorted.findIndex((m) => m.id === active.id);
    const newIndex = sorted.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((m) => m.id));
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
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">샬롬 리스트</h1>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => setShowFlush(true)}
              className="flex items-center gap-1.5 text-sm bg-amber-600 text-white rounded-lg px-4 py-2 hover:bg-amber-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              선택 기록 저장 ({selected.size})
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
      </div>

      {/* Flush dialog */}
      {showFlush && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">기록 저장</h3>
            <p className="text-sm text-gray-600">선택한 {selected.size}명을 기록에 저장하고 리스트에서 삭제합니다.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setFlushMode("new")}
                className={`flex-1 text-sm py-2 rounded-lg border ${flushMode === "new" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500"}`}
              >
                새 기록 만들기
              </button>
              <button
                onClick={() => setFlushMode("existing")}
                className={`flex-1 text-sm py-2 rounded-lg border ${flushMode === "existing" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500"}`}
              >
                기존 기록에 추가
              </button>
            </div>
            {flushMode === "new" ? (
              <input
                type="text"
                value={flushName}
                onChange={(e) => setFlushName(e.target.value)}
                placeholder="기록 이름 (예: 2026년 상반기)"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            ) : (
              <select
                value={flushHistoryId}
                onChange={(e) => setFlushHistoryId(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">기록 선택</option>
                {histories?.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowFlush(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">취소</button>
              <button
                onClick={handleFlush}
                disabled={flushMutation.isPending}
                className="text-sm bg-amber-600 text-white rounded-lg px-4 py-2 hover:bg-amber-700 disabled:opacity-50"
              >
                {flushMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-end gap-2">
          <input type="text" placeholder="이름" value={newMember.name} onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-20" />
          <select value={newMember.gender} onChange={(e) => setNewMember((p) => ({ ...p, gender: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            <option value="">성별</option><option value="MALE">남</option><option value="FEMALE">여</option>
          </select>
          <input type="text" placeholder="또래" value={newMember.birthYear} onChange={(e) => setNewMember((p) => ({ ...p, birthYear: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-16" />
          <input type="text" placeholder="전화번호" value={newMember.phone} onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-28" />
          <input type="date" value={newMember.visitDate} onChange={(e) => setNewMember((p) => ({ ...p, visitDate: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
          <input type="text" placeholder="인도자" value={newMember.inviter} onChange={(e) => setNewMember((p) => ({ ...p, inviter: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-20" />
          <input type="text" placeholder="순장" value={newMember.leader} onChange={(e) => setNewMember((p) => ({ ...p, leader: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-20" />
          <input type="text" placeholder="비고" value={newMember.note} onChange={(e) => setNewMember((p) => ({ ...p, note: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 flex-1 min-w-[120px]" />
          <button onClick={() => newMember.name && addMutation.mutate(newMember)} disabled={!newMember.name || addMutation.isPending} className="text-sm bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0">추가</button>
          <button onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:text-gray-700 flex-shrink-0">취소</button>
        </div>
      )}

      {/* Table */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="bg-gray-50 px-1 py-2 w-6" />
                <th className="px-1 py-2 w-8">
                  <input type="checkbox" checked={members?.length ? selected.size === members.length : false} onChange={toggleSelectAll} className="rounded" />
                </th>
                <th className="px-1 py-2 text-center font-medium text-gray-400 w-8">#</th>
                <th className="px-1 py-2 text-left font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("name")}>이름{sortIcon("name")}</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("gender")}>성별{sortIcon("gender")}</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600">또래</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600">전화번호</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("visitDate")}>방문 날짜{sortIcon("visitDate")}</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("inviter")}>인도자{sortIcon("inviter")}</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("leader")}>순장{sortIcon("leader")}</th>
                <th className="px-1 py-2 text-left font-medium text-gray-600 min-w-[200px]">비고</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("status")}>상태{sortIcon("status")}</th>
                <th className="px-1 py-2 w-8" />
              </tr>
            </thead>
            <SortableContext items={sorted.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {sorted.map((m, idx) => {
                const isEditing = editingId === m.id;
                return (
                  <SortableTableRow key={m.id} id={m.id}>
                    <td className="px-1 py-1.5 text-center">
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} className="rounded" />
                    </td>
                    <td className="px-1 py-1.5 text-center text-xs text-gray-400">{idx + 1}</td>
                    {isEditing ? (
                      <>
                        <td className="px-1 py-1"><input type="text" value={editData.name || ""} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} className="w-full text-sm border border-indigo-300 rounded px-1 py-0.5" /></td>
                        <td className="px-1 py-1"><select value={editData.gender || ""} onChange={(e) => setEditData((p) => ({ ...p, gender: e.target.value }))} className="text-xs border border-indigo-300 rounded px-1 py-0.5"><option value="">-</option><option value="MALE">남</option><option value="FEMALE">여</option></select></td>
                        <td className="px-1 py-1"><input type="text" value={editData.birthYear || ""} onChange={(e) => setEditData((p) => ({ ...p, birthYear: e.target.value }))} className="w-14 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center" /></td>
                        <td className="px-1 py-1"><input type="text" value={editData.phone || ""} onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))} className="w-28 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center" /></td>
                        <td className="px-1 py-1"><input type="date" value={editData.visitDate || ""} onChange={(e) => setEditData((p) => ({ ...p, visitDate: e.target.value }))} className="text-xs border border-indigo-300 rounded px-1 py-0.5" /></td>
                        <td className="px-1 py-1"><input type="text" value={editData.inviter || ""} onChange={(e) => setEditData((p) => ({ ...p, inviter: e.target.value }))} className="w-16 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center" /></td>
                        <td className="px-1 py-1"><input type="text" value={editData.leader || ""} onChange={(e) => setEditData((p) => ({ ...p, leader: e.target.value }))} className="w-16 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center" /></td>
                        <td className="px-1 py-1 min-w-[200px]"><input type="text" value={editData.note || ""} onChange={(e) => setEditData((p) => ({ ...p, note: e.target.value }))} className="w-full text-xs border border-indigo-300 rounded px-1 py-0.5" /></td>
                        <td className="px-2 py-1">
                          <select value={editData.status || "방문"} onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value }))} className="text-xs border border-indigo-300 rounded px-1 py-0.5">
                            <option value="방문">방문</option><option value="등록">등록</option><option value="졸업">졸업</option>
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => updateMutation.mutate({ id: m.id, data: editData })} className="text-[10px] text-indigo-600">저장</button>
                            <button onClick={() => setEditingId(null)} className="text-[10px] text-gray-400">취소</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-1 py-1.5"><button onClick={() => { setEditingId(m.id); setEditData(m); }} className="text-sm hover:text-indigo-600">{m.name || "-"}</button></td>
                        <td className="px-1 py-1.5 text-center text-xs text-gray-500">{m.gender === "MALE" ? "남" : m.gender === "FEMALE" ? "여" : "-"}</td>
                        <td className="px-1 py-1.5 text-center text-xs text-gray-500">{m.birthYear || "-"}</td>
                        <td className="px-1 py-1.5 text-center text-xs text-gray-500">{m.phone || "-"}</td>
                        <td className="px-1 py-1.5 text-center text-xs text-gray-500 whitespace-nowrap">{m.visitDate || "-"}</td>
                        <td className="px-1 py-1.5 text-center text-xs text-gray-500">{m.inviter || "-"}</td>
                        <td className="px-1 py-1.5 text-center text-xs text-gray-500">{m.leader || "-"}</td>
                        <td className="px-1 py-1.5 text-left text-xs text-gray-500 min-w-[200px]">{m.note || "-"}</td>
                        <td className="px-2 py-1.5 text-center">
                          <select
                            value={m.status}
                            onChange={(e) => updateMutation.mutate({ id: m.id, data: { status: e.target.value } })}
                            className={`text-[10px] font-medium px-1 py-0.5 rounded-full border-0 cursor-pointer ${statusColor(m.status)}`}
                          >
                            <option value="방문">방문</option>
                            <option value="등록">등록</option>
                            <option value="졸업">졸업</option>
                          </select>
                        </td>
                        <td className="px-1 py-1.5">
                          <button onClick={() => { if (confirm(`${m.name}님을 삭제하시겠습니까?`)) deleteMutation.mutate(m.id); }} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </>
                    )}
                  </SortableTableRow>
                );
              })}
            </tbody>
            </SortableContext>
          </table>
          {(!members || members.length === 0) && (
            <div className="text-center py-12 text-gray-400">
              <p>아직 샬롬 리스트가 비어있습니다.</p>
            </div>
          )}
        </div>
      </div>
      </DndContext>
    </div>
  );
}
