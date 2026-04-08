"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
  groupName: string; teamName: string; ministry: string; note: string; order: number; rate: number; grade: string;
}

function SortableRow({ id, children, editRowId }: { id: string; children: React.ReactNode; editRowId?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100 hover:bg-gray-50" {...attributes} data-edit-row={editRowId || undefined}>
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
  const [newMember, setNewMember] = useState({ name: "", gender: "", birthYear: "", groupName: "", ministry: "", note: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<RosterMember>>({});
  const editingRef = useRef<string | null>(null);
  const editDataRef = useRef<Partial<RosterMember>>({});
  const savingRef = useRef(false);

  const setEditing = useCallback((id: string | null, data?: Partial<RosterMember>) => {
    editingRef.current = id;
    savingRef.current = false;
    setEditingId(id);
    if (data) { editDataRef.current = data; setEditData(data); }
  }, []);

  const updateEditData = useCallback((updater: (prev: Partial<RosterMember>) => Partial<RosterMember>) => {
    setEditData((prev) => {
      const next = updater(prev);
      editDataRef.current = next;
      return next;
    });
  }, []);

  type SortKey = "name" | "gender" | "birthYear" | "groupName" | "teamName" | "ministry" | "note" | "rate" | "grade";
  type SortDir = "none" | "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  // Document click listener for auto-save on click outside
  useEffect(() => {
    if (!editingId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(`[data-edit-row="${editingId}"]`)) return;
      if (savingRef.current || editingRef.current !== editingId) return;
      savingRef.current = true;
      const d = editDataRef.current;
      updateMutation.mutate({ id: editingId, data: { name: d.name, gender: d.gender, birthYear: d.birthYear, groupName: d.groupName, ministry: d.ministry, note: d.note } });
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

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

  const [addError, setAddError] = useState("");
  const addMutation = useMutation({
    mutationFn: async (data: typeof newMember) => {
      const res = await fetch("/api/roster", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roster"] }); setShowAdd(false); setAddError(""); setNewMember({ name: "", gender: "", birthYear: "", groupName: "", ministry: "", note: "" }); },
    onError: (e: Error) => { setAddError(e.message); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RosterMember> }) => {
      const res = await fetch(`/api/roster/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: (_d, _e, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      // Only clear editing if we're still editing the same member that was saved
      if (editingRef.current === variables.id) { editingRef.current = null; setEditingId(null); }
      savingRef.current = false;
    },
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
          <option value="">전체</option><option value="사랑">사랑</option><option value="소망">소망</option><option value="믿음">믿음</option><option value="-">-</option>
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
          <input type="text" placeholder="사역" value={newMember.ministry} onChange={(e) => setNewMember((p) => ({ ...p, ministry: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 w-20" />
          <input type="text" placeholder="비고" value={newMember.note} onChange={(e) => setNewMember((p) => ({ ...p, note: e.target.value }))} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 flex-1 min-w-[100px]" />
          <button onClick={() => {
            setAddError("");
            if (!newMember.name || !newMember.gender || !newMember.birthYear || !newMember.groupName) { setAddError("이름, 성별, 또래, 공동체를 모두 입력해주세요."); return; }
            addMutation.mutate(newMember);
          }} disabled={addMutation.isPending} className="text-sm bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0">추가</button>
          <button onClick={() => { setShowAdd(false); setAddError(""); }} className="text-sm text-gray-500 hover:text-gray-700 flex-shrink-0">취소</button>
          {addError && <span className="text-xs text-red-500 w-full">{addError}</span>}
        </div>
      )}

      {/* Table */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-7 px-1 py-2" />
                <th className="w-8 px-1 py-2 text-center font-medium text-gray-400">#</th>
                <th className="px-1 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[80px] text-center" onClick={() => toggleSort("name")}><div className="flex items-center justify-center gap-0.5">이름{sortIcon("name")}</div></th>
                <th className="px-1 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[44px] text-center" onClick={() => toggleSort("gender")}><div className="flex items-center justify-center gap-0.5">성별{sortIcon("gender")}</div></th>
                <th className="px-1 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[44px] text-center" onClick={() => toggleSort("birthYear")}><div className="flex items-center justify-center gap-0.5">또래{sortIcon("birthYear")}</div></th>
                <th className="px-2 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[80px] text-center" onClick={() => toggleSort("groupName")}><div className="flex items-center justify-center gap-0.5">공동체{sortIcon("groupName")}</div></th>
                <th className="px-2 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[80px] text-center" onClick={() => toggleSort("teamName")}><div className="flex items-center justify-center gap-0.5">순장{sortIcon("teamName")}</div></th>
                <th className="px-2 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[200px] text-center" onClick={() => toggleSort("ministry")}><div className="flex items-center justify-center gap-0.5">사역{sortIcon("ministry")}</div></th>
                <th className="px-2 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap text-center" onClick={() => toggleSort("note")}><div className="flex items-center justify-center gap-0.5">비고{sortIcon("note")}</div></th>
                <th className="px-2 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[44px] text-center" onClick={() => toggleSort("rate")}><div className="flex items-center justify-center gap-0.5">출석률{sortIcon("rate")}</div></th>
                <th className="px-2 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[32px] text-center" onClick={() => toggleSort("grade")}><div className="flex items-center justify-center gap-0.5">등급{sortIcon("grade")}</div></th>
                <th className="w-8 px-1 py-2" />
              </tr>
            </thead>
            <SortableContext items={sortedMembers.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {sortedMembers.map((m, idx) => {
                const isEditing = editingId === m.id;
                return (
                  <SortableRow key={m.id} id={m.id} editRowId={isEditing ? m.id : undefined}>
                    <td className="px-2 py-1 text-center text-xs text-gray-400">{idx + 1}</td>
                    {(() => {
                          const save = () => {
                            if (savingRef.current || editingRef.current !== m.id) return;
                            savingRef.current = true;
                            const d = editDataRef.current;
                            updateMutation.mutate({ id: m.id, data: { name: d.name, gender: d.gender, birthYear: d.birthYear, groupName: d.groupName, ministry: d.ministry, note: d.note } });
                          };
                          const kd = (e: React.KeyboardEvent) => { if (e.key === "Enter") save(); if (e.key === "Escape") { editingRef.current = null; setEditingId(null); } };
                          const startEdit = () => setEditing(m.id, m);
                          const ec = isEditing ? "bg-indigo-50" : "bg-transparent cursor-pointer appearance-none pointer-events-none";
                          return (<>
                        <td className="px-2 py-1" onClick={!isEditing ? startEdit : undefined}><input type="text" readOnly={!isEditing} value={isEditing ? (editData.name || "") : (m.name || "-")} onChange={isEditing ? (e) => updateEditData((p) => ({ ...p, name: e.target.value })) : undefined} onKeyDown={isEditing ? kd : undefined} onClick={!isEditing ? startEdit : undefined} className={`w-full text-xs py-0.5 px-1 rounded focus:outline-none ${ec} ${isEditing ? "focus:ring-1 focus:ring-indigo-300" : ""}`} /></td>
                        <td className="px-2 py-1" onClick={!isEditing ? startEdit : undefined}><select disabled={!isEditing} value={isEditing ? (editData.gender || "") : (m.gender || "")} onChange={isEditing ? (e) => updateEditData((p) => ({ ...p, gender: e.target.value })) : undefined} onKeyDown={isEditing ? kd : undefined} className={`w-full text-xs py-0.5 rounded focus:outline-none text-center ${ec} ${isEditing ? "focus:ring-1 focus:ring-indigo-300" : ""}`}><option value="">-</option><option value="MALE">남</option><option value="FEMALE">여</option></select></td>
                        <td className="px-2 py-1" onClick={!isEditing ? startEdit : undefined}><input type="text" readOnly={!isEditing} value={isEditing ? (editData.birthYear || "") : (m.birthYear || "-")} onChange={isEditing ? (e) => updateEditData((p) => ({ ...p, birthYear: e.target.value })) : undefined} onKeyDown={isEditing ? kd : undefined} onClick={!isEditing ? startEdit : undefined} className={`w-full text-xs py-0.5 px-1 text-center rounded focus:outline-none ${ec} ${isEditing ? "focus:ring-1 focus:ring-indigo-300" : ""}`} /></td>
                        <td className="px-2 py-1" onClick={!isEditing ? startEdit : undefined}><select disabled={!isEditing} value={isEditing ? (editData.groupName || "") : (m.groupName || "")} onChange={isEditing ? (e) => updateEditData((p) => ({ ...p, groupName: e.target.value })) : undefined} onKeyDown={isEditing ? kd : undefined} className={`w-full text-xs py-0.5 rounded focus:outline-none text-center ${ec} ${isEditing ? "focus:ring-1 focus:ring-indigo-300" : ""}`}><option value="">-</option><option value="사랑">사랑</option><option value="소망">소망</option><option value="믿음">믿음</option></select></td>
                        <td className="px-2 py-1 text-center text-xs text-gray-400">{m.teamName || "-"}</td>
                        <td className="px-2 py-1" onClick={!isEditing ? startEdit : undefined}><input type="text" readOnly={!isEditing} value={isEditing ? (editData.ministry || "") : (m.ministry || "-")} onChange={isEditing ? (e) => updateEditData((p) => ({ ...p, ministry: e.target.value })) : undefined} onKeyDown={isEditing ? kd : undefined} onClick={!isEditing ? startEdit : undefined} className={`w-full text-xs py-0.5 px-1 text-center rounded focus:outline-none ${ec} ${isEditing ? "focus:ring-1 focus:ring-indigo-300" : ""}`} /></td>
                        <td className="px-2 py-1" onClick={!isEditing ? startEdit : undefined}><input type="text" readOnly={!isEditing} value={isEditing ? (editData.note || "") : (m.note || "-")} onChange={isEditing ? (e) => updateEditData((p) => ({ ...p, note: e.target.value })) : undefined} onKeyDown={isEditing ? kd : undefined} onClick={!isEditing ? startEdit : undefined} className={`w-full text-xs py-0.5 px-1 rounded focus:outline-none ${ec} ${isEditing ? "focus:ring-1 focus:ring-indigo-300" : ""}`} /></td>
                        <td className="px-2 py-1 text-center text-xs font-medium text-gray-700">{m.rate >= 0 ? `${m.rate}%` : "-"}</td>
                        <td className="px-2 py-1 text-center">{m.grade !== "-" ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getGradeColor(m.grade)}`}>{m.grade}</span> : <span className="text-xs text-gray-400">-</span>}</td>
                        <td className="px-1 py-1">
                          <button onClick={() => { if (confirm(`${m.name}님을 삭제하시겠습니까?`)) deleteMutation.mutate(m.id); }} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                        </td>
                          </>);
                    })()}
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
