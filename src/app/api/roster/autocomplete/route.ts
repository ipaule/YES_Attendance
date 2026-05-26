import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { normalizeRosterName } from "@/lib/roster-names";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupName = searchParams.get("groupName") || "";
  const q = searchParams.get("q") || "";

  if (!q) return NextResponse.json({ suggestions: [] });

  // Get all roster members matching the query regardless of group
  const rosterMembers = await prisma.rosterMember.findMany({
    where: { name: { contains: q } },
    select: { id: true, name: true, gender: true, birthYear: true, groupName: true },
  });

  // Exclude anyone already on any team
  const assignedMembers = await prisma.member.findMany({
    select: { name: true },
  });
  const assignedNames = new Set(assignedMembers.map((m) => m.name));

  // Filter and sort: same group first, then by name
  const suggestions = rosterMembers
    .filter((m) => !assignedNames.has(m.name) && !assignedNames.has(normalizeRosterName(m.name)))
    .sort((a, b) => {
      const aMatch = a.groupName === groupName ? 0 : 1;
      const bMatch = b.groupName === groupName ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json({ suggestions });
}
