// Turso-targeted twin of fix-group-order.ts — same additive UPDATE-only
// logic, opposite guard (requires Turso env vars instead of forcing them
// empty). Corrects Group.order in production, seeded wrong by the old
// seed.ts/seed-turso.ts (샬롬=0,사랑=1,소망=2,믿음=3 instead of
// 믿음=0,소망=1,사랑=2,샬롬=3 — canonical per src/lib/dropdownSeeds.ts:37-40).
export {}; // module scope, avoids colliding with the local twin's `main`

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    "TURSO_DATABASE_URL/TURSO_AUTH_TOKEN must be set to run this against Turso — see fix-group-order.ts for the local-only version."
  );
}

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
    console.log(`  ${g.name}: ${g.order} -> ${correct}`);
  }

  console.log(`Updated order on ${updated} group(s).`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
