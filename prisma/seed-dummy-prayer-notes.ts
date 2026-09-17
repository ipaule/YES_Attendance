// Testing-only: fills in random 기도제목 notes on local dev.db so the new
// PrayerNote UI/pages have something to look at. Additive — only ever
// creates/updates notes on dates that don't already have one for that
// member, never touches attendance or anything else. Safe to re-run
// (re-rolls only the still-blank member/date pairs).
//
// Local dev.db only, same guard as backfill-member-birthday.ts: forcing
// TURSO_* empty before the dynamic import guarantees src/lib/db.ts takes
// the local-sqlite branch even if a plain `tsx` run would otherwise pick up
// real Turso credentials via @prisma/client's own .env-only dotenv loader.
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

async function main() {
  const { prisma } = await import("../src/lib/db");

  const members = await prisma.member.findMany({
    include: {
      team: { include: { dates: true } },
      prayerNotes: { select: { attendanceDateId: true } },
    },
  });

  let created = 0;
  for (const m of members) {
    const alreadyNoted = new Set(m.prayerNotes.map((n) => n.attendanceDateId));
    for (const date of m.team.dates) {
      if (alreadyNoted.has(date.id)) continue;
      // ~60% of member×date pairs get a note, so the pages show a realistic
      // mix of people with and without one, not every single cell filled.
      if (Math.random() > 0.6) continue;
      await prisma.prayerNote.create({
        data: { memberId: m.id, attendanceDateId: date.id, text: pick(SAMPLE_PRAYERS) },
      });
      created++;
    }
  }

  console.log(`Created ${created} dummy prayer notes across ${members.length} members.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
