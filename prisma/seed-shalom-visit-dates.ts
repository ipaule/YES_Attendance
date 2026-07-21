import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function sundaysBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return out;
}

async function main() {
  // First Sunday on/after 2026-01-01 is 2026-01-04; last Sunday on/before 2026-05-10 is 2026-05-10
  const sundays = sundaysBetween(
    new Date("2026-01-04T00:00:00.000Z"),
    new Date("2026-05-10T00:00:00.000Z"),
  ); // 19 dates

  const rows = await prisma.shalomMember.findMany({
    where: { visitDate: "" },
    select: { id: true },
  });

  for (const r of rows) {
    const date = sundays[Math.floor(Math.random() * sundays.length)];
    await prisma.shalomMember.update({
      where: { id: r.id },
      data: { visitDate: date },
    });
  }
  console.log(`Updated ${rows.length} ShalomMember rows; picked from ${sundays.length} Sundays.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
