import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const groupName = searchParams.get("groupName");

  const filter: { groupId?: string; group?: { name: string }; leaderId?: string } = {};
  if (groupId) filter.groupId = groupId;
  else if (groupName) filter.group = { name: groupName };

  let teams;
  if (session.role === "PASTOR") {
    teams = await prisma.team.findMany({
      where: Object.keys(filter).length ? filter : undefined,
      include: {
        group: { select: { id: true, name: true } },
        leader: { select: { id: true, username: true } },
        members: { select: { id: true, name: true }, orderBy: { order: "asc" } },
        _count: { select: { members: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
    });
  } else if (session.role === "EXECUTIVE") {
    teams = await prisma.team.findMany({
      where: { groupId: session.groupId! },
      include: {
        group: { select: { id: true, name: true } },
        leader: { select: { id: true, username: true } },
        members: { select: { id: true, name: true }, orderBy: { order: "asc" } },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  } else {
    teams = await prisma.team.findMany({
      where: { leaderId: session.userId },
      include: {
        group: { select: { id: true, name: true } },
        leader: { select: { id: true, username: true } },
        members: { select: { id: true, name: true }, orderBy: { order: "asc" } },
        _count: { select: { members: true } },
      },
    });
  }

  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { groupId, leaderId } = await request.json();

  if (!groupId || !leaderId) {
    return NextResponse.json(
      { error: "공동체와 순장을 선택해주세요." },
      { status: 400 }
    );
  }

  // Use leader's username as the team name
  const leader = await prisma.user.findUnique({
    where: { id: leaderId },
    select: { username: true },
  });

  if (!leader) {
    return NextResponse.json({ error: "순장을 찾을 수 없습니다." }, { status: 404 });
  }

  const name = leader.username;

  try {
    const team = await prisma.team.create({
      data: { name, groupId, leaderId },
      include: {
        group: { select: { id: true, name: true } },
        leader: { select: { id: true, username: true } },
      },
    });

    // Update the leader's teamId
    await prisma.user.update({
      where: { id: leaderId },
      data: { teamId: team.id },
    });

    // Copy all global dates to the new team
    const globalDates = await prisma.globalDate.findMany({
      orderBy: { order: "asc" },
    });

    // Only add global dates if this team is in 사랑, 소망, or 믿음
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    if (group && ["사랑", "소망", "믿음"].includes(group.name)) {
      for (let i = 0; i < globalDates.length; i++) {
        const gd = globalDates[i];
        try {
          await prisma.attendanceDate.create({
            data: {
              date: gd.date,
              label: gd.label,
              teamId: team.id,
              order: i,
            },
          });
        } catch {
          // Skip duplicates
        }
      }
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "같은 이름의 순이 이미 존재합니다." },
        { status: 409 }
      );
    }
    throw e;
  }
}
