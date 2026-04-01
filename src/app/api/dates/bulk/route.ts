import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.role !== "PASTOR") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "시작일과 종료일을 입력해주세요." },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json(
        { error: "시작일이 종료일보다 늦을 수 없습니다." },
        { status: 400 }
      );
    }

    // Collect all Sundays in the range
    const sundays: Date[] = [];
    const current = new Date(start);

    // Move to first Sunday
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) {
      current.setDate(current.getDate() + (7 - dayOfWeek));
    }

    while (current <= end) {
      sundays.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }

    if (sundays.length === 0) {
      return NextResponse.json(
        { error: "선택한 기간에 일요일이 없습니다." },
        { status: 400 }
      );
    }

    // Store in GlobalDate so new teams get these dates
    const maxGlobalOrder = await prisma.globalDate.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let globalOrder = (maxGlobalOrder?.order ?? -1) + 1;

    for (const sunday of sundays) {
      const label = `${sunday.getMonth() + 1}/${sunday.getDate()}`;
      try {
        await prisma.globalDate.create({
          data: { date: sunday, label, order: globalOrder++ },
        });
      } catch {
        // Skip duplicates
      }
    }

    // Add to existing teams in 사랑, 소망, 믿음 only
    const targetGroups = await prisma.group.findMany({
      where: { name: { in: ["사랑", "소망", "믿음"] } },
      select: { id: true },
    });
    const targetGroupIds = targetGroups.map((g) => g.id);

    const teams = await prisma.team.findMany({
      where: { groupId: { in: targetGroupIds } },
      select: { id: true },
    });

    let addedCount = 0;

    for (const team of teams) {
      const maxOrder = await prisma.attendanceDate.findFirst({
        where: { teamId: team.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      let nextOrder = (maxOrder?.order ?? -1) + 1;

      for (const sunday of sundays) {
        const label = `${sunday.getMonth() + 1}/${sunday.getDate()}`;

        try {
          await prisma.attendanceDate.create({
            data: {
              date: sunday,
              label,
              teamId: team.id,
              order: nextOrder++,
            },
          });
          addedCount++;
        } catch {
          // Skip duplicates
        }
      }
    }

    const sundayLabels = sundays.map(
      (s) => `${s.getMonth() + 1}/${s.getDate()}`
    );

    return NextResponse.json({
      success: true,
      message: `${sundays.length}개 일요일이 추가되었습니다. (사랑·소망·믿음 ${teams.length}개 순 포함)`,
      sundays: sundayLabels,
      addedCount,
    });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
