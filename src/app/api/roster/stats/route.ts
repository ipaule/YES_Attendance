import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const total = await prisma.rosterMember.count();
  const assigned = await prisma.rosterMember.count({
    where: { teamName: { not: "" } },
  });

  // Get attendance by date for 사랑/소망/믿음
  const targetGroups = await prisma.group.findMany({
    where: { name: { in: ["사랑", "소망", "믿음"] } },
    select: { id: true },
  });
  const targetGroupIds = targetGroups.map((g) => g.id);

  const dates = await prisma.attendanceDate.findMany({
    where: { team: { groupId: { in: targetGroupIds } } },
    select: { id: true, label: true, date: true },
  });

  // Group date IDs by label
  const dateLabelMap: Record<string, string[]> = {};
  for (const d of dates) {
    if (!dateLabelMap[d.label]) dateLabelMap[d.label] = [];
    dateLabelMap[d.label].push(d.id);
  }

  // Count HERE attendance per date label
  const attendanceByDate: Record<string, number> = {};
  for (const [label, dateIds] of Object.entries(dateLabelMap)) {
    const count = await prisma.attendance.count({
      where: {
        attendanceDateId: { in: dateIds },
        status: "HERE",
      },
    });
    attendanceByDate[label] = count;
  }

  // Find closest past Sunday
  const now = new Date();
  const dayOfWeek = now.getDay();
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - (dayOfWeek === 0 ? 0 : dayOfWeek));
  const closestSundayLabel = `${lastSunday.getMonth() + 1}/${lastSunday.getDate()}`;

  return NextResponse.json({
    total,
    assigned,
    attendanceByDate,
    closestSunday: closestSundayLabel,
  });
}
