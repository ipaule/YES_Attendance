import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildRecentAttendanceMap } from "@/lib/recentAttendance";
import { normalizeRosterName } from "@/lib/roster-names";
import { applyRosterPatch, deleteRosterMember, RosterMutationError } from "@/lib/roster-mutations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;
  const member = await prisma.rosterMember.findUnique({ where: { id: memberId } });
  if (!member) {
    return NextResponse.json({ error: "해당 인원을 찾을 수 없습니다." }, { status: 404 });
  }

  const map = await buildRecentAttendanceMap();
  const recentAttendance =
    member.recentAttendanceOverride ||
    map[member.name] ||
    map[normalizeRosterName(member.name)] ||
    "미확인";

  return NextResponse.json({ member: { ...member, recentAttendance } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;
  const data = await request.json();

  try {
    const { member, warning } = await applyRosterPatch(memberId, data, { bumpToTop: true });
    return NextResponse.json({ member, warning });
  } catch (e) {
    if (e instanceof RosterMutationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;

  try {
    await deleteRosterMember(memberId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof RosterMutationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
