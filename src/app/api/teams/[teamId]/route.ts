import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam, canManageTeamsInGroup } from "@/lib/permissions";
import { findTeamDeleteBlockers } from "@/lib/leader-refs";

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

  // Fetched as its own top-level query, not a nested `include`, on purpose:
  // PrayerNote.text is encrypted at rest, and the Prisma decryption
  // middleware (src/lib/db.ts) only decrypts a query's own top-level model —
  // it never walks into nested relations, so `prayerNotes: true` inside the
  // team include above would return raw ciphertext.
  const memberIds = team.members.map((m) => m.id);
  const prayerNotes = memberIds.length
    ? await prisma.prayerNote.findMany({ where: { memberId: { in: memberIds } } })
    : [];
  const notesByMember = new Map<string, typeof prayerNotes>();
  for (const note of prayerNotes) {
    const arr = notesByMember.get(note.memberId) ?? [];
    arr.push(note);
    notesByMember.set(note.memberId, arr);
  }
  const membersWithNotes = team.members.map((m) => ({
    ...m,
    prayerNotes: notesByMember.get(m.id) ?? [],
  }));

  const deleteBlockers = await findTeamDeleteBlockers({
    name: team.name,
    leaderUsername: team.leader?.username ?? null,
  });

  return NextResponse.json({
    team: { ...team, members: membersWithNotes, deleteBlockers },
  });
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

  const existingTeam = await prisma.team.findUnique({
    where: { id: teamId },
    select: { groupId: true },
  });
  if (!existingTeam) {
    return NextResponse.json({ error: "순을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!(await canManageTeamsInGroup(session, existingTeam.groupId))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

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
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      name: true,
      leaderId: true,
      groupId: true,
      leader: { select: { username: true } },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "순을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!(await canManageTeamsInGroup(session, team.groupId))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const reasons = await findTeamDeleteBlockers({
    name: team.name,
    leaderUsername: team.leader?.username ?? null,
  });
  if (reasons.length > 0) {
    return NextResponse.json(
      { error: "이 순은 삭제할 수 없습니다.", reasons },
      { status: 409 }
    );
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
