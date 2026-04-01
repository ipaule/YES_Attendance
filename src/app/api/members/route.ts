import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { name, gender, birthYear, teamId } = await request.json();

  if (!name || !gender || !teamId) {
    return NextResponse.json(
      { error: "모든 필드를 입력해주세요." },
      { status: 400 }
    );
  }

  const hasAccess = await canAccessTeam(session, teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // Get max order
  const maxOrder = await prisma.member.findFirst({
    where: { teamId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const member = await prisma.member.create({
    data: {
      name,
      gender,
      birthYear: birthYear || "",
      teamId,
      order: (maxOrder?.order ?? -1) + 1,
    },
    include: { attendances: true },
  });

  return NextResponse.json({ member }, { status: 201 });
}
