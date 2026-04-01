import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam } from "@/lib/permissions";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ dateId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { dateId } = await params;

  const dateRecord = await prisma.attendanceDate.findUnique({
    where: { id: dateId },
    select: { teamId: true },
  });

  if (!dateRecord) {
    return NextResponse.json({ error: "날짜를 찾을 수 없습니다." }, { status: 404 });
  }

  const hasAccess = await canAccessTeam(session, dateRecord.teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  await prisma.attendanceDate.delete({ where: { id: dateId } });

  return NextResponse.json({ success: true });
}
