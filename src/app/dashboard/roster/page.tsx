"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, GripVertical, Search, ArrowUpDown } from "lucide-react";
import { getGradeColor } from "@/lib/attendance";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface RosterMember {
  id: string; name: string; gender: string; birthYear: string;
  groupName: string; teamName: string; note: string; order: number; rate: number; grade: string;
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
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

export default function RosterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterBirthYear, setFilterBirthYear] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", gender: "", birthYear: "", groupName: "", note: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<RosterMember>>({});

  type SortKey = "name" | "gender" | "birthYear" | "groupName" | "teamName" | "note" | "rate" | "grade";
  type SortDir = "none" | "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const { data: members, isLoading, error } = useQuery({
    queryKey: ["roster", search, filterGender, filterBirthYear, filterGroup, filterGrade],
    queryFn: async (): Promise<RosterMember[]> => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterGender) params.set("gender", filterGender);
      if (filterBirthYear) params.set("birthYear", filterBirthYear);
      if (filterGroup) params.set("groupName", filterGroup);
      if (filterGrade) params.set("grade", filterGrade);
      const res = await fetch(`/api/roster?${params}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).members;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof newMember) => {
      const res = await fetch("/api/roster", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["roster"] }); setShowAdd(false); setNewMember({ name: "", gender: "", birthYear: "", groupName: "", note: "" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RosterMember> }) => {
      const res = await fetch(`/api/roster/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["roster"] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/roster/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["roster"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      const res = await fetch("/api/roster/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberIds }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["roster"] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const sortedMembers = useMemo(() => {
    if (!members || !sortKey || sortDir === "none") return members || [];
    return [...members].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "rate") {
        cmp = a.rate - b.rate;
      } else if (sortKey === "grade") {
        const gradeOrder = { A: 1, B: 2, C: 3, D: 4, F: 5, "-": 6 };
        cmp = (gradeOrder[a.grade as keyof typeof gradeOrder] || 6) - (gradeOrder[b.grade as keyof typeof gradeOrder] || 6);
      } else if (sortKey === "birthYear") {
        // Treat as birth year: 90-99 = 1990s, 00-09 = 2000s
        const toNum = (v: string) => { const n = parseInt(v) || 0; return n >= 50 ? 1900 + n : 2000 + n; };
        cmp = toNum(a.birthYear) - toNum(b.birthYear);
      } else {
        cmp = (a[sortKey] || "").localeCompare(b[sortKey] || "", "ko");
      }
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sortedMembers) return;
    setSortKey(null);
    setSortDir("none");
    const oldIndex = sortedMembers.findIndex((m) => m.id === active.id);
    const newIndex = sortedMembers.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(sortedMembers, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((m) => m.id));
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold text-gray-900">전체 리스트</h1>
          {isLoading && <span className="text-sm text-gray-400">로딩 중...</span>}
          {error && <span className="text-sm text-red-400">오류</span>}
          {members && <span className="text-sm text-gray-400">{members.length}명</span>}
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />추가
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-[150px]">
          <Search className="h-4 w-4 text-gray-400" />
          <input type="text" placeholder="이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm border-0 focus:outline-none flex-1" />
        </div>
        <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5">
          <option value="">성별</option><option value="MALE">남</option><option value="FEMALE">여</option>
        </select>
        <input type="text" placeholder="또래" value={filterBirthYear} onChange={(e) => setFilterBirthYear(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 w-16" />
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5">
          <option value="">공동체</option><option value="사랑">사랑</option><option value="소망">소망</option><option value="믿음">믿음</option>
        </select>
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5">
          <option value="">등급</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="F">F</option><option value="-">-</option>
        </select>
        {(search || filterGender || filterBirthYear || filterGroup || filterGrade) && (
          <button onClick={() => { setSearch(""); setFilterGender(""); setFilterBirthYear(""); setFilterGroup(""); setFilterGrade(""); }} className="text-xs text-gray-500 hover:text-gray-700">초기화</button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-end gap-2">
          <input type="text" placeholder="이름" value={newMember.name} onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-20" />
          <select value={newMember.gender} onChange={(e) => setNewMember((p) => ({ ...p, gender: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            <option value="">성별</option><option value="MALE">남</option><option value="FEMALE">여</option>
          </select>
          <input type="text" placeholder="또래" value={newMember.birthYear} onChange={(e) => setNewMember((p) => ({ ...p, birthYear: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-16" />
          <select value={newMember.groupName} onChange={(e) => setNewMember((p) => ({ ...p, groupName: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            <option value="">공동체</option><option value="사랑">사랑</option><option value="소망">소망</option><option value="믿음">믿음</option>
          </select>
          <input type="text" placeholder="비고" value={newMember.note} onChange={(e) => setNewMember((p) => ({ ...p, note: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 flex-1 min-w-[100px]" />
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
                <th className="px-1 py-2 text-center font-medium text-gray-400 w-8">#</th>
                <th className="px-1 py-2 text-left font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("name")}>이름{sortIcon("name")}</th>
                <th className="px-0.5 py-2 text-center font-medium text-gray-600 whitespace-nowrap cursor-pointer select-none w-10" onClick={() => toggleSort("gender")}>성별{sortIcon("gender")}</th>
                <th className="px-0.5 py-2 text-center font-medium text-gray-600 cursor-pointer select-none w-10" onClick={() => toggleSort("birthYear")}>또래{sortIcon("birthYear")}</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("groupName")}>공동체{sortIcon("groupName")}</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("teamName")}>순장{sortIcon("teamName")}</th>
                <th className="px-1 py-2 text-left font-medium text-gray-600 min-w-[250px] cursor-pointer select-none" onClick={() => toggleSort("note")}>비고{sortIcon("note")}</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("rate")}>출석률{sortIcon("rate")}</th>
                <th className="px-1 py-2 text-center font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("grade")}>등급{sortIcon("grade")}</th>
                <th className="px-1 py-2 w-8" />
              </tr>
            </thead>
            <SortableContext items={sortedMembers.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {sortedMembers.map((m, idx) => {
                const isEditing = editingId === m.id;
                return (
                  <SortableRow key={m.id} id={m.id}>
                    <td className="px-1 py-1.5 text-center text-xs text-gray-400">{idx + 1}</td>
                    {isEditing ? (
                      <>
                        <td className="px-1 py-1"><input type="text" value={editData.name || ""} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} className="w-full text-sm border border-indigo-300 rounded px-1 py-0.5" /></td>
                        <td className="px-1 py-1"><select value={editData.gender || ""} onChange={(e) => setEditData((p) => ({ ...p, gender: e.target.value }))} className="text-xs border border-indigo-300 rounded px-1 py-0.5"><option value="">-</option><option value="MALE">남</option><option value="FEMALE">여</option></select></td>
                        <td className="px-1 py-1"><input type="text" value={editData.birthYear || ""} onChange={(e) => setEditData((p) => ({ ...p, birthYear: e.target.value }))} className="w-14 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center" /></td>
                        <td className="px-1 py-1"><select value={editData.groupName || ""} onChange={(e) => setEditData((p) => ({ ...p, groupName: e.target.value }))} className="text-xs border border-indigo-300 rounded px-1 py-0.5"><option value="">-</option><option value="사랑">사랑</option><option value="소망">소망</option><option value="믿음">믿음</option></select></td>
                        <td className="px-1 py-1 text-center text-xs text-gray-400">{m.teamName || "-"}</td>
                        <td className="px-1 py-1"><input type="text" value={editData.note || ""} onChange={(e) => setEditData((p) => ({ ...p, note: e.target.value }))} className="w-full text-xs border border-indigo-300 rounded px-1 py-0.5" /></td>
                        <td className="px-1 py-1 text-center text-xs text-gray-500">{m.rate >= 0 ? `${m.rate}%` : "-"}</td>
                        <td className="px-1 py-1 text-center">{m.grade !== "-" ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getGradeColor(m.grade)}`}>{m.grade}</span> : <span className="text-xs text-gray-400">-</span>}</td>
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
                        <td className="px-1 py-1.5 text-center text-xs text-gray-500">{m.groupName || "-"}</td>
                        <td className="px-1 py-1.5 text-center text-xs text-gray-500">{m.teamName || "-"}</td>
                        <td className="px-1 py-1.5 text-left text-xs text-gray-500">{m.note || "-"}</td>
                        <td className="px-1 py-1.5 text-center text-xs font-medium text-gray-700">{m.rate >= 0 ? `${m.rate}%` : "-"}</td>
                        <td className="px-1 py-1.5 text-center">{m.grade !== "-" ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getGradeColor(m.grade)}`}>{m.grade}</span> : <span className="text-xs text-gray-400">-</span>}</td>
                        <td className="px-1 py-1.5">
                          <button onClick={() => { if (confirm(`${m.name}님을 삭제하시겠습니까?`)) deleteMutation.mutate(m.id); }} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </>
                    )}
                  </SortableRow>
                );
              })}
            </tbody>
            </SortableContext>
          </table>
          {(!members || members.length === 0) && (
            <div className="text-center py-12 text-gray-400"><p>리스트가 비어있습니다.</p></div>
          )}
        </div>
      </div>
      </DndContext>
    </div>
  );
}
