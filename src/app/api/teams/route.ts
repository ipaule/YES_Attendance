import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageTeamsInGroup } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  let teams;

  if (session.role === "PASTOR") {
    teams = await prisma.team.findMany({
      where: groupId ? { groupId } : undefined,
      include: {
        group: { select: { id: true, name: true } },
        leader: { select: { id: true, username: true } },
        _count: { select: { members: true } },
      },
      orderBy: [{ group: { order: "asc" } }, { name: "asc" }],
    });
  } else if (session.role === "EXECUTIVE") {
    teams = await prisma.team.findMany({
      where: { groupId: session.groupId },
      include: {
        group: { select: { id: true, name: true } },
        leader: { select: { id: true, username: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
  } else {
    teams = await prisma.team.findMany({
      where: { leaderId: session.userId },
      include: {
        group: { select: { id: true, name: true } },
        leader: { select: { id: true, username: true } },
        _count: { select: { members: true } },
      },
    });
  }

  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { name, groupId, leaderId } = await request.json();

  if (!name || !groupId) {
    return NextResponse.json(
      { error: "조 이름과 그룹을 입력해주세요." },
      { status: 400 }
    );
  }

  const canManage = await canManageTeamsInGroup(session, groupId);
  if (!canManage) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const team = await prisma.team.create({
    data: { name, groupId, leaderId: leaderId || null },
    include: {
      group: { select: { id: true, name: true } },
      leader: { select: { id: true, username: true } },
    },
  });

  // If a leader was assigned, update the user's teamId
  if (leaderId) {
    await prisma.user.update({
      where: { id: leaderId },
      data: { teamId: team.id },
    });
  }

  return NextResponse.json({ team }, { status: 201 });
}
