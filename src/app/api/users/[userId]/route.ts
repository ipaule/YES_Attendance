import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { findDeleteBlockers } from "@/lib/leader-refs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!canManageRoles(session)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { userId } = await params;
  const data = await request.json();

  const updateData: Record<string, unknown> = {};

  if (data.role !== undefined) {
    updateData.role = data.role;
  }

  if (data.groupId !== undefined) {
    updateData.groupId = data.groupId;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      role: true,
      groupId: true,
      teamId: true,
      group: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!canManageRoles(session)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { userId } = await params;

  if (userId === session.userId) {
    return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const blockers = await findDeleteBlockers([{ id: userId, username: user.username }]);
  const reasons = blockers.get(userId);
  if (reasons && reasons.length > 0) {
    return NextResponse.json(
      { error: "이 사용자는 삭제할 수 없습니다.", reasons },
      { status: 409 }
    );
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
