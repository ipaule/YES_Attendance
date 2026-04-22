import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  getUpcomingWeek,
  isBirthdayInRange,
  birthdaySortKey,
  formatBirthdayMDShort,
  formatYMD,
} from "@/lib/weekRange";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { sunday, saturday } = getUpcomingWeek(new Date());

  const members = await prisma.rosterMember.findMany({
    select: { name: true, birthday: true },
  });

  const entries = members
    .filter((m) => m.birthday && isBirthdayInRange(m.birthday, sunday, saturday))
    .map((m) => ({
      mmdd: formatBirthdayMDShort(m.birthday),
      name: m.name,
      _sort: birthdaySortKey(m.birthday, sunday),
    }))
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort: _, ...rest }) => rest);

  return NextResponse.json({
    rangeStart: formatYMD(sunday),
    rangeEnd: formatYMD(saturday),
    entries,
  });
}
