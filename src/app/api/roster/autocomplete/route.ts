import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupName = searchParams.get("groupName") || "";
  const q = searchParams.get("q") || "";

  if (!q) return NextResponse.json({ suggestions: [] });

  // Get roster members matching the group and query
  const rosterMembers = await prisma.rosterMember.findMany({
    where: {
      ...(groupName ? { groupName } : {}),
      name: { contains: q },
    },
    select: { id: true, name: true, gender: true, birthYear: true, groupName: true },
  });

  // Get names already assigned to a team (in Member table)
  const targetGroups = await prisma.group.findMany({
    where: { name: { in: ["사랑", "소망", "믿음"] } },
    select: { id: true },
  });
  const assignedMembers = await prisma.member.findMany({
    where: { team: { groupId: { in: targetGroups.map((g) => g.id) } } },
    select: { name: true },
  });
  const assignedNames = new Set(assignedMembers.map((m) => m.name));

  // Exclude already assigned
  const suggestions = rosterMembers.filter((m) => !assignedNames.has(m.name));

  return NextResponse.json({ suggestions });
}
