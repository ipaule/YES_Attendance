import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const unassigned = await prisma.rosterMember.findMany({
    where: { teamName: "" },
    select: { id: true, name: true, groupName: true },
    orderBy: { name: "asc" },
  });

  if (unassigned.length === 0) {
    console.log("No unassigned members found.");
    return;
  }

  console.log(`Found ${unassigned.length} unassigned members:`);
  for (const m of unassigned) console.log(`  - ${m.name} (${m.groupName || "no group"})`);

  const { count } = await prisma.rosterMember.deleteMany({ where: { teamName: "" } });
  console.log(`\nDeleted ${count} members.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
