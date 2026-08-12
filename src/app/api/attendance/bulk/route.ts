import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam } from "@/lib/permissions";

const ALLOWED_STATUSES = new Set(["HERE", "ABSENT", "AWR", ""]);

// Batch-apply one status to a set of members for one date, in a single
// transaction (all-or-nothing). Used by "mark all present" (blank ->
// HERE) and its undo (those same ids -> blank) on both desktop and
// mobile — replacing the old Promise.allSettled fan-out, whose per-mutation
// optimistic-update snapshots could stomp each other's cache state on a
// partial failure.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { attendanceDateId, memberIds, status } = await request.json();

  if (!attendanceDateId || !Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: "필수 필드를 입력해주세요." }, { status: 400 });
  }
  if (!ALLOWED_STATUSES.has(status ?? "")) {
    return NextResponse.json({ error: "유효하지 않은 상태입니다." }, { status: 400 });
  }

  const attendanceDate = await prisma.attendanceDate.findUnique({
    where: { id: attendanceDateId },
    select: { locked: true, teamId: true },
  });
  if (!attendanceDate) {
    return NextResponse.json({ error: "날짜를 찾을 수 없습니다." }, { status: 404 });
  }

  const hasAccess = await canAccessTeam(session, attendanceDate.teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (attendanceDate.locked) {
    return NextResponse.json({ error: "잠긴 날짜는 수정할 수 없습니다." }, { status: 403 });
  }

  const members = await prisma.member.findMany({
    where: { id: { in: memberIds }, teamId: attendanceDate.teamId },
    select: { id: true },
  });
  if (members.length !== memberIds.length) {
    return NextResponse.json({ error: "일부 순원을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!status) {
    await prisma.attendance.deleteMany({
      where: { attendanceDateId, memberId: { in: memberIds } },
    });
    return NextResponse.json({ memberIds });
  }

  await prisma.$transaction(
    memberIds.map((memberId: string) =>
      prisma.attendance.upsert({
        where: { memberId_attendanceDateId: { memberId, attendanceDateId } },
        update: { status, awrReason: null },
        create: { memberId, attendanceDateId, status, awrReason: null },
      })
    )
  );

  return NextResponse.json({ memberIds });
}
