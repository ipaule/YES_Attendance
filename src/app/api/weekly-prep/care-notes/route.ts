import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getUpcomingWeek, formatMDSlash } from "@/lib/weekRange";

const TARGET_GROUP_NAMES = ["믿음", "소망", "사랑", "샬롬"];

interface CareNoteRow {
  name: string;
  birthday: string;
  phone: string;
  photo: string;
  gender: string;
}

interface CareNoteTeam {
  teamId: string;
  teamName: string;
  groupName: string;
  groupColor: string;
  leader: CareNoteRow | null;
  members: CareNoteRow[];
  sundayLabel: string;
}

function birthdayToNumber(birthday: string): number {
  // YYYY-MM-DD → comparable number; empty sorts to Infinity
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return Number.MAX_SAFE_INTEGER;
  return parseInt(birthday.replace(/-/g, ""), 10);
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { sunday } = getUpcomingWeek(new Date());
  const sundayLabel = formatMDSlash(sunday);

  const groups = await prisma.group.findMany({
    where: { name: { in: TARGET_GROUP_NAMES } },
    orderBy: { order: "asc" },
  });

  const communityOptions = await prisma.dropdownOption.findMany({
    where: { category: "community" },
  });
  const groupColorMap = new Map<string, string>();
  for (const opt of communityOptions) groupColorMap.set(opt.value, opt.color);

  const teams = await prisma.team.findMany({
    where: { groupId: { in: groups.map((g) => g.id) } },
    include: {
      group: { select: { id: true, name: true } },
      leader: { select: { username: true } },
      members: {
        select: { id: true, name: true, gender: true, birthYear: true },
        orderBy: { order: "asc" },
      },
    },
  });

  // Fetch RosterMember lookup for photo/phone/birthday enrichment
  const rosterRows = await prisma.rosterMember.findMany({
    select: { name: true, photo: true, phone: true, birthday: true, gender: true },
  });
  const rosterByName = new Map<string, (typeof rosterRows)[number]>();
  for (const r of rosterRows) rosterByName.set(r.name, r);

  // Sort teams so the output is stable: by group order, then by team name
  const groupOrder = new Map<string, number>();
  groups.forEach((g, i) => groupOrder.set(g.id, i));

  const result: CareNoteTeam[] = [];

  for (const team of teams) {
    const leaderName = team.leader?.username || "";
    const enriched: CareNoteRow[] = team.members.map((m) => {
      const r = rosterByName.get(m.name);
      return {
        name: m.name,
        gender: m.gender || r?.gender || "",
        birthday: r?.birthday || "",
        phone: r?.phone || "",
        photo: r?.photo || "",
      };
    });

    let leaderRow: CareNoteRow | null = null;
    const rest: CareNoteRow[] = [];
    for (const m of enriched) {
      if (!leaderRow && leaderName && m.name === leaderName) leaderRow = m;
      else rest.push(m);
    }
    // Fall back: leader from roster-only record when not a Member
    if (!leaderRow && leaderName) {
      const r = rosterByName.get(leaderName);
      leaderRow = {
        name: leaderName,
        gender: r?.gender || "",
        birthday: r?.birthday || "",
        phone: r?.phone || "",
        photo: r?.photo || "",
      };
    }

    // Member ordering: male oldest-first, then female oldest-first.
    // Missing-birthday members sort to the end of their gender group.
    rest.sort((a, b) => {
      const genderRank = (g: string) => (g === "남" ? 0 : g === "여" ? 1 : 2);
      const gDiff = genderRank(a.gender) - genderRank(b.gender);
      if (gDiff !== 0) return gDiff;
      return birthdayToNumber(a.birthday) - birthdayToNumber(b.birthday);
    });

    result.push({
      teamId: team.id,
      teamName: team.name,
      groupName: team.group.name,
      groupColor: groupColorMap.get(team.group.name) || "gray",
      leader: leaderRow,
      members: rest,
      sundayLabel,
    });
  }

  result.sort((a, b) => {
    const ag = groups.find((g) => g.name === a.groupName);
    const bg = groups.find((g) => g.name === b.groupName);
    const agOrder = ag ? groupOrder.get(ag.id) ?? 99 : 99;
    const bgOrder = bg ? groupOrder.get(bg.id) ?? 99 : 99;
    if (agOrder !== bgOrder) return agOrder - bgOrder;
    return a.teamName.localeCompare(b.teamName, "ko");
  });

  return NextResponse.json({ teams: result, sundayLabel });
}
