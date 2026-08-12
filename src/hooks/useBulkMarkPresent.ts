"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http";
import { useToast } from "@/components/Toast";
import type { TeamWithData } from "@/types";

interface LastMarked {
  dateId: string;
  memberIds: string[];
}

// Shared "mark all blank members present for this date" + undo logic, used
// by both AttendanceTable (desktop, per date column) and TodayAttendanceList
// (mobile). Goes through /api/attendance/bulk (one transaction) instead of
// N parallel PATCH calls, so a partial failure can't stomp the optimistic
// cache for the other members that did succeed.
export function useBulkMarkPresent(team: TeamWithData) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [lastMarked, setLastMarked] = useState<LastMarked | null>(null);

  const bulkMutation = useMutation({
    mutationFn: async (vars: { attendanceDateId: string; memberIds: string[]; status: "HERE" | "" }) =>
      fetchJson<{ memberIds: string[] }>("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", team.id] });
    },
    onError: () => showToast("저장 실패 — 다시 시도해주세요"),
  });

  const markAllPresent = (dateId: string) => {
    const blankMemberIds = team.members
      .filter((m) => !m.attendances.some((a) => a.attendanceDateId === dateId))
      .map((m) => m.id);
    if (blankMemberIds.length === 0) return;
    bulkMutation.mutate(
      { attendanceDateId: dateId, memberIds: blankMemberIds, status: "HERE" },
      { onSuccess: () => setLastMarked({ dateId, memberIds: blankMemberIds }) }
    );
  };

  const undo = () => {
    if (!lastMarked) return;
    bulkMutation.mutate(
      { attendanceDateId: lastMarked.dateId, memberIds: lastMarked.memberIds, status: "" },
      { onSuccess: () => setLastMarked(null) }
    );
  };

  return {
    markAllPresent,
    undo,
    lastMarked,
    isPending: bulkMutation.isPending,
  };
}
