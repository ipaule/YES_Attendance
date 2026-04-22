import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET: list all term histories
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const terms = await prisma.termHistory.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ terms });
}

// POST: snapshot current data and flush (새로운 텀 시작)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.role !== "PASTOR") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "텀 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    // Only snapshot 사랑, 소망, 믿음
    const targetGroups = await prisma.group.findMany({
      where: { name: { in: ["사랑", "소망", "믿음"] } },
      orderBy: { order: "asc" },
    });
    const targetGroupIds = targetGroups.map((g) => g.id);

    // Snapshot all data for target groups
    const users = await prisma.user.findMany({
      where: { username: { not: "AJ" } },
      select: {
        id: true,
        username: true,
        role: true,
        groupId: true,
        teamId: true,
        group: { select: { name: true } },
      },
    });

    const teams = await prisma.team.findMany({
      where: { groupId: { in: targetGroupIds } },
      include: {
        group: { select: { id: true, name: true } },
        leader: { select: { id: true, username: true } },
        members: {
          orderBy: { order: "asc" },
          include: {
            attendances: {
              include: {
                attendanceDate: { select: { label: true, date: true } },
              },
            },
          },
        },
        dates: { orderBy: { order: "asc" } },
      },
    });

    const globalDates = await prisma.globalDate.findMany({
      orderBy: { order: "asc" },
    });

    const snapshot = {
      users,
      groups: targetGroups,
      teams,
      globalDates,
      snapshotDate: new Date().toISOString(),
    };

    // Save snapshot
    await prisma.termHistory.create({
      data: {
        name: name.trim(),
        data: JSON.stringify(snapshot),
      },
    });

    // Flush: unlink users from teams first, then delete everything
    // 1. Unlink all users' teamId
    await prisma.user.updateMany({
      where: { teamId: { not: null } },
      data: { teamId: null },
    });

    // 2. Unlink all teams' leaderId
    await prisma.team.updateMany({
      where: { leaderId: { not: null } },
      data: { leaderId: null },
    });

    // 3. Delete attendance, dates, members, teams
    const targetTeamIds = teams.map((t) => t.id);

    await prisma.attendance.deleteMany({
      where: { member: { teamId: { in: targetTeamIds } } },
    });
    await prisma.attendanceDate.deleteMany({
      where: { teamId: { in: targetTeamIds } },
    });
    await prisma.member.deleteMany({
      where: { teamId: { in: targetTeamIds } },
    });
    await prisma.team.deleteMany({
      where: { groupId: { in: targetGroupIds } },
    });

    // 3.5 Clear roster teamName for flushed groups
    await prisma.rosterMember.updateMany({
      where: { groupName: { in: ["사랑", "소망", "믿음"] } },
      data: { teamName: "" },
    });

    // 4. Clear global dates
    await prisma.globalDate.deleteMany();

    // 5. Delete 사랑/소망/믿음 LEADER and EXECUTIVE users
    // Keep: all PASTOR, 샬롬 users (leaders + executive)
    const shalomGroup = await prisma.group.findFirst({
      where: { name: "샬롬" },
      select: { id: true },
    });
    await prisma.user.deleteMany({
      where: {
        role: { in: ["LEADER", "EXECUTIVE"] },
        ...(shalomGroup ? { groupId: { not: shalomGroup.id } } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `"${name.trim()}" 텀이 저장되었습니다. 새로운 텀을 시작합니다.`,
    });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
