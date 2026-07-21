import { readFileSync } from "fs";
import { prisma } from "../src/lib/db";

async function main() {
  const path = process.argv[2];
  const folderName = process.argv[3];
  if (!path || !folderName) {
    console.error("usage: tsx prisma/import-graduated-list.ts <json-path> <folder-name>");
    process.exit(1);
  }

  const people = JSON.parse(readFileSync(path, "utf-8")) as Array<Record<string, string>>;
  const withIds = people.map((p) => ({ id: crypto.randomUUID(), ...p }));

  const maxOrder = await prisma.shalomHistory.aggregate({ _max: { order: true } });

  const folder = await prisma.shalomHistory.create({
    data: {
      name: folderName,
      type: "FOLDER",
      data: JSON.stringify(withIds),
      parentId: null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  console.log(`Created folder "${folder.name}" (${folder.id}) with ${withIds.length} people.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
