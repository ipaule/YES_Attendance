import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function sundaysBetween(start: Date, end: Date): Date[] {
  const sundays: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    sundays.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return sundays;
}

function randomShalomWindow(): Date[] {
  // Pick a random Sunday between 2026-01-04 and 2026-11-22 so 6 weeks fit in the year
  const earliest = new Date("2026-01-04T00:00:00.000Z");
  const latest = new Date("2026-11-22T00:00:00.000Z");
  const rangeMs = latest.getTime() - earliest.getTime();
  // Snap to nearest Sunday multiple of 7 days from earliest
  const weekCount = Math.floor(rangeMs / (7 * 24 * 60 * 60 * 1000));
  const randomWeeks = Math.floor(Math.random() * (weekCount + 1));
  const start = new Date(earliest.getTime() + randomWeeks * 7 * 24 * 60 * 60 * 1000);
  return sundaysBetween(start, new Date(start.getTime() + 5 * 7 * 24 * 60 * 60 * 1000));
}

function pickStatus(): string {
  const r = Math.random();
  if (r < 0.70) return "HERE";
  if (r < 0.90) return "ABSENT";
  return "AWR";
}

async function main() {
  const NON_SHALOM_DATES = sundaysBetween(
    new Date("2026-03-15T00:00:00.000Z"),
    new Date("2026-06-28T00:00:00.000Z")
  );

  const teams = await prisma.team.findMany({
    include: { group: true, members: { select: { id: true } } },
  });

  let adCount = 0;
  let attCount = 0;

  for (const team of teams) {
    const dates = team.group.name === "샬롬" ? randomShalomWindow() : NON_SHALOM_DATES;

    for (const [i, date] of dates.entries()) {
      const label = `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
      const ad = await prisma.attendanceDate.upsert({
        where: { date_teamId: { date, teamId: team.id } },
        create: { date, teamId: team.id, label, order: i },
        update: { label, order: i },
      });
      adCount++;

      for (const m of team.members) {
        const status = pickStatus();
        await prisma.attendance.upsert({
          where: { memberId_attendanceDateId: { memberId: m.id, attendanceDateId: ad.id } },
          create: { memberId: m.id, attendanceDateId: ad.id, status, awrReason: null },
          update: { status, awrReason: null },
        });
        attCount++;
      }
    }
  }

  console.log(`Done. AttendanceDates upserted: ${adCount}, Attendance rows upserted: ${attCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
