"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowUpDown, GripVertical, Lock, Unlock } from "lucide-react";
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
import { AttendanceCell } from "./AttendanceCell";
import {
  calculateAttendanceRate,
  calculateGrade,
  getGradeColor,
} from "@/lib/attendance";
import type {
  TeamWithData,
  AttendanceStatus,
  Member,
  AttendanceRecord,
  DateColumn,
} from "@/types";

function SortableTableRow({ id, children, editRowId }: { id: string; children: React.ReactNode; editRowId?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
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

interface AttendanceTableProps {
  team: TeamWithData;
}

export function AttendanceTable({ team }: AttendanceTableProps) {
  const queryClient = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    gender: "MALE",
    birthYear: "",
  });
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; gender: string; birthYear: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", gender: "", birthYear: "" });
  const editingRef = useRef<string | null>(null);
  const editDataRef = useRef({ name: "", gender: "", birthYear: "" });

  const setEditing = useCallback((id: string | null, data?: { name: string; gender: string; birthYear: string }) => {
    editingRef.current = id;
    setEditingMember(id);
    if (data) { editDataRef.current = data; setEditData(data); }
  }, []);

  const updateEdit = useCallback((updater: (prev: typeof editData) => typeof editData) => {
    setEditData((prev) => { const next = updater(prev); editDataRef.current = next; return next; });
  }, []);

  type SortKey = "name" | "gender" | "birthYear" | "rate" | "grade";
  type SortDir = "none" | "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const attendanceMutation = useMutation({
    mutationFn: async ({
      memberId,
      attendanceDateId,
      status,
      awrReason,
    }: {
      memberId: string;
      attendanceDateId: string;
      status: AttendanceStatus | "";
      awrReason?: string;
    }) => {
      const res = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, attendanceDateId, status, awrReason }),
      });
      if (!res.ok) throw new Error("Failed to update attendance");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", team.id] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      gender: string;
      birthYear: string;
      teamId: string;
    }) => {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", team.id] });
      setShowAddMember(false);
      setNewMember({ name: "", gender: "MALE", birthYear: "" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", team.id] });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({
      memberId,
      data,
    }: {
      memberId: string;
      data: { name?: string; gender?: string; birthYear?: string };
    }) => {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update member");
      return res.json();
    },
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team", team.id] });
      if (editingRef.current === variables.memberId) { editingRef.current = null; setEditingMember(null); }
      savingRef.current = false;
    },
  });

  const addDateMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch("/api/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, teamId: team.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add date");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", team.id] });
      setShowDatePicker(false);
      setNewDate("");
    },
  });

  const deleteDateMutation = useMutation({
    mutationFn: async (dateId: string) => {
      const res = await fetch(`/api/dates/${dateId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete date");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", team.id] });
    },
  });

  const toggleLockMutation = useMutation({
    mutationFn: async ({ dateId, locked }: { dateId: string; locked: boolean }) => {
      const res = await fetch(`/api/dates/${dateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", team.id] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      const res = await fetch("/api/members/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, memberIds }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["team", team.id] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reset sort when dragging
    setSortKey(null);
    setSortDir("none");

    const list = sortedMembers;
    const oldIndex = list.findIndex((m) => m.id === active.id);
    const newIndex = list.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(list, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((m) => m.id));
  };

  const getAttendance = (
    member: Member & { attendances: AttendanceRecord[] },
    dateId: string
  ) => {
    return member.attendances.find((a) => a.attendanceDateId === dateId);
  };

  const getMemberStatuses = (
    member: Member & { attendances: AttendanceRecord[] },
    dates: DateColumn[]
  ) => {
    return dates.map((d) => {
      const att = getAttendance(member, d.id);
      return att?.status || "";
    });
  };

  const handleEditStart = (member: Member) => {
    savingRef.current = false;
    setEditing(member.id, {
      name: member.name,
      gender: member.gender,
      birthYear: String(member.birthYear),
    });
  };

  const handleEditSave = (memberId: string) => {
    if (editingRef.current === memberId) {
      updateMemberMutation.mutate({ memberId, data: editDataRef.current });
      editingRef.current = null;
    }
  };

  const savingRef = useRef(false);

  // Document click listener for auto-save on click outside
  useEffect(() => {
    if (!editingMember) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(`[data-edit-row="${editingMember}"]`)) return;
      if (savingRef.current || editingRef.current !== editingMember) return;
      savingRef.current = true;
      handleEditSave(editingMember);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMember]);

  const sortedMembers = useMemo(() => {
    if (!sortKey || sortDir === "none") return team.members;
    return [...team.members].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name, "ko");
      } else if (sortKey === "gender") {
        cmp = a.gender.localeCompare(b.gender);
      } else if (sortKey === "birthYear") {
        const toNum = (v: string) => { const n = parseInt(v) || 0; return n >= 50 ? 1900 + n : 2000 + n; };
        cmp = toNum(a.birthYear) - toNum(b.birthYear);
      } else {
        const rateA = calculateAttendanceRate(getMemberStatuses(a, team.dates));
        const rateB = calculateAttendanceRate(getMemberStatuses(b, team.dates));
        cmp = rateA - rateB;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [team.members, team.dates, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else {
      setSortDir((prev) =>
        prev === "desc" ? "asc" : prev === "asc" ? "none" : "desc"
      );
      if (sortDir === "asc") setSortKey(null);
    }
  };

  const sortIcon = (key: SortKey) => (
    <ArrowUpDown className={`h-3 w-3 inline-block ml-0.5 ${sortKey === key && sortDir !== "none" ? "text-indigo-600" : "text-gray-400"}`} />
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800">{team.name}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-1 text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3 w-3" />
            날짜 추가
          </button>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="flex items-center gap-1 text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5 hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-3 w-3" />
            순원 추가
          </button>
        </div>
      </div>

      {/* Date picker */}
      {showDatePicker && (
        <div className="px-4 py-3 border-b border-gray-100 bg-blue-50 flex items-center gap-3">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => newDate && addDateMutation.mutate(newDate)}
            disabled={!newDate || addDateMutation.isPending}
            className="text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50"
          >
            추가
          </button>
          <button
            onClick={() => setShowDatePicker(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            취소
          </button>
        </div>
      )}

      {/* Add member form with auto-complete */}
      {showAddMember && (
        <div className="px-4 py-3 border-b border-gray-100 bg-green-50 flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="이름 검색"
              value={newMember.name}
              onChange={async (e) => {
                const val = e.target.value;
                setNewMember((prev) => ({ ...prev, name: val }));
                if (val.length >= 1) {
                  try {
                    const isShalom = team.group?.name === "샬롬";
                    const url = isShalom
                      ? `/api/shalom/autocomplete?q=${encodeURIComponent(val)}`
                      : `/api/roster/autocomplete?groupName=${team.group?.name || ""}&q=${encodeURIComponent(val)}`;
                    const res = await fetch(url);
                    if (res.ok) {
                      const data = await res.json();
                      setSuggestions(data.suggestions);
                      setShowSuggestions(true);
                    }
                  } catch { /* ignore */ }
                } else {
                  setShowSuggestions(false);
                }
              }}
              onFocus={async () => {
                if (newMember.name.length >= 1) setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-48 max-h-40 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setNewMember({ name: s.name, gender: s.gender || "MALE", birthYear: s.birthYear || "" });
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 flex justify-between"
                  >
                    <span>{s.name}</span>
                    <span className="text-xs text-gray-400">{s.gender === "MALE" ? "남" : s.gender === "FEMALE" ? "여" : ""} {s.birthYear}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={newMember.gender}
            onChange={(e) =>
              setNewMember((prev) => ({ ...prev, gender: e.target.value }))
            }
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="MALE">남</option>
            <option value="FEMALE">여</option>
          </select>
          <input
            type="text"
            placeholder="또래"
            value={newMember.birthYear}
            onChange={(e) =>
              setNewMember((prev) => ({ ...prev, birthYear: e.target.value }))
            }
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() =>
              newMember.name &&
              addMemberMutation.mutate({ ...newMember, teamId: team.id })
            }
            disabled={!newMember.name || addMemberMutation.isPending}
            className="text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-50"
          >
            추가
          </button>
          <button
            onClick={() => setShowAddMember(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            취소
          </button>
        </div>
      )}

      {/* Table */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="bg-gray-50 px-1 py-2 w-6" />
              <th className="sticky left-0 z-10 bg-gray-50 px-1 py-2 text-center font-medium text-gray-400 w-8 min-w-[32px]">#</th>
              <th
                className="sticky left-8 z-10 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600 w-16 min-w-[64px] cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("name")}
              >
                이름{sortIcon("name")}
              </th>
              <th
                className="sticky left-24 z-10 bg-gray-50 px-1 py-2 text-center font-medium text-gray-600 w-10 min-w-[40px] whitespace-nowrap cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("gender")}
              >
                성별{sortIcon("gender")}
              </th>
              <th
                className="sticky left-[136px] z-10 bg-gray-50 px-1 py-2 text-center font-medium text-gray-600 w-14 min-w-[56px] cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("birthYear")}
              >
                또래{sortIcon("birthYear")}
              </th>
              {team.dates.map((date) => (
                <th
                  key={date.id}
                  className="px-1 py-2 text-center font-medium text-gray-600 min-w-[56px]"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs">{date.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleLockMutation.mutate({ dateId: date.id, locked: !date.locked })}
                        className={`transition-colors flex-shrink-0 ${date.locked ? "text-red-400 hover:text-red-600" : "text-gray-300 hover:text-gray-500"}`}
                        title={date.locked ? "잠금 해제" : "잠금"}
                      >
                        {date.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("이 날짜를 삭제하시겠습니까?")) {
                            deleteDateMutation.mutate(date.id);
                          }
                        }}
                        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
              <th
                className="px-2 py-2 text-center font-medium text-gray-600 min-w-[50px] cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("rate")}
              >
                출석률{sortIcon("rate")}
              </th>
              <th
                className="px-2 py-2 text-center font-medium text-gray-600 min-w-[36px] cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("grade")}
              >
                등급{sortIcon("grade")}
              </th>
              <th className="px-1 py-2 w-8" />
            </tr>
          </thead>
          <SortableContext items={sortedMembers.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <tbody>
            {sortedMembers.map((member, idx) => {
              const statuses = getMemberStatuses(member, team.dates);
              const rate = calculateAttendanceRate(statuses);
              const grade = calculateGrade(rate);
              const isEditing = editingMember === member.id;

              return (
                <SortableTableRow key={member.id} id={member.id} editRowId={isEditing ? member.id : undefined}>
                  <td className="sticky left-0 z-10 bg-white px-1 py-1 text-center text-xs text-gray-400 w-8">{idx + 1}</td>
                  {/* Name */}
                  <td className="sticky left-8 z-10 bg-white px-2 py-1 w-16">
                    {isEditing ? (
                      <input type="text" value={editData.name}
                        onChange={(e) => updateEdit((p) => ({ ...p, name: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(member.id); if (e.key === "Escape") { editingRef.current = null; setEditingMember(null); } }}
                                                className="w-full text-sm border border-indigo-300 rounded px-1 py-0.5 focus:outline-none" />
                    ) : (
                      <button onClick={() => handleEditStart(member)} className="text-left text-sm hover:text-indigo-600 transition-colors truncate block w-full">{member.name}</button>
                    )}
                  </td>
                  {/* Gender */}
                  <td className="sticky left-24 z-10 bg-white px-1 py-1 text-center w-10">
                    {isEditing ? (
                      <select value={editData.gender}
                        onChange={(e) => updateEdit((p) => ({ ...p, gender: e.target.value }))}
                                                className="text-xs border border-indigo-300 rounded px-0.5 py-0.5 w-full">
                        <option value="MALE">남</option><option value="FEMALE">여</option>
                      </select>
                    ) : (
                      <span className="text-xs text-gray-500 cursor-pointer" onClick={() => handleEditStart(member)}>{member.gender === "MALE" ? "남" : "여"}</span>
                    )}
                  </td>
                  {/* Birth Year */}
                  <td className="sticky left-[136px] z-10 bg-white px-1 py-1 text-center w-14">
                    {isEditing ? (
                      <input type="text" value={editData.birthYear}
                        onChange={(e) => updateEdit((p) => ({ ...p, birthYear: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(member.id); if (e.key === "Escape") { editingRef.current = null; setEditingMember(null); } }}
                                                className="w-full text-xs border border-indigo-300 rounded px-1 py-0.5 text-center" />
                    ) : (
                      <span className="text-xs text-gray-500 cursor-pointer" onClick={() => handleEditStart(member)}>{member.birthYear}</span>
                    )}
                  </td>
                  {/* Attendance cells */}
                  {team.dates.map((date) => {
                    const att = getAttendance(member, date.id);
                    return (
                      <td key={date.id} className="px-0 py-1 text-center">
                        <div className="flex justify-center">
                          <AttendanceCell
                            status={
                              (att?.status as AttendanceStatus | "") || ""
                            }
                            awrReason={att?.awrReason || null}
                            locked={!!date.locked}
                            onChange={(status, awrReason) => {
                              attendanceMutation.mutate({
                                memberId: member.id,
                                attendanceDateId: date.id,
                                status,
                                awrReason,
                              });
                            }}
                          />
                        </div>
                      </td>
                    );
                  })}
                  {/* Rate */}
                  <td className="px-2 py-1 text-center">
                    <span className="text-xs font-medium text-gray-700">
                      {rate.toFixed(0)}%
                    </span>
                  </td>
                  {/* Grade */}
                  <td className="px-2 py-1 text-center">
                    <span
                      className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded ${getGradeColor(grade)}`}
                    >
                      {grade}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-1 py-1">
                    {isEditing ? (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleEditSave(member.id)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => { editingRef.current = null; setEditingMember(null); }}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`${member.name}님을 삭제하시겠습니까?`)) {
                            deleteMemberMutation.mutate(member.id);
                          }
                        }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </SortableTableRow>
              );
            })}
          </tbody>
          </SortableContext>
        </table>

        {team.members.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>아직 순원이 없습니다.</p>
            <p className="text-sm mt-1">위의 &quot;순원 추가&quot; 버튼을 클릭하여 순원을 추가하세요.</p>
          </div>
        )}
      </div>
      </DndContext>
    </div>
  );
}
