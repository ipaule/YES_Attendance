"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Search, ArrowUpDown,
} from "lucide-react";
import { getGradeColor } from "@/lib/attendance";
import { computePeerGroup, formatBirthdayMD } from "@/lib/profile";
import { chipClassFor } from "@/lib/dropdownColors";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface RosterMember {
  id: string;
  name: string;
  englishName: string;
  gender: string;
  birthYear: string;
  birthday: string;
  groupName: string;
  teamName: string;
  ministry: string;
  note: string;
  training: string;
  baptismStatus: string;
  salvationAssurance: string;
  order: number;
  rate: number;
  grade: string;
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
  const [filterTraining, setFilterTraining] = useState("");
  const [filterBaptism, setFilterBaptism] = useState("");

  type SortKey = "name" | "englishName" | "gender" | "birthYear" | "birthday" | "groupName" | "teamName" | "training" | "ministry" | "baptismStatus" | "salvationAssurance" | "rate" | "grade";
  type SortDir = "none" | "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const { data: members, isLoading, error } = useQuery({
    queryKey: ["roster", search, filterGender, filterBirthYear, filterGroup, filterGrade, filterTraining, filterBaptism],
    queryFn: async (): Promise<RosterMember[]> => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterGender) params.set("gender", filterGender);
      if (filterBirthYear) params.set("birthYear", filterBirthYear);
      if (filterGroup) params.set("groupName", filterGroup);
      if (filterGrade) params.set("grade", filterGrade);
      if (filterTraining) params.set("training", filterTraining);
      if (filterBaptism) params.set("baptismStatus", filterBaptism);
      const res = await fetch(`/api/roster?${params}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).members;
    },
  });

  const { data: trainingOptions = [] } = useQuery({
    queryKey: ["dropdown-options", "training"],
    queryFn: async () => {
      const res = await fetch("/api/dropdown-options?category=training");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).options as { id: string; value: string }[];
    },
    staleTime: 30_000,
  });

  const { data: baptismOptions = [] } = useQuery({
    queryKey: ["dropdown-options", "baptism_status"],
    queryFn: async () => {
      const res = await fetch("/api/dropdown-options?category=baptism_status");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).options as { id: string; value: string; color: string }[];
    },
    staleTime: 30_000,
  });

  const { data: salvationOptions = [] } = useQuery({
    queryKey: ["dropdown-options", "salvation_assurance"],
    queryFn: async () => {
      const res = await fetch("/api/dropdown-options?category=salvation_assurance");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).options as { id: string; value: string; color: string }[];
    },
    staleTime: 30_000,
  });

  const baptismColor = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of baptismOptions) m[o.value] = o.color;
    return m;
  }, [baptismOptions]);
  const salvationColor = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of salvationOptions) m[o.value] = o.color;
    return m;
  }, [salvationOptions]);

  // All teams across all groups — used for the inline 순장 picker, filtered
  // per-row by the member's groupName.
  const { data: allTeams = [] } = useQuery({
    queryKey: ["teams-all"],
    queryFn: async (): Promise<{ id: string; name: string; group: { name: string } }[]> => {
      const res = await fetch("/api/teams");
      if (!res.ok) return [];
      return (await res.json()).teams;
    },
    staleTime: 30_000,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, teamName }: { id: string; teamName: string }) => {
      const res = await fetch(`/api/roster/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["unregistered"] });
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
      const res = await fetch("/api/roster/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["roster"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

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
        const toNum = (v: string) => { const n = parseInt(v) || 0; return n >= 50 ? 1900 + n : 2000 + n; };
        cmp = toNum(a.birthYear) - toNum(b.birthYear);
      } else {
        const va = (a[sortKey] || "") as string;
        const vb = (b[sortKey] || "") as string;
        cmp = va.localeCompare(vb, "ko");
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
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">재적 리스트</h1>
          {isLoading && <span className="text-sm text-gray-400">로딩 중...</span>}
          {error && <span className="text-sm text-red-400">오류</span>}
          {members && <span className="text-sm text-gray-400">{members.length}명</span>}
        </div>
        <button
          onClick={() => router.push("/dashboard/roster/new")}
          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700"
        >
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
          <option value="">성별</option>
          <option value="남">남</option>
          <option value="여">여</option>
        </select>
        <input type="text" placeholder="또래" value={filterBirthYear} onChange={(e) => setFilterBirthYear(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 w-16" />
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5">
          <option value="">전체</option>
          <option value="사랑">사랑</option>
          <option value="소망">소망</option>
          <option value="믿음">믿음</option>
          <option value="-">미배정</option>
        </select>
        <select value={filterTraining} onChange={(e) => setFilterTraining(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5">
          <option value="">훈련과정</option>
          {trainingOptions.map((o) => (
            <option key={o.id} value={o.value}>{o.value}</option>
          ))}
        </select>
        <select value={filterBaptism} onChange={(e) => setFilterBaptism(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5">
          <option value="">세례 여부</option>
          {baptismOptions.map((o) => (
            <option key={o.id} value={o.value}>{o.value}</option>
          ))}
        </select>
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5">
          <option value="">등급</option>
          <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="F">F</option><option value="-">-</option>
        </select>
        {(search || filterGender || filterBirthYear || filterGroup || filterGrade || filterTraining || filterBaptism) && (
          <button onClick={() => { setSearch(""); setFilterGender(""); setFilterBirthYear(""); setFilterGroup(""); setFilterGrade(""); setFilterTraining(""); setFilterBaptism(""); }} className="text-xs text-gray-500 hover:text-gray-700">초기화</button>
        )}
      </div>

      {/* Table */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-7 px-1 py-2" />
                  <th className="w-8 px-1 py-2 text-center font-medium text-gray-400">#</th>
                  <SortTh label="이름" k="name" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="영문" k="englishName" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="성별" k="gender" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="또래" k="birthYear" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="생일" k="birthday" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="공동체" k="groupName" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="순장" k="teamName" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="훈련과정" k="training" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="사역" k="ministry" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="세례 여부" k="baptismStatus" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="구원 확신" k="salvationAssurance" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="출석률" k="rate" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <SortTh label="등급" k="grade" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} sortIcon={sortIcon} />
                  <th className="w-16 px-1 py-2" />
                </tr>
              </thead>
              <SortableContext items={sortedMembers.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {sortedMembers.map((m, idx) => (
                    <SortableRow key={m.id} id={m.id}>
                      <td className="px-2 py-1 text-center text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/dashboard/roster/${m.id}`)}
                          className="text-sm text-gray-800 hover:text-indigo-600 hover:underline"
                        >
                          {m.name || "-"}
                        </button>
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-600 whitespace-nowrap">{m.englishName || "-"}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-xs font-medium ${m.gender === "남" ? "text-blue-600" : m.gender === "여" ? "text-red-600" : "text-gray-400"}`}>
                          {m.gender || "-"}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center text-xs text-gray-600">{computePeerGroup(m.birthday, m.birthYear)}</td>
                      <td className="px-2 py-1 text-center text-xs text-gray-600 whitespace-nowrap">{formatBirthdayMD(m.birthday)}</td>
                      <td className="px-2 py-1 text-center">
                        {m.groupName ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${chipClassFor(communityColor(m.groupName))}`}>
                            {m.groupName}
                          </span>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <select
                          value={m.teamName}
                          disabled={!m.groupName}
                          onChange={(e) => assignMutation.mutate({ id: m.id, teamName: e.target.value })}
                          className={`text-xs rounded px-1.5 py-0.5 border ${
                            !m.groupName
                              ? "bg-gray-50 text-gray-300 border-gray-200"
                              : m.teamName
                                ? `${chipClassFor("indigo")} cursor-pointer`
                                : "bg-gray-50 text-gray-500 border-gray-200 cursor-pointer"
                          }`}
                          title={!m.groupName ? "공동체를 먼저 설정하세요" : ""}
                        >
                          <option value="">미배정</option>
                          {allTeams
                            .filter((t) => t.group.name === m.groupName)
                            .map((t) => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                          {m.teamName && !allTeams.some((t) => t.name === m.teamName && t.group.name === m.groupName) && (
                            <option value={m.teamName}>{m.teamName}</option>
                          )}
                        </select>
                      </td>
                      <td className="px-2 py-1 text-center">
                        {m.training ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${chipClassFor("teal")}`}>
                            {m.training}
                          </span>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-600 whitespace-nowrap">{m.ministry || "-"}</td>
                      <td className="px-2 py-1 text-center">
                        {m.baptismStatus ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${chipClassFor(baptismColor[m.baptismStatus])}`}>
                            {m.baptismStatus}
                          </span>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {m.salvationAssurance ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${chipClassFor(salvationColor[m.salvationAssurance])}`}>
                            {m.salvationAssurance}
                          </span>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-2 py-1 text-center text-xs font-medium text-gray-700">{m.rate >= 0 ? `${m.rate}%` : "-"}</td>
                      <td className="px-2 py-1 text-center">
                        {m.grade !== "-" ? (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getGradeColor(m.grade)}`}>{m.grade}</span>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => router.push(`/dashboard/roster/${m.id}`)}
                            className="text-gray-400 hover:text-indigo-600"
                            title="상세 보기"
                          >
                            <Search className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`${m.name}님을 삭제하시겠습니까?`)) deleteMutation.mutate(m.id); }}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </SortableRow>
                  ))}
                </tbody>
              </SortableContext>
            </table>
            {(!members || members.length === 0) && (
              <div className="text-center py-12 text-gray-400">
                <p>리스트가 비어있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

function communityColor(name: string): string {
  if (name === "믿음") return "green";
  if (name === "소망") return "blue";
  if (name === "사랑") return "pink";
  if (name === "샬롬") return "purple";
  return "gray";
}

interface SortThProps<K extends string> {
  label: string;
  k: K;
  sortKey: K | null;
  sortDir: "none" | "asc" | "desc";
  toggleSort: (k: K) => void;
  sortIcon: (k: K) => React.ReactNode;
}

function SortTh<K extends string>({ label, k, toggleSort, sortIcon }: SortThProps<K>) {
  return (
    <th
      className="px-2 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap text-center"
      onClick={() => toggleSort(k)}
    >
      <div className="flex items-center justify-center gap-0.5">
        {label}
        {sortIcon(k)}
      </div>
    </th>
  );
}
