import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { normalizeRosterName } from "@/lib/roster-names";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupName = searchParams.get("groupName") || "";
  const teamName = searchParams.get("teamName") || "";
  const teamId = searchParams.get("teamId") || "";
  const q = searchParams.get("q") || "";

  if (!q) return NextResponse.json({ suggestions: [] });

  // Get roster members that are either unassigned or belong to the target team
  const rosterMembers = await prisma.rosterMember.findMany({
    where: {
      name: { contains: q },
      OR: [
        { teamName: "" },
        ...(teamName && groupName
          ? [{ teamName, groupName }]
          : []),
      ],
    },
    select: { id: true, name: true, gender: true, birthYear: true, groupName: true },
  });

  // Exclude anyone already on THIS team's sheet (scoped to current team, not global)
  const teamMembers = teamId
    ? await prisma.member.findMany({ where: { teamId }, select: { name: true } })
    : [];
  const onThisTeam = new Set(teamMembers.map((m) => m.name));

  // Filter and sort: corresponding-team people first, then unassigned, then by name
  const suggestions = rosterMembers
    .filter((m) => !onThisTeam.has(m.name) && !onThisTeam.has(normalizeRosterName(m.name)))
    .sort((a, b) => {
      const aRank = a.groupName === groupName ? 0 : 1;
      const bRank = b.groupName === groupName ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json({ suggestions });
}
