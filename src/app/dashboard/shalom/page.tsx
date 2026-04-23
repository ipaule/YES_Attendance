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
import { ArrowLeft, Plus, Trash2, ArrowUpDown, Save, GripVertical, Search, MoveRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { normalizeBirthYear } from "@/lib/profile";

interface ShalomMember {
  id: string;
  name: string;
  englishName: string;
  gender: string;
  birthYear: string;
  phone: string;
  visitDate: string;
  inviter: string;
  leader: string;
  note: string;
  status: string;
  movedToRosterAt: string | null;
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
  const { user } = useAuth();
  const canMoveToRoster = user?.role === "PASTOR";

  const [sortKey, setSortKey] = useState<SortKey>("visitDate");
  const [sortDir, setSortDir] = useState<SortDir>("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterBirthYear, setFilterBirthYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFlush, setShowFlush] = useState(false);
  const [flushMode, setFlushMode] = useState<"new" | "existing">("new");
  const [flushName, setFlushName] = useState("");
  const [flushHistoryId, setFlushHistoryId] = useState("");
  const [moveTarget, setMoveTarget] = useState<ShalomMember | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

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
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shalom-members"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shalom/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shalom-members"] }),
  });

  const moveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shalom/${id}/move-to-roster`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "이동 실패");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shalom-members"] });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["unregistered"] });
      setMoveTarget(null);
      setMoveError(null);
    },
    onError: (e: Error) => setMoveError(e.message),
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

  const filtered = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => {
      if (search && !m.name.includes(search)) return false;
      if (filterGender && m.gender !== filterGender) return false;
      if (filterBirthYear && normalizeBirthYear(m.birthYear) !== normalizeBirthYear(filterBirthYear)) return false;
      if (filterStatus && m.status !== filterStatus) return false;
      return true;
    });
  }, [members, search, filterGender, filterBirthYear, filterStatus]);

  const sorted = useMemo(() => {
    if (sortDir === "none") return filtered;
    const toYearNum = (v: string) => {
      const n = parseInt(v, 10);
      if (!Number.isFinite(n)) return Number.MAX_SAFE_INTEGER;
      return n >= 50 ? 1900 + n : 2000 + n;
    };
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "birthYear") {
        cmp = toYearNum(a.birthYear) - toYearNum(b.birthYear);
      } else {
        const va = (a[sortKey] || "") as string;
        const vb = (b[sortKey] || "") as string;
        cmp = va.localeCompare(vb, "ko");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

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
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !members) return;
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
          <button
            onClick={() => setShowFlush(true)}
            disabled={selected.size === 0}
            className="flex items-center gap-1.5 text-sm bg-amber-600 text-white rounded-lg px-4 py-2 hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            선택 기록 저장 ({selected.size})
          </button>
          <button
            onClick={() => router.push("/dashboard/shalom/new")}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-[150px]">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border-0 focus:outline-none flex-1"
          />
        </div>
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5"
        >
          <option value="">성별</option>
          <option value="남">남</option>
          <option value="여">여</option>
        </select>
        <input
          type="text"
          placeholder="또래"
          value={filterBirthYear}
          onChange={(e) => setFilterBirthYear(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 w-16"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5"
        >
          <option value="">상태</option>
          <option value="방문">방문</option>
          <option value="등록">등록</option>
          <option value="졸업">졸업</option>
        </select>
        {(search || filterGender || filterBirthYear || filterStatus) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterGender("");
              setFilterBirthYear("");
              setFilterStatus("");
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            초기화
          </button>
        )}
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

      {/* Move-to-roster confirmation dialog */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">로스터로 이동</h3>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{moveTarget.name}</span>님을 로스터로 이동하시겠습니까?
              <br />
              <span className="text-xs text-gray-400">이동 후 미등록자 리스트에 추가됩니다.</span>
            </p>
            {moveError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">{moveError}</div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setMoveTarget(null); setMoveError(null); }}
                disabled={moveMutation.isPending}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                취소
              </button>
              <button
                onClick={() => moveMutation.mutate(moveTarget.id)}
                disabled={moveMutation.isPending}
                className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
              >
                {moveMutation.isPending ? "이동 중..." : "이동"}
              </button>
            </div>
          </div>
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
                  <th className="w-8 px-1 py-2"><input type="checkbox" checked={members?.length ? selected.size === members.length : false} onChange={toggleSelectAll} className="rounded" /></th>
                  <th className="w-8 px-1 py-2 text-center font-medium text-gray-400">#</th>
                  <th className="px-1 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[80px] text-center" onClick={() => toggleSort("name")}><div className="flex items-center justify-center gap-0.5">이름{sortIcon("name")}</div></th>
                  <th className="px-1 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[44px] text-center" onClick={() => toggleSort("gender")}><div className="flex items-center justify-center gap-0.5">성별{sortIcon("gender")}</div></th>
                  <th className="px-1 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[44px] text-center" onClick={() => toggleSort("birthYear")}><div className="flex items-center justify-center gap-0.5">또래{sortIcon("birthYear")}</div></th>
                  <th className="px-1 py-2 font-medium text-gray-600 whitespace-nowrap w-[120px] text-center">전화번호</th>
                  <th className="px-2 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[95px] text-center" onClick={() => toggleSort("visitDate")}><div className="flex items-center justify-center gap-0.5">방문 날짜{sortIcon("visitDate")}</div></th>
                  <th className="px-1 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[80px] text-center" onClick={() => toggleSort("inviter")}><div className="flex items-center justify-center gap-0.5">인도자{sortIcon("inviter")}</div></th>
                  <th className="px-1 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[80px] text-center" onClick={() => toggleSort("leader")}><div className="flex items-center justify-center gap-0.5">순장{sortIcon("leader")}</div></th>
                  <th className="px-2 py-2 font-medium text-gray-600 text-center">비고</th>
                  <th className="px-1 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap w-[50px] text-center" onClick={() => toggleSort("status")}><div className="flex items-center justify-center gap-0.5">상태{sortIcon("status")}</div></th>
                  <th className="w-20 px-1 py-2" />
                </tr>
              </thead>
              <SortableContext items={sorted.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {sorted.map((m, idx) => {
                    const moved = !!m.movedToRosterAt;
                    const canShowMoveButton = canMoveToRoster && !moved;
                    const moveEnabled = m.status === "졸업";
                    return (
                      <SortableTableRow key={m.id} id={m.id}>
                        <td className="px-1 py-1 text-center">
                          <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} className="rounded" />
                        </td>
                        <td className="px-2 py-1 text-center text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-2 py-1">
                          <button
                            onClick={() => router.push(`/dashboard/shalom/${m.id}`)}
                            className="text-sm text-gray-800 hover:text-indigo-600 hover:underline"
                          >
                            {m.name || "-"}
                          </button>
                        </td>
                        <td className="px-2 py-1 text-center">
                          <span className={`text-xs font-medium ${m.gender === "남" ? "text-blue-600" : m.gender === "여" ? "text-red-600" : "text-gray-400"}`}>
                            {m.gender || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-center text-xs text-gray-500">{m.birthYear || "-"}</td>
                        <td className="px-2 py-1 text-center text-xs text-gray-500">{m.phone || "-"}</td>
                        <td className="px-2 py-1 text-center text-xs text-gray-500">{m.visitDate || "-"}</td>
                        <td className="px-2 py-1 text-center text-xs text-gray-500">{m.inviter || "-"}</td>
                        <td className="px-2 py-1 text-center text-xs text-gray-400">{m.leader || "-"}</td>
                        <td className="px-2 py-1 text-xs text-gray-500 truncate max-w-[200px]">{m.note || "-"}</td>
                        <td className="px-2 py-1 text-center">
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
                        <td className="px-1 py-1">
                          <div className="flex items-center gap-1 justify-center">
                            {moved ? (
                              <span className="text-[10px] text-gray-400" title="이미 이동됨">
                                이동됨
                              </span>
                            ) : canShowMoveButton ? (
                              <button
                                onClick={() => {
                                  setMoveError(null);
                                  setMoveTarget(m);
                                }}
                                disabled={!moveEnabled}
                                title={moveEnabled ? "로스터로 이동" : "졸업 상태에서만 이동 가능"}
                                className={`${moveEnabled ? "text-gray-400 hover:text-indigo-600" : "text-gray-200 cursor-not-allowed"}`}
                              >
                                <MoveRight className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                            <button
                              onClick={() => router.push(`/dashboard/shalom/${m.id}`)}
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
                      </SortableTableRow>
                    );
                  })}
                </tbody>
              </SortableContext>
            </table>
            {sorted.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>{members?.length ? "검색 결과가 없습니다." : "아직 샬롬 리스트가 비어있습니다."}</p>
              </div>
            )}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
