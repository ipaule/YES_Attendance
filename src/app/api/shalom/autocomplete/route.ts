import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (!q) return NextResponse.json({ suggestions: [] });

  // Get shalom members matching query
  const shalomMembers = await prisma.shalomMember.findMany({
    where: { name: { contains: q } },
    select: { id: true, name: true, gender: true, birthYear: true, status: true, leader: true },
  });

  // Exclude those already in a shalom team
  const shalomGroup = await prisma.group.findFirst({ where: { name: "샬롬" } });
  const assignedMembers = shalomGroup
    ? await prisma.member.findMany({
        where: { team: { groupId: shalomGroup.id } },
        select: { name: true },
      })
    : [];
  const assignedNames = new Set(assignedMembers.map((m) => m.name));

  const suggestions = shalomMembers.filter((m) => !assignedNames.has(m.name));

  return NextResponse.json({ suggestions });
}
