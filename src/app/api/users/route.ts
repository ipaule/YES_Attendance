import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope"); // "available-leaders" for leader assignment

  if (scope === "available-leaders") {
    // Leaders and Executives in the group without a team assignment
    const groupId = searchParams.get("groupId");
    const users = await prisma.user.findMany({
      where: {
        teamId: null,
        role: { in: ["LEADER", "EXECUTIVE", "PASTOR"] },
        ...(groupId ? { groupId } : {}),
      },
      select: {
        id: true,
        username: true,
        role: true,
        groupId: true,
        group: { select: { id: true, name: true } },
      },
      orderBy: { username: "asc" },
    });
    return NextResponse.json({ users });
  }

  // Full user list - Pastor only
  if (session.role !== "PASTOR") {
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
