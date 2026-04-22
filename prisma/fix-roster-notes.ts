import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // For entries with 구원 related notes, set the dropdown and clear the note
  const updated1 = await prisma.rosterMember.updateMany({
    where: { note: "구원의 확신 있음" },
    data: { salvationAssurance: "있음", note: "" },
  });
  console.log(`Updated ${updated1.count} entries: '구원의 확신 있음' → salvationAssurance='있음'`);

  // For entries without 구원 in the note, they stay as-is (비고 field)
  const remaining = await prisma.rosterMember.findMany({
    where: { note: { not: "" }, salvationAssurance: "" },
  });
  console.log(`Remaining entries with notes (비고): ${remaining.length}`);
  remaining.forEach((r) => console.log(`  - ${r.name}: ${r.note}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
