import { prisma } from "@/lib/db";

export interface PrayerNoteRow {
  date: string;
  label: string;
  text: string;
}

export interface PrayerNoteMember {
  id: string;
  name: string;
  notes: PrayerNoteRow[];
}

export interface PrayerNoteTeam {
  teamId: string;
  teamName: string;
  groupName: string;
  members: PrayerNoteMember[];
}

// Shared by all three 기도제목 pages (team/group/전체) — every member of the
// given teams, listed even with zero notes, each person's notes ordered by
// date ascending. `teams` come in whatever order the caller already sorted.
export async function getPrayerNotesForTeams(teamIds: string[]): Promise<PrayerNoteTeam[]> {
  if (teamIds.length === 0) return [];

  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    include: {
      group: { select: { name: true } },
      members: { orderBy: { order: "asc" } },
    },
  });

  // PrayerNote.text is encrypted at rest — fetched as its own top-level
  // query rather than a nested `include` above, since the Prisma
  // decryption middleware (src/lib/db.ts) only decrypts a query's own
  // top-level model and would otherwise return raw ciphertext here.
  const memberIds = teams.flatMap((t) => t.members.map((m) => m.id));
  const notes = memberIds.length
    ? await prisma.prayerNote.findMany({
        where: { memberId: { in: memberIds } },
        include: { attendanceDate: { select: { label: true, date: true } } },
      })
    : [];
  const notesByMember = new Map<string, typeof notes>();
  for (const note of notes) {
    const arr = notesByMember.get(note.memberId) ?? [];
    arr.push(note);
    notesByMember.set(note.memberId, arr);
  }

  const byId = new Map(teams.map((t) => [t.id, t]));

  return teamIds
    .map((id) => byId.get(id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      groupName: t.group.name,
      members: t.members.map((m) => ({
        id: m.id,
        name: m.name,
        notes: (notesByMember.get(m.id) ?? [])
          .slice()
          .sort((a, b) => a.attendanceDate.date.getTime() - b.attendanceDate.date.getTime())
          .map((n) => ({
            date: n.attendanceDate.date.toISOString(),
            label: n.attendanceDate.label,
            text: n.text,
          })),
      })),
    }));
}
