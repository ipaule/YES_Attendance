import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { date, teamId } = await request.json();

  if (!date || !teamId) {
    return NextResponse.json(
      { error: "날짜와 조를 선택해주세요." },
      { status: 400 }
    );
  }

  const hasAccess = await canAccessTeam(session, teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const dateObj = new Date(date + "T12:00:00");
  const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

  // Check for duplicate
  const existing = await prisma.attendanceDate.findFirst({
    where: {
      teamId,
      date: dateObj,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "이미 추가된 날짜입니다." },
      { status: 409 }
    );
  }

  const maxOrder = await prisma.attendanceDate.findFirst({
    where: { teamId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const attendanceDate = await prisma.attendanceDate.create({
    data: {
      date: dateObj,
      label,
      teamId,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ date: attendanceDate }, { status: 201 });
}
