import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageMembersInTeam } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const { teamId, memberIds } = await request.json();

  if (!teamId || !memberIds?.length) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!(await canManageMembersInTeam(session, teamId))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  for (let i = 0; i < memberIds.length; i++) {
    await prisma.member.updateMany({
      where: { id: memberIds[i], teamId },
      data: { order: i },
    });
  }

  return NextResponse.json({ success: true });
}
