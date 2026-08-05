"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { useAttendanceMutation } from "@/hooks/useAttendanceMutation";
import type { AttendanceStatus, AttendanceRecord, Member, TeamWithData } from "@/types";

interface TodayAttendanceListProps {
  team: TeamWithData;
  className?: string;
}

const STATUS_BUTTONS: { status: AttendanceStatus; label: string; active: string }[] = [
  { status: "HERE", label: "출석", active: "bg-green-600 text-white border-green-600" },
  { status: "ABSENT", label: "결석", active: "bg-red-500 text-white border-red-500" },
  { status: "AWR", label: "사유결석", active: "bg-yellow-500 text-white border-yellow-500" },
];

function getAttendance(
  member: Member & { attendances: AttendanceRecord[] },
  dateId: string
) {
  return member.attendances.find((a) => a.attendanceDateId === dateId);
}

export function TodayAttendanceList({ team, className }: TodayAttendanceListProps) {
  const attendanceMutation = useAttendanceMutation(team.id);

  // Default to the most recent past-or-today date, same logic as AttendanceTable's targetDateId.
  const defaultDateId = useMemo(() => {
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
    return bestId ?? team.dates[0]?.id ?? null;
  }, [team.dates]);

  const [selectedDateId, setSelectedDateId] = useState<string | null>(defaultDateId);
  const [reasonEditId, setReasonEditId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [bulkPending, setBulkPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastMarkedIds, setLastMarkedIds] = useState<string[] | null>(null);
  const [undoPending, setUndoPending] = useState(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = (message: string) => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    setErrorMessage(message);
    errorTimeoutRef.current = setTimeout(() => setErrorMessage(null), 4000);
  };

  const currentIndex = selectedDateId
    ? team.dates.findIndex((d) => d.id === selectedDateId)
    : -1;
  const selectedDate = currentIndex >= 0 ? team.dates[currentIndex] : null;

  const changeDate = (dateId: string) => {
    setSelectedDateId(dateId);
    setLastMarkedIds(null);
    setReasonEditId(null);
  };

  if (team.dates.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className || ""}`}>
        <div className="text-center py-12 text-gray-400">
          <p>아직 등록된 날짜가 없습니다.</p>
          <p className="text-sm mt-1">날짜를 추가하여 출석을 기록하세요.</p>
        </div>
      </div>
    );
  }

  const recordedCount = selectedDateId
    ? team.members.filter((m) => getAttendance(m, selectedDateId)).length
    : 0;

  const locked = !!selectedDate?.locked;

  const handleStatusTap = (member: Member & { attendances: AttendanceRecord[] }, status: AttendanceStatus) => {
    if (!selectedDateId || locked) return;
    setLastMarkedIds(null);
    const att = getAttendance(member, selectedDateId);
    const nextStatus = att?.status === status ? "" : status;
    attendanceMutation.mutate(
      {
        memberId: member.id,
        attendanceDateId: selectedDateId,
        status: nextStatus,
        awrReason: att?.awrReason || undefined,
      },
      { onError: () => showError("저장 실패 — 다시 시도해주세요") }
    );
  };

  const openReasonEditor = (member: Member & { attendances: AttendanceRecord[] }) => {
    if (reasonEditId === member.id) {
      setReasonEditId(null);
      return;
    }
    const att = selectedDateId ? getAttendance(member, selectedDateId) : undefined;
    setReasonDraft(att?.awrReason || "");
    setReasonEditId(member.id);
  };

  const saveReason = (member: Member & { attendances: AttendanceRecord[] }) => {
    if (!selectedDateId || locked) return;
    const att = getAttendance(member, selectedDateId);
    if (!att || (att.status !== "ABSENT" && att.status !== "AWR")) return;
    attendanceMutation.mutate(
      {
        memberId: member.id,
        attendanceDateId: selectedDateId,
        status: att.status,
        awrReason: reasonDraft || undefined,
      },
      { onError: () => showError("저장 실패 — 다시 시도해주세요") }
    );
    setReasonEditId(null);
  };

  const handleMarkAllPresent = async () => {
    if (!selectedDateId || locked) return;
    const blankMembers = team.members.filter((m) => !getAttendance(m, selectedDateId));
    if (blankMembers.length === 0) return;
    setBulkPending(true);
    setLastMarkedIds(null);
    const results = await Promise.allSettled(
      blankMembers.map((m) =>
        attendanceMutation.mutateAsync({
          memberId: m.id,
          attendanceDateId: selectedDateId,
          status: "HERE",
        })
      )
    );
    const succeededIds = blankMembers
      .filter((_, i) => results[i].status === "fulfilled")
      .map((m) => m.id);
    const failedCount = results.filter((r) => r.status === "rejected").length;
    setBulkPending(false);
    if (succeededIds.length > 0) setLastMarkedIds(succeededIds);
    if (failedCount > 0) showError(`${failedCount}명 저장 실패 — 다시 시도해주세요`);
  };

  const handleUndo = async () => {
    if (!selectedDateId || !lastMarkedIds || lastMarkedIds.length === 0) return;
    setUndoPending(true);
    const results = await Promise.allSettled(
      lastMarkedIds.map((memberId) =>
        attendanceMutation.mutateAsync({
          memberId,
          attendanceDateId: selectedDateId,
          status: "",
        })
      )
    );
    const failedCount = results.filter((r) => r.status === "rejected").length;
    setUndoPending(false);
    setLastMarkedIds(null);
    if (failedCount > 0) showError(`${failedCount}명 되돌리기 실패 — 다시 시도해주세요`);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className || ""}`}>
      {/* Date nav */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-gray-50">
        <button
          onClick={() => currentIndex > 0 && changeDate(team.dates[currentIndex - 1].id)}
          disabled={currentIndex <= 0}
          className="w-11 h-11 flex items-center justify-center text-gray-500 disabled:opacity-30 disabled:cursor-default hover:text-indigo-600"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <select
          value={selectedDateId ?? ""}
          onChange={(e) => changeDate(e.target.value)}
          className="flex-1 min-h-[44px] text-sm font-medium text-gray-800 border border-gray-300 rounded-lg px-2 text-center"
        >
          {team.dates.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            currentIndex >= 0 &&
            currentIndex < team.dates.length - 1 &&
            changeDate(team.dates[currentIndex + 1].id)
          }
          disabled={currentIndex < 0 || currentIndex >= team.dates.length - 1}
          className="w-11 h-11 flex items-center justify-center text-gray-500 disabled:opacity-30 disabled:cursor-default hover:text-indigo-600"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Mark all present / undo */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
        <button
          onClick={handleMarkAllPresent}
          disabled={bulkPending || locked || !selectedDateId}
          className="flex-1 min-h-[44px] text-sm font-medium bg-indigo-600 text-white rounded-lg px-3 hover:bg-indigo-700 disabled:opacity-50"
        >
          {bulkPending ? "처리 중..." : "전체 출석 체크"}
        </button>
        {lastMarkedIds && lastMarkedIds.length > 0 && (
          <button
            onClick={handleUndo}
            disabled={undoPending}
            className="min-h-[44px] text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-3 hover:bg-gray-50 disabled:opacity-50"
          >
            {undoPending ? "되돌리는 중..." : "되돌리기"}
          </button>
        )}
      </div>

      {locked && (
        <div className="px-3 py-2 text-xs text-red-500 bg-red-50 border-b border-red-100">
          잠긴 날짜입니다. 수정할 수 없습니다.
        </div>
      )}

      {/* Member rows */}
      <div className="divide-y divide-gray-100">
        {team.members.map((member) => {
          const att = selectedDateId ? getAttendance(member, selectedDateId) : undefined;
          const status = att?.status;
          const canHaveReason = status === "ABSENT" || status === "AWR";
          return (
            <div key={member.id} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-16 min-w-[64px] text-sm truncate">{member.name}</span>
                <div className="flex flex-1 gap-1.5">
                  {STATUS_BUTTONS.map((b) => (
                    <button
                      key={b.status}
                      onClick={() => handleStatusTap(member, b.status)}
                      disabled={locked}
                      className={`flex-1 min-h-[44px] text-xs font-medium rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-default ${
                        status === b.status
                          ? b.active
                          : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                  {canHaveReason && (
                    <button
                      onClick={() => openReasonEditor(member)}
                      className="relative w-9 min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {att?.awrReason && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {reasonEditId === member.id && (
                <div className="mt-2 flex gap-1.5">
                  <input
                    type="text"
                    value={reasonDraft}
                    onChange={(e) => setReasonDraft(e.target.value)}
                    disabled={locked}
                    placeholder="사유 (선택)"
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 min-h-[44px] focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
                    onKeyDown={(e) => {
                      if (locked) return;
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) saveReason(member);
                      if (e.key === "Escape") setReasonEditId(null);
                    }}
                  />
                  {!locked && (
                    <button
                      onClick={() => saveReason(member)}
                      className="min-h-[44px] text-xs bg-indigo-600 text-white rounded-lg px-3 hover:bg-indigo-700"
                    >
                      확인
                    </button>
                  )}
                  <button
                    onClick={() => setReasonEditId(null)}
                    className="min-h-[44px] text-xs bg-gray-100 text-gray-600 rounded-lg px-3 hover:bg-gray-200"
                  >
                    {locked ? "닫기" : "취소"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100 text-center text-xs text-gray-400">
        {team.members.length}명 중 {recordedCount}명 기록됨
      </div>

      {errorMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-lg">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
