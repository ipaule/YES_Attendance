import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { name, gender, birthYear, teamId } = await request.json();

  if (!name || !gender || !teamId) {
    return NextResponse.json(
      { error: "모든 필드를 입력해주세요." },
      { status: 400 }
    );
  }

  // Get max order
  const maxOrder = await prisma.member.findFirst({
    where: { teamId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const member = await prisma.member.create({
    data: {
      name,
      gender,
      birthYear: birthYear || "",
      teamId,
      order: (maxOrder?.order ?? -1) + 1,
    },
    include: { attendances: true, team: { include: { group: { select: { name: true } } } } },
  });

  // Update RosterMember groupName and teamName if found
  const rosterMatch = await prisma.rosterMember.findFirst({
    where: { name },
  });
  if (rosterMatch) {
    await prisma.rosterMember.update({
      where: { id: rosterMatch.id },
      data: {
        groupName: member.team.group.name,
        teamName: member.team.name,
      },
    });
  }

  // Update ShalomMember leader field if this is a shalom team
  if (member.team.group.name === "샬롬") {
    const shalomMatch = await prisma.shalomMember.findFirst({
      where: { name },
    });
    if (shalomMatch) {
      await prisma.shalomMember.update({
        where: { id: shalomMatch.id },
        data: { leader: member.team.name, status: "등록" },
      });
    }
  }

  return NextResponse.json({ member }, { status: 201 });
}
