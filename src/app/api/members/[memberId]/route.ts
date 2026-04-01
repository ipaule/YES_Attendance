import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam } from "@/lib/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { memberId } = await params;

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

  const data = await request.json();

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.birthYear !== undefined && {
        birthYear: parseInt(data.birthYear),
      }),
    },
    include: { attendances: true },
  });

  return NextResponse.json({ member: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { memberId } = await params;

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

  await prisma.member.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
