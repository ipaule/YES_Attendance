import { prisma } from "./db";

// Build a map of name → most-recent term label where the person was HERE.
// Walks current Member/AttendanceDate first (newest term), then TermHistory
// snapshots in reverse chronological order. First hit wins.
export async function buildRecentAttendanceMap(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  // Current term — only target groups (사랑/소망/믿음). The team has no
  // "term name" field, so present-in-current-term maps to the special label
  // "현재 텀" (so the UI can distinguish).
  const targetGroups = await prisma.group.findMany({
    where: { name: { in: ["사랑", "소망", "믿음"] } },
    select: { id: true },
  });
  const targetGroupIds = targetGroups.map((g) => g.id);

  const currentMembers = await prisma.member.findMany({
    where: { team: { groupId: { in: targetGroupIds } } },
    select: {
      name: true,
      attendances: { where: { status: "HERE" }, select: { id: true } },
    },
  });

  for (const m of currentMembers) {
    if (m.attendances.length > 0 && !result[m.name]) {
      result[m.name] = "현재 텀";
    }
  }

  // Past terms — walk newest first.
  const histories = await prisma.termHistory.findMany({
    orderBy: { createdAt: "desc" },
  });

  for (const h of histories) {
    let parsed: {
      teams?: { members?: { name: string; attendances?: { status: string }[] }[] }[];
    };
    try {
      parsed = JSON.parse(h.data);
    } catch {
      continue;
    }
    const teams = parsed.teams || [];
    for (const t of teams) {
      const members = t.members || [];
      for (const m of members) {
        if (result[m.name]) continue;
        const wasPresent = (m.attendances || []).some((a) => a.status === "HERE");
        if (wasPresent) {
          result[m.name] = h.name;
        }
      }
    }
  }

  return result;
}
