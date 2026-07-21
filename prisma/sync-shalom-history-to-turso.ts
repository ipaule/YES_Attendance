// One-off sync: local dev.db ShalomHistory -> Turso, mirrored exactly.
// Clears Turso's ShalomHistory table first, then inserts local's rows as-is.
// Scoped to this single table only — does not touch any other table.
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;

const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSQL(libsql);
const turso = new PrismaClient({ adapter } as never);
const local = new PrismaClient();

async function main() {
  console.log("Mirroring local dev.db ShalomHistory -> Turso (clear + exact replace)...");

  const rows = await local.shalomHistory.findMany();

  // Order parents before children: repeatedly peel off rows whose parent is
  // already placed (or has none), until everything is ordered.
  const ordered: typeof rows = [];
  const remaining = new Map(rows.map((r) => [r.id, r]));
  const placed = new Set<string>();
  while (remaining.size > 0) {
    const before = remaining.size;
    for (const [id, row] of remaining) {
      if (row.parentId === null || placed.has(row.parentId)) {
        ordered.push(row);
        placed.add(id);
        remaining.delete(id);
      }
    }
    if (remaining.size === before) {
      throw new Error(`Cycle or missing parent detected among: ${[...remaining.keys()].join(", ")}`);
    }
  }

  await turso.$executeRawUnsafe("DELETE FROM ShalomHistory");
  console.log("  Turso ShalomHistory cleared");

  for (const row of ordered) {
    await turso.shalomHistory.create({ data: row });
  }

  console.log(`  ShalomHistory inserted: ${ordered.length}`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await local.$disconnect();
    await turso.$disconnect();
  });
