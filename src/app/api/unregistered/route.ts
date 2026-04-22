import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildRecentAttendanceMap } from "@/lib/recentAttendance";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const members = await prisma.rosterMember.findMany({
    where: { teamName: "" },
    orderBy: { order: "asc" },
  });

  const map = await buildRecentAttendanceMap();

  const enriched = members.map((m) => ({
    ...m,
    recentAttendance: m.recentAttendanceOverride || map[m.name] || "미확인",
  }));

  return NextResponse.json({ members: enriched });
}
