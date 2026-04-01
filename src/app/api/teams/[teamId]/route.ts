import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam, canManageTeamsInGroup } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { teamId } = await params;

  const hasAccess = await canAccessTeam(session, teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      group: { select: { id: true, name: true } },
      leader: { select: { id: true, username: true } },
      members: {
        orderBy: { order: "asc" },
        include: {
          attendances: true,
        },
      },
      dates: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "순을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ team });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { teamId } = await params;

  const hasAccess = await canAccessTeam(session, teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const data = await request.json();
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;

  if (data.leaderId !== undefined) {
    // Remove old leader's teamId
    const oldTeam = await prisma.team.findUnique({
      where: { id: teamId },
      select: { leaderId: true },
    });
    if (oldTeam?.leaderId) {
      await prisma.user.update({
        where: { id: oldTeam.leaderId },
        data: { teamId: null },
      });
    }

    updateData.leaderId = data.leaderId || null;

    // Set new leader's teamId
    if (data.leaderId) {
      await prisma.user.update({
        where: { id: data.leaderId },
        data: { teamId },
      });
    }
  }

  const team = await prisma.team.update({
    where: { id: teamId },
    data: updateData,
    include: {
      group: { select: { id: true, name: true } },
      leader: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json({ team });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { groupId: true },
  });

  if (!team) {
    return NextResponse.json({ error: "순을 찾을 수 없습니다." }, { status: 404 });
  }

  // Pastor can delete any team, Executive can delete in their group
  const canManage = await canManageTeamsInGroup(session, team.groupId);
  if (!canManage) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // Unlink leader's teamId before deleting
  const fullTeam = await prisma.team.findUnique({
    where: { id: teamId },
    select: { leaderId: true },
  });
  if (fullTeam?.leaderId) {
    await prisma.user.update({
      where: { id: fullTeam.leaderId },
      data: { teamId: null },
    });
  }

  await prisma.team.delete({ where: { id: teamId } });

  return NextResponse.json({ success: true });
}
