import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam } from "@/lib/permissions";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { memberId, attendanceDateId, status, awrReason } =
    await request.json();

  if (!memberId || !attendanceDateId || !status) {
    return NextResponse.json(
      { error: "필수 필드를 입력해주세요." },
      { status: 400 }
    );
  }

  // Check permission via member's team
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

  const attendance = await prisma.attendance.upsert({
    where: {
      memberId_attendanceDateId: {
        memberId,
        attendanceDateId,
      },
    },
    update: {
      status,
      awrReason: (status === "AWR" || status === "ABSENT") ? awrReason || null : null,
    },
    create: {
      memberId,
      attendanceDateId,
      status,
      awrReason: (status === "AWR" || status === "ABSENT") ? awrReason || null : null,
    },
  });

  return NextResponse.json({ attendance });
}
