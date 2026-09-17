"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchJson } from "@/lib/http";
import { PrayerNotesView } from "@/components/PrayerNotesView";
import type { PrayerNoteTeam } from "@/lib/prayer-notes-query";

export default function GroupPrayerPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["prayer-notes", "group", groupId],
    queryFn: async (): Promise<PrayerNoteTeam[]> => {
      const data = await fetchJson<{ teams: PrayerNoteTeam[] }>(
        `/api/prayer-notes?groupId=${groupId}`
      );
      return data.teams;
    },
  });

  const heading = data?.[0] ? `${data[0].groupName} 기도제목` : "기도제목";

  return (
    <PrayerNotesView
      heading={heading}
      teams={data ?? []}
      isLoading={isLoading}
      error={error}
      showTeamHeadings
    />
  );
}
