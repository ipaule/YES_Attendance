// One-time backfill: encrypts plaintext PII in local dev.db.
// Idempotent — rows already prefixed with "v1:" are skipped.
// Run via: npm run encrypt:backfill
//   (which loads .env.local via --env-file before this module is parsed)
import { PrismaClient } from "@prisma/client";
import { encrypt, isEncrypted } from "../src/lib/crypto";

// Raw client — writes pre-encrypted values directly, bypasses the $extends wrapper
const prisma = new PrismaClient();

async function backfill(
  modelName: string,
  rows: Array<Record<string, unknown>>,
  fields: readonly string[],
  updateFn: (id: string, patch: Record<string, string>) => Promise<unknown>,
) {
  let encrypted = 0;
  let skipped = 0;

  for (const row of rows) {
    const patch: Record<string, string> = {};
    for (const f of fields) {
      const v = row[f];
      if (typeof v === "string" && v !== "" && !isEncrypted(v)) {
        patch[f] = encrypt(v);
      }
    }
    if (Object.keys(patch).length > 0) {
      await updateFn(row.id as string, patch);
      encrypted++;
    } else {
      skipped++;
    }
  }

  console.log(`  ${modelName}: encrypted ${encrypted} / skipped ${skipped}`);
}

async function main() {
  console.log("Encrypting existing data in dev.db...");

  await backfill(
    "RosterMember",
    await prisma.rosterMember.findMany({
      select: { id: true, phone: true, email: true, address: true, prayerRequest: true, note: true, birthday: true, salvationAssurance: true, statusReason: true },
    }) as Array<Record<string, unknown>>,
    ["phone", "email", "address", "prayerRequest", "note", "birthday", "salvationAssurance", "statusReason"],
    (id, patch) => prisma.rosterMember.update({ where: { id }, data: patch }),
  );

  await backfill(
    "ShalomMember",
    await prisma.shalomMember.findMany({ select: { id: true, phone: true, note: true } }) as Array<Record<string, unknown>>,
    ["phone", "note"],
    (id, patch) => prisma.shalomMember.update({ where: { id }, data: patch }),
  );

  await backfill(
    "TermHistory",
    await prisma.termHistory.findMany({ select: { id: true, data: true } }) as Array<Record<string, unknown>>,
    ["data"],
    (id, patch) => prisma.termHistory.update({ where: { id }, data: patch }),
  );

  await backfill(
    "ShalomHistory",
    await prisma.shalomHistory.findMany({ select: { id: true, data: true } }) as Array<Record<string, unknown>>,
    ["data"],
    (id, patch) => prisma.shalomHistory.update({ where: { id }, data: patch }),
  );

  console.log("Done. Re-run to verify all rows are skipped (idempotency check).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
