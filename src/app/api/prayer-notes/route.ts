import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam, canViewGroupGraph, canViewCombinedGraph } from "@/lib/permissions";
import { getPrayerNotesForTeams } from "@/lib/prayer-notes-query";

// GET /api/prayer-notes?teamId=|?groupId=|?scope=all — backs all three
// 기도제목 pages (team/group/한 주의 준비). Same access rule each page's
// button is gated by, enforced server-side too: a team's own leader or
// 목사/임원 for a team; 목사 or that group's 임원 for a group
// (canViewGroupGraph, same rule the group graph already uses); 목사 only
// for the full rollup (canViewCombinedGraph, same as the combined graph).
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");
  const groupId = searchParams.get("groupId");
  const scope = searchParams.get("scope");

  if (teamId) {
    if (!(await canAccessTeam(session, teamId))) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    const teams = await getPrayerNotesForTeams([teamId]);
    return NextResponse.json({ teams });
  }

  if (groupId) {
    if (!canViewGroupGraph(session, groupId)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    const teamRows = await prisma.team.findMany({
      where: { groupId },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    const teams = await getPrayerNotesForTeams(teamRows.map((t) => t.id));
    return NextResponse.json({ teams });
  }

  if (scope === "all") {
    if (!canViewCombinedGraph(session)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    const teamRows = await prisma.team.findMany({
      orderBy: [{ group: { order: "asc" } }, { name: "asc" }],
      select: { id: true },
    });
    const teams = await getPrayerNotesForTeams(teamRows.map((t) => t.id));
    return NextResponse.json({ teams });
  }

  return NextResponse.json({ error: "teamId, groupId, 또는 scope=all이 필요합니다." }, { status: 400 });
}

// PATCH /api/prayer-notes — save (or clear) one member's 기도제목 note for one
// date. Modeled directly on PATCH /api/attendance: same permission gate, same
// lock enforcement, blank text deletes the row. Notes are stored separately
// from Attendance (a distinct memberId+attendanceDateId unique pair on their
// own table), so clearing an attendance mark never touches a note and vice
// versa.
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { memberId, attendanceDateId, text } = await request.json();

  if (!memberId || !attendanceDateId) {
    return NextResponse.json(
      { error: "필수 필드를 입력해주세요." },
      { status: 400 }
    );
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { teamId: true },
  });
  if (!member) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  const hasAccess = await canAccessTeam(session, member.teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const attendanceDate = await prisma.attendanceDate.findUnique({
    where: { id: attendanceDateId },
    select: { locked: true },
  });
  if (!attendanceDate) {
    return NextResponse.json({ error: "날짜를 찾을 수 없습니다." }, { status: 404 });
  }

  if (attendanceDate.locked) {
    return NextResponse.json(
      { error: "잠긴 날짜는 수정할 수 없습니다." },
      { status: 403 }
    );
  }

  const trimmed = (text ?? "").trim();

  if (!trimmed) {
    await prisma.prayerNote.deleteMany({ where: { memberId, attendanceDateId } });
    return NextResponse.json({ note: null });
  }

  const note = await prisma.prayerNote.upsert({
    where: { memberId_attendanceDateId: { memberId, attendanceDateId } },
    update: { text: trimmed },
    create: { memberId, attendanceDateId, text: trimmed },
  });

  return NextResponse.json({ note });
}
