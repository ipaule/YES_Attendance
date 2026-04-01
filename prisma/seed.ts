import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const groups = [
    { name: "샬롬", order: 0 },
    { name: "사랑", order: 1 },
    { name: "소망", order: 2 },
    { name: "믿음", order: 3 },
  ];

  for (const group of groups) {
    await prisma.group.upsert({
      where: { name: group.name },
      update: {},
      create: group,
    });
  }

  const firstGroup = await prisma.group.findFirst({ orderBy: { order: "asc" } });

  if (firstGroup) {
    await prisma.user.upsert({
      where: { username: "AJ" },
      update: {},
      create: {
        username: "AJ",
        password: hashSync("3927", 10),
        role: "PASTOR",
        groupId: firstGroup.id,
      },
    });
  }

  console.log("Seed completed: 4 groups + admin user AJ created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
