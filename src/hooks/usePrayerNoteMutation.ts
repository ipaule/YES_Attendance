import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TeamWithData, PrayerNote } from "@/types";

export function usePrayerNoteMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      attendanceDateId,
      text,
    }: {
      memberId: string;
      attendanceDateId: string;
      text: string;
    }) => {
      const res = await fetch("/api/prayer-notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, attendanceDateId, text }),
      });
      if (!res.ok) throw new Error("Failed to update prayer note");
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
            const others = m.prayerNotes.filter(
              (n) => n.attendanceDateId !== vars.attendanceDateId
            );
            if (!vars.text.trim()) return { ...m, prayerNotes: others };
            const existing = m.prayerNotes.find(
              (n) => n.attendanceDateId === vars.attendanceDateId
            );
            const next: PrayerNote = {
              id: existing?.id ?? `optimistic-${vars.memberId}-${vars.attendanceDateId}`,
              memberId: vars.memberId,
              attendanceDateId: vars.attendanceDateId,
              text: vars.text.trim(),
              updatedAt: new Date().toISOString(),
            };
            return { ...m, prayerNotes: [...others, next] };
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
