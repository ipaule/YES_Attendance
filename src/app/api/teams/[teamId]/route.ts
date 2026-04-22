import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam } from "@/lib/permissions";

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
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { teamId } = await params;

  const data = await request.json();
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;

  if (data.leaderId !== undefined) {
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
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { leaderId: true },
  });

  if (!team) {
    return NextResponse.json({ error: "순을 찾을 수 없습니다." }, { status: 404 });
  }

  if (team.leaderId) {
    await prisma.user.update({
      where: { id: team.leaderId },
      data: { teamId: null },
    });
  }

  await prisma.team.delete({ where: { id: teamId } });

  return NextResponse.json({ success: true });
}
