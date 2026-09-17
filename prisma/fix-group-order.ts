// One-off: corrects Group.order on local dev.db, which was seeded by the
// old seed.ts/seed-turso.ts with 샬롬 first (0-3 = 샬롬,사랑,소망,믿음).
// Canonical order is 믿음,소망,사랑,샬롬 (src/lib/dropdownSeeds.ts:37-40).
// Additive UPDATE only — no delete/reseed. Local dev.db only, same guard as
// backfill-member-birthday.ts: forcing TURSO_* empty before the dynamic
// import guarantees src/lib/db.ts takes the local-sqlite branch.
export {};
process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";

const CORRECT_ORDER: Record<string, number> = {
  "믿음": 0,
  "소망": 1,
  "사랑": 2,
  "샬롬": 3,
};

async function main() {
  const { prisma } = await import("../src/lib/db");

  const groups = await prisma.group.findMany();
  let updated = 0;
  for (const g of groups) {
    const correct = CORRECT_ORDER[g.name];
    if (correct === undefined || g.order === correct) continue;
    await prisma.group.update({ where: { id: g.id }, data: { order: correct } });
    updated++;
  }

  console.log(`Updated order on ${updated} group(s).`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
