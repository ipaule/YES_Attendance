"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchJson } from "@/lib/http";
import { PrayerNotesView } from "@/components/PrayerNotesView";
import type { PrayerNoteTeam } from "@/lib/prayer-notes-query";

export default function TeamPrayerPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["prayer-notes", "team", teamId],
    queryFn: async (): Promise<PrayerNoteTeam[]> => {
      const data = await fetchJson<{ teams: PrayerNoteTeam[] }>(
        `/api/prayer-notes?teamId=${teamId}`
      );
      return data.teams;
    },
  });

  const heading = data?.[0] ? `${data[0].groupName} - ${data[0].teamName} 기도제목` : "기도제목";

  return (
    <PrayerNotesView
      heading={heading}
      teams={data ?? []}
      isLoading={isLoading}
      error={error}
    />
  );
}
