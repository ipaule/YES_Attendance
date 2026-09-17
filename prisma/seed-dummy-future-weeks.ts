// Testing-only: appends 3 upcoming weeks of dates to every team on local
// dev.db, with random attendance and ~60% random prayer notes — so the new
// PrayerNote UI has recent-looking, not-yet-locked dates to try against.
// Additive: only ever adds new AttendanceDate rows after each team's
// existing last date; never touches existing dates/attendance/notes.
// Local dev.db only — same TURSO-blocking guard as the other seed scripts.
export {};
process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";

const SAMPLE_PRAYERS = [
  "건강을 위해 기도해주세요",
  "취업 준비 중입니다, 기도 부탁드려요",
  "가족 관계 회복을 위해 기도 부탁드립니다",
  "다음 주 시험이 있어요, 함께 기도해주세요",
  "요즘 마음이 많이 지쳐있어요, 위로가 필요합니다",
  "새로운 시작을 앞두고 있어요, 기도로 응원해주세요",
  "감사한 일이 있어서 나누고 싶어요",
  "부모님 건강을 위해 기도 부탁드려요",
  "이직을 고민하고 있습니다, 지혜를 구합니다",
  "학업에 집중할 수 있도록 기도해주세요",
  "친구 관계에 어려움이 있어요",
  "재정적인 어려움이 있어 기도가 필요합니다",
  "믿음이 흔들릴 때가 있어요, 붙잡아주세요",
  "이번 주 여행 다녀올 예정이에요, 안전을 위해 기도해주세요",
  "동생이 아파서 걱정이 많습니다",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickStatus(): string {
  const r = Math.random();
  if (r < 0.70) return "HERE";
  if (r < 0.90) return "ABSENT";
  return "AWR";
}

// Next 3 Sundays strictly after today.
function nextThreeSundays(): Date[] {
  const out: Date[] = [];
  const cur = new Date();
  cur.setUTCHours(0, 0, 0, 0);
  cur.setUTCDate(cur.getUTCDate() + ((7 - cur.getUTCDay()) % 7 || 7)); // next Sunday
  for (let i = 0; i < 3; i++) {
    out.push(new Date(cur.getTime() + i * 7 * 24 * 60 * 60 * 1000));
  }
  return out;
}

async function main() {
  const { prisma } = await import("../src/lib/db");

  const upcoming = nextThreeSundays();
  const teams = await prisma.team.findMany({
    include: { members: { select: { id: true } }, dates: { orderBy: { order: "desc" }, take: 1 } },
  });

  let datesCreated = 0;
  let attCreated = 0;
  let notesCreated = 0;

  for (const team of teams) {
    let order = (team.dates[0]?.order ?? -1) + 1;
    for (const date of upcoming) {
      const label = `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
      const ad = await prisma.attendanceDate.create({
        data: { date, teamId: team.id, label, order: order++ },
      });
      datesCreated++;

      for (const m of team.members) {
        await prisma.attendance.create({
          data: { memberId: m.id, attendanceDateId: ad.id, status: pickStatus(), awrReason: null },
        });
        attCreated++;

        if (Math.random() <= 0.6) {
          await prisma.prayerNote.create({
            data: { memberId: m.id, attendanceDateId: ad.id, text: pick(SAMPLE_PRAYERS) },
          });
          notesCreated++;
        }
      }
    }
  }

  console.log(`Teams: ${teams.length}`);
  console.log(`AttendanceDates created: ${datesCreated}`);
  console.log(`Attendance rows created: ${attCreated}`);
  console.log(`Prayer notes created: ${notesCreated}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
