import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TeamWithData, AttendanceStatus, AttendanceRecord } from "@/types";

export function useAttendanceMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
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
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["team", teamId] });
      const previous = queryClient.getQueryData<TeamWithData>(["team", teamId]);
      if (previous) {
        queryClient.setQueryData<TeamWithData>(["team", teamId], {
          ...previous,
          members: previous.members.map((m) => {
            if (m.id !== vars.memberId) return m;
            const others = m.attendances.filter(
              (a) => a.attendanceDateId !== vars.attendanceDateId
            );
            if (!vars.status) return { ...m, attendances: others };
            const existing = m.attendances.find(
              (a) => a.attendanceDateId === vars.attendanceDateId
            );
            const next: AttendanceRecord = {
              id: existing?.id ?? `optimistic-${vars.memberId}-${vars.attendanceDateId}`,
              memberId: vars.memberId,
              attendanceDateId: vars.attendanceDateId,
              status: vars.status as AttendanceStatus,
              awrReason:
                vars.status === "AWR" || vars.status === "ABSENT"
                  ? vars.awrReason ?? null
                  : null,
            };
            return { ...m, attendances: [...others, next] };
          }),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["team", teamId], ctx.previous);
      }
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
    },
  });
}
