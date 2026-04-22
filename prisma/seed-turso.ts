import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { hashSync } from "bcryptjs";
import { seedDropdownOptions } from "../src/lib/dropdownSeeds";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter } as never);

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

  await prisma.user.upsert({
    where: { username: "AJ" },
    update: { groupId: null },
    create: {
      username: "AJ",
      password: hashSync("3927", 10),
      role: "PASTOR",
      groupId: null,
    },
  });

  await seedDropdownOptions(prisma);

  console.log("Turso seed completed: 4 groups + admin user AJ + dropdown options");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
