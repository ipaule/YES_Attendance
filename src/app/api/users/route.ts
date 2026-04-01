import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!canManageRoles(session)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      groupId: true,
      teamId: true,
      group: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });

  return NextResponse.json({ users });
}
