"use client";

import { useState, useMemo, useRef, useLayoutEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowUpDown, GripVertical, Lock, Unlock, ChevronLeft, ChevronRight, CheckCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAttendanceMutation } from "@/hooks/useAttendanceMutation";
import { useBulkMarkPresent } from "@/hooks/useBulkMarkPresent";
import { useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { HelpTip } from "@/components/HelpTip";
import { STATUS_OPTIONS } from "@/lib/attendance-status";
import { helpAnswer } from "@/content/help";
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
import { PrayerNoteCell } from "./PrayerNoteCell";
import {
  calculateAttendanceRate,
  calculateGrade,
  getGradeColor,
} from "@/lib/attendance";
import { computePeerGroup } from "@/lib/profile";
import { usePrayerNoteMutation } from "@/hooks/usePrayerNoteMutation";
import type {
  TeamWithData,
  AttendanceStatus,
  Member,
  AttendanceRecord,
  DateColumn,
} from "@/types";

function getAttendance(
  member: Member & { attendances: AttendanceRecord[] },
  dateId: string
) {
  return member.attendances.find((a) => a.attendanceDateId === dateId);
}

function getPrayerNote(member: Member, dateId: string) {
  return member.prayerNotes?.find((n) => n.attendanceDateId === dateId);
}

function getMemberStatuses(
  member: Member & { attendances: AttendanceRecord[] },
  dates: DateColumn[]
) {
  return dates.map((d) => {
    const att = getAttendance(member, d.id);
    return att?.status || "";
  });
}

function SortableTableRow({ id, children, editRowId }: { id: string; children: React.ReactNode; editRowId?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style} className="group border-b border-gray-100 hover:bg-gray-50" {...attributes} data-edit-row={editRowId || undefined}>
      <td className="hidden lg:table-cell bg-white px-1 py-1 text-center w-6">
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
  className?: string;
}

export function AttendanceTable({ team, className }: AttendanceTableProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const canManageMembers =
    user?.role === "PASTOR" ||
    (user?.role === "EXECUTIVE" && user?.groupId === team.groupId);
  const canManageDates = user?.role === "PASTOR" || user?.role === "EXECUTIVE";
  const canLockDates =
    user?.role === "PASTOR" || user?.role === "EXECUTIVE" || user?.role === "LEADER";
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    gender: "남",
    birthYear: "",
    birthday: "",
  });
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; gender: string; birthYear: string; birthday: string; groupName: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [isNavPending, startNavTransition] = useTransition();
  const [navigatingMemberId, setNavigatingMemberId] = useState<string | null>(null);

  const handleNavigateToMember = (memberId: string) => {
    setNavigatingMemberId(memberId);
    startNavTransition(() => {
      router.push(`/dashboard/roster/member/${memberId}`);
    });
  };

  type SortKey = "name" | "gender" | "birthYear" | "rate" | "grade";
  type SortDir = "none" | "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const { showToast } = useToast();
  const { markAllPresent, isPending: bulkMarkPending } = useBulkMarkPresent(team);

  const [confirmDeleteDate, setConfirmDeleteDate] = useState<DateColumn | null>(null);
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<Member | null>(null);

  const attendanceMutation = useAttendanceMutation(team.id);
  const prayerNoteMutation = usePrayerNoteMutation(team.id);

  const addMemberMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      gender: string;
      birthYear: string;
      birthday: string;
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
      setNewMember({ name: "", gender: "남", birthYear: "", birthday: "" });
    },
    onError: () => showToast("저장 실패 — 다시 시도해주세요"),
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
    onError: () => showToast("저장 실패 — 다시 시도해주세요"),
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
    onError: (err) => showToast(err instanceof Error ? err.message : "저장 실패 — 다시 시도해주세요"),
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
    onError: () => showToast("저장 실패 — 다시 시도해주세요"),
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
    onError: () => showToast("저장 실패 — 다시 시도해주세요"),
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
    onError: () => showToast("저장 실패 — 다시 시도해주세요"),
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

  // The render-time setStableMemberIds below (dnd-kit stability, see its
  // comment) is what breaks Compiler's ability to preserve this memoization;
  // a deliberate tradeoff per CLAUDE.md's React Compiler guidance, not a bug.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
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

  // sortedMembers gets a new array reference on every attendance-cell tap
  // (the optimistic update replaces team.members), even though the actual
  // ordered id list is unchanged. Adjusting this state during render (React's
  // documented pattern for deriving state from changed inputs) keeps
  // SortableContext's `items` prop referentially stable across those taps,
  // so dnd-kit doesn't recompute sortable transforms for every row on tap.
  const [stableMemberIds, setStableMemberIds] = useState<string[]>(() =>
    sortedMembers.map((m) => m.id)
  );
  const nextMemberIds = sortedMembers.map((m) => m.id);
  const memberIdsChanged =
    nextMemberIds.length !== stableMemberIds.length ||
    nextMemberIds.some((id, i) => id !== stableMemberIds[i]);
  if (memberIdsChanged) {
    setStableMemberIds(nextMemberIds);
  }

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

  // Default the horizontal scroll to the most recent past-or-today date column
  // instead of the chronologically-first one, since PASTOR users mark
  // attendance for recent dates, not the team's oldest date.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nameThRef = useRef<HTMLTableCellElement>(null);
  const dateThRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const hasAutoScrolledRef = useRef(false);

  const targetDateId = useMemo(() => {
    const toDayTime = (d: string | Date) => {
      const dt = new Date(d);
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
    };
    const todayTime = toDayTime(new Date());
    let bestId: string | null = null;
    let bestTime = -Infinity;
    for (const d of team.dates) {
      const t = toDayTime(d.date);
      if (t <= todayTime && t > bestTime) {
        bestTime = t;
        bestId = d.id;
      }
    }
    // Fall back to the first date (same as TodayAttendanceList's defaultDateId)
    // when every date is in the future — a team with only upcoming Sundays
    // pre-added otherwise got `null` here, which hid the entire nav bar
    // (prev/next/오늘/counter) with zero scroll affordance on a wide table.
    return bestId ?? team.dates[0]?.id ?? null;
  }, [team.dates]);

  useLayoutEffect(() => {
    if (hasAutoScrolledRef.current || !targetDateId) return;
    const container = scrollContainerRef.current;
    const nameTh = nameThRef.current;
    const targetTh = dateThRefs.current.get(targetDateId);
    if (!container || !nameTh || !targetTh) return;
    if (container.clientWidth === 0) return;
    const delta = targetTh.getBoundingClientRect().left - nameTh.getBoundingClientRect().right;
    container.scrollLeft = container.scrollLeft + delta;
    hasAutoScrolledRef.current = true;
  });

  // ‹ / › / 오늘 nav (A9) — reuses the dateThRefs scroll machinery above.
  // No filtering: all date columns stay visible, this just scrolls the
  // focused one into view and drives the "N명 중 M명 기록됨" counter (A8).
  const [navDateId, setNavDateId] = useState<string | null>(targetDateId);
  const navIndex = navDateId ? team.dates.findIndex((d) => d.id === navDateId) : -1;
  const navDate = navIndex >= 0 ? team.dates[navIndex] : null;
  const navRecordedCount = navDate
    ? team.members.filter((m) => getAttendance(m, navDate.id)).length
    : 0;

  const scrollDateIntoView = (dateId: string) => {
    dateThRefs.current.get(dateId)?.scrollIntoView({ inline: "center", block: "nearest" });
  };
  const goPrevDate = () => {
    if (navIndex > 0) {
      const d = team.dates[navIndex - 1];
      setNavDateId(d.id);
      scrollDateIntoView(d.id);
    }
  };
  const goNextDate = () => {
    if (navIndex >= 0 && navIndex < team.dates.length - 1) {
      const d = team.dates[navIndex + 1];
      setNavDateId(d.id);
      scrollDateIntoView(d.id);
    }
  };
  const goToday = () => {
    if (!targetDateId) return;
    setNavDateId(targetDateId);
    scrollDateIntoView(targetDateId);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800">{team.name}</h3>
        <div className="flex items-center gap-2">
          {canManageDates && (
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-1 text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3 w-3" />
              날짜 추가
            </button>
          )}
          {canManageMembers && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="flex items-center gap-1 text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5 hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-3 w-3" />
              순원 추가
            </button>
          )}
        </div>
      </div>

      {/* Legend (A1) + date nav / recorded count (A8/A9) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {STATUS_OPTIONS.map((o) => (
            <span key={o.value || "blank"} className="inline-flex items-center gap-1">
              <span className={`font-bold ${o.colorClass}`}>{o.glyph}</span>
              <span>{o.meaning}</span>
              {o.value === "" && <HelpTip text={helpAnswer("a14")} />}
            </span>
          ))}
          <span className="flex items-center gap-1 text-gray-400">
            <Lock className="h-3 w-3" />
            잠금
            <HelpTip text={helpAnswer("a13")} />
          </span>
        </div>
        {navDate && (
          <div className="flex items-center gap-1">
            <button
              onClick={goPrevDate}
              disabled={navIndex <= 0}
              className="w-7 h-7 flex items-center justify-center text-gray-400 disabled:opacity-30 hover:text-indigo-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium text-gray-700 min-w-[64px] text-center">{navDate.label}</span>
            <button
              onClick={goNextDate}
              disabled={navIndex < 0 || navIndex >= team.dates.length - 1}
              className="w-7 h-7 flex items-center justify-center text-gray-400 disabled:opacity-30 hover:text-indigo-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={goToday} className="text-indigo-600 hover:underline px-1">
              오늘
            </button>
            <span className="text-gray-400">
              · {team.members.length}명 중 {navRecordedCount}명 기록됨
            </span>
          </div>
        )}
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

      {/* Add member form — dropdown only */}
      {showAddMember && (
        <div className="px-4 py-3 border-b border-gray-100 bg-green-50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="이름 검색..."
              value={newMember.name}
              onChange={async (e) => {
                const val = e.target.value;
                setNewMember((prev) => ({ ...prev, name: val, gender: "", birthYear: "", birthday: "" }));
                if (val.length >= 1) {
                  try {
                    const isShalom = team.group?.name === "샬롬";
                    const url = isShalom
                      ? `/api/shalom/autocomplete?q=${encodeURIComponent(val)}`
                      : `/api/roster/autocomplete?groupName=${encodeURIComponent(team.group?.name || "")}&teamName=${encodeURIComponent(team.name)}&teamId=${encodeURIComponent(team.id)}&q=${encodeURIComponent(val)}`;
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
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setNewMember({ name: s.name, gender: s.gender || "남", birthYear: s.birthYear || "", birthday: s.birthday || "" });
                      setShowSuggestions(false);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex justify-between border-b border-gray-50"
                  >
                    <span className="font-medium">{s.name}</span>
                    {s.groupName !== team.group?.name && (
                      <span className="text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                        {s.groupName || "미배정"}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{s.gender || ""} {computePeerGroup(s.birthday, s.birthYear)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {newMember.gender && (
            <span className="text-xs text-gray-500 bg-white rounded-lg px-2 py-1.5 border border-gray-200">
              {newMember.gender} · {computePeerGroup(newMember.birthday, newMember.birthYear)}
            </span>
          )}
          <button
            onClick={() => {
              if (!newMember.name || !newMember.gender) {
                alert("목록에서 순원을 선택해주세요.");
                return;
              }
              addMemberMutation.mutate({ ...newMember, teamId: team.id });
            }}
            disabled={addMemberMutation.isPending}
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
      <div className="overflow-x-auto" ref={scrollContainerRef}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="hidden lg:table-cell bg-gray-50 px-1 py-2 w-6" />
              <th className="hidden lg:table-cell bg-gray-50 px-1 py-2 text-center font-medium text-gray-400 w-8 min-w-[32px]">#</th>
              <th
                ref={nameThRef}
                className="sticky left-0 z-20 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600 w-16 min-w-[64px] cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("name")}
              >
                이름{sortIcon("name")}
              </th>
              <th
                className="hidden lg:table-cell bg-gray-50 px-1 py-2 text-center font-medium text-gray-600 w-10 min-w-[40px] whitespace-nowrap cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("gender")}
              >
                성별{sortIcon("gender")}
              </th>
              <th
                className="hidden lg:table-cell bg-gray-50 px-1 py-2 text-center font-medium text-gray-600 w-14 min-w-[56px] cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort("birthYear")}
              >
                또래{sortIcon("birthYear")}
              </th>
              {team.dates.map((date) => (
                <th
                  key={date.id}
                  ref={(el) => {
                    if (el) dateThRefs.current.set(date.id, el);
                    else dateThRefs.current.delete(date.id);
                  }}
                  className="px-1 py-2 text-center font-medium text-gray-600 min-w-[88px]"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs">{date.label}</span>
                    <div className="flex items-center">
                      <button
                        onClick={() => markAllPresent(date.id)}
                        disabled={!!date.locked || bulkMarkPending}
                        title="전체 출석 체크 (빈칸만 채웁니다)"
                        className="hidden lg:inline-flex items-center justify-center w-11 h-11 text-gray-300 hover:text-indigo-500 transition-colors flex-shrink-0 disabled:opacity-30"
                      >
                        <CheckCheck className="h-3 w-3" />
                      </button>
                      {canLockDates && (
                        // Lock stays visible at every width — LEADER (mobile-only in
                        // practice) can lock/unlock dates too, unlike the PASTOR/
                        // EXECUTIVE-only bulk-check button above. Delete is gated
                        // separately below to PASTOR/EXECUTIVE only: date columns are
                        // shared structure and deleting one cascades every member's
                        // attendance for that date, so a leader must not be able to.
                        <button
                          onClick={() => toggleLockMutation.mutate({ dateId: date.id, locked: !date.locked })}
                          className={`inline-flex items-center justify-center w-11 h-11 transition-colors flex-shrink-0 ${date.locked ? "text-red-400 hover:text-red-600" : "text-gray-300 hover:text-gray-500"}`}
                          title={date.locked ? "잠금 해제" : "잠금"}
                        >
                          {date.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        </button>
                      )}
                      {canManageDates && (
                        <button
                          onClick={() => setConfirmDeleteDate(date)}
                          className="inline-flex items-center justify-center w-11 h-11 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
              <th
                className="sticky right-14 lg:right-[100px] z-20 bg-gray-50 px-2 py-2 text-center font-medium text-gray-600 w-[72px] cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap"
                onClick={() => toggleSort("rate")}
              >
                출석률{sortIcon("rate")} <HelpTip text={helpAnswer("b2")} />
              </th>
              <th
                className="sticky right-0 lg:right-11 z-20 bg-gray-50 px-2 py-2 text-center font-medium text-gray-600 w-[56px] cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap"
                onClick={() => toggleSort("grade")}
              >
                등급{sortIcon("grade")} <HelpTip text={helpAnswer("b4")} />
              </th>
              <th className="hidden lg:table-cell sticky right-0 z-20 bg-gray-50 px-1 py-2 w-11" />
            </tr>
          </thead>
          <SortableContext items={stableMemberIds} strategy={verticalListSortingStrategy}>
          <tbody>
            {sortedMembers.map((member, idx) => {
              const statuses = getMemberStatuses(member, team.dates);
              const rate = calculateAttendanceRate(statuses);
              const grade = calculateGrade(rate);
              return (
                <SortableTableRow key={member.id} id={member.id}>
                  <td className="hidden lg:table-cell bg-white px-1 py-1 text-center text-xs text-gray-400 w-8">{idx + 1}</td>
                  {/* Name */}
                  <td className="sticky left-0 z-20 bg-white group-hover:bg-gray-50 px-2 py-1 w-16">
                    {canManageMembers ? (
                      <button
                        type="button"
                        onClick={() => handleNavigateToMember(member.id)}
                        disabled={isNavPending && navigatingMemberId === member.id}
                        className={`text-left text-sm truncate block w-full hover:text-indigo-600 hover:underline cursor-pointer transition-opacity ${
                          isNavPending && navigatingMemberId === member.id
                            ? "opacity-50 cursor-wait"
                            : ""
                        }`}
                      >
                        {member.name}
                      </button>
                    ) : (
                      <span className="text-left text-sm truncate block w-full">{member.name}</span>
                    )}
                  </td>
                  {/* Gender */}
                  <td className="hidden lg:table-cell bg-white px-1 py-1 text-center w-10">
                    <span className={`text-xs font-medium ${member.gender === "남" ? "text-blue-600" : member.gender === "여" ? "text-red-600" : "text-gray-500"}`}>{member.gender || "-"}</span>
                  </td>
                  {/* Birth Year */}
                  <td className="hidden lg:table-cell bg-white px-1 py-1 text-center w-14">
                    <span className="text-xs text-gray-500">{computePeerGroup(member.birthday, member.birthYear)}</span>
                  </td>
                  {/* Attendance cells + prayer notes */}
                  {team.dates.map((date) => {
                    const att = getAttendance(member, date.id);
                    const note = getPrayerNote(member, date.id);
                    return (
                      <td key={date.id} className="px-0 py-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <AttendanceCell
                            status={
                              (att?.status as AttendanceStatus | "") || ""
                            }
                            awrReason={att?.awrReason || null}
                            locked={!!date.locked}
                            onChange={(status, awrReason) => {
                              attendanceMutation.mutate(
                                {
                                  memberId: member.id,
                                  attendanceDateId: date.id,
                                  status,
                                  awrReason,
                                },
                                { onError: () => showToast("저장 실패 — 다시 시도해주세요") }
                              );
                            }}
                          />
                          <PrayerNoteCell
                            text={note?.text || ""}
                            locked={!!date.locked}
                            onChange={(text) => {
                              prayerNoteMutation.mutate(
                                { memberId: member.id, attendanceDateId: date.id, text },
                                { onError: () => showToast("저장 실패 — 다시 시도해주세요") }
                              );
                            }}
                          />
                        </div>
                      </td>
                    );
                  })}
                  {/* Rate */}
                  <td className="sticky right-14 lg:right-[100px] z-20 bg-white group-hover:bg-gray-50 px-2 py-1 text-center w-[72px]">
                    <span className="text-xs font-medium text-gray-700">
                      {rate >= 0 ? `${rate.toFixed(0)}%` : "-"}
                    </span>
                  </td>
                  {/* Grade */}
                  <td className="sticky right-0 lg:right-11 z-20 bg-white group-hover:bg-gray-50 px-2 py-1 text-center w-[56px]">
                    <span
                      className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded ${getGradeColor(grade)}`}
                    >
                      {grade}
                    </span>
                  </td>
                  {/* Delete (pastor/exec only) */}
                  <td className="hidden lg:table-cell sticky right-0 z-20 bg-white group-hover:bg-gray-50 px-1 py-1 w-11">
                    {canManageMembers && (
                      <button
                        onClick={() => setConfirmDeleteMember(member)}
                        className="flex items-center justify-center w-11 h-11 text-gray-300 hover:text-red-500 transition-colors"
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

        {team.members.length > 0 && team.dates.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>아직 등록된 날짜가 없습니다.</p>
            <p className="text-sm mt-1">위의 &quot;날짜 추가&quot; 버튼을 클릭하여 날짜를 추가하세요.</p>
          </div>
        )}
      </div>
      </DndContext>

      <ConfirmDialog
        open={!!confirmDeleteDate}
        onOpenChange={(open) => !open && setConfirmDeleteDate(null)}
        title="날짜 삭제"
        description={confirmDeleteDate ? `"${confirmDeleteDate.label}" 날짜를 삭제하시겠습니까?` : ""}
        impact={
          confirmDeleteDate
            ? [`이 날짜의 출석 기록 ${team.members.filter((m) => getAttendance(m, confirmDeleteDate.id)).length}건 삭제`]
            : []
        }
        pending={deleteDateMutation.isPending}
        onConfirm={() => {
          if (!confirmDeleteDate) return;
          deleteDateMutation.mutate(confirmDeleteDate.id, {
            onSuccess: () => setConfirmDeleteDate(null),
          });
        }}
      />

      <ConfirmDialog
        open={!!confirmDeleteMember}
        onOpenChange={(open) => !open && setConfirmDeleteMember(null)}
        title="순원 삭제"
        description={confirmDeleteMember ? `${confirmDeleteMember.name}님을 삭제하시겠습니까?` : ""}
        pending={deleteMemberMutation.isPending}
        onConfirm={() => {
          if (!confirmDeleteMember) return;
          deleteMemberMutation.mutate(confirmDeleteMember.id, {
            onSuccess: () => setConfirmDeleteMember(null),
          });
        }}
      />
    </div>
  );
}
