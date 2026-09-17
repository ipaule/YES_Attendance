"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http";
import { PrayerNotesView } from "@/components/PrayerNotesView";
import type { PrayerNoteTeam } from "@/lib/prayer-notes-query";

export default function AllPrayerPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["prayer-notes", "all"],
    queryFn: async (): Promise<PrayerNoteTeam[]> => {
      const data = await fetchJson<{ teams: PrayerNoteTeam[] }>(
        `/api/prayer-notes?scope=all`
      );
      return data.teams;
    },
  });

  return (
    <PrayerNotesView
      heading="전체 기도제목"
      teams={data ?? []}
      isLoading={isLoading}
      error={error}
      showTeamHeadings
      showGroupHeadings
    />
  );
}
