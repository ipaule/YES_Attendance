// Brings Turso schema up to date for the 기도제목/profile-cleanup change:
//   - adds Member.birthday (additive)
//   - creates PrayerNote (additive)
//   - drops address/ministry/memberNumber/prayerRequest from RosterMember
//     and ShalomMember (destructive — this is the one intentional exception
//     to "Turso sync must be additive": the user asked for this data gone
//     for good, item 3, confirmed).
//
// Safe to re-run: every step checks current state first.
// Run the local dev migration (`npx prisma db push`) and this project's
// migration-script-reviewer check before ever pointing this at production.
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;
const client = createClient({ url, authToken });

async function getColumns(table: string): Promise<Set<string>> {
  const r = await client.execute(`PRAGMA table_info(${table})`);
  return new Set(r.rows.map((row) => row[1] as string));
}

async function addCol(table: string, col: string, def: string, existing: Set<string>) {
  if (existing.has(col)) return;
  await client.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  console.log(`  + ${table}.${col}`);
}

async function dropCol(table: string, col: string, existing: Set<string>) {
  if (!existing.has(col)) return;
  await client.execute(`ALTER TABLE ${table} DROP COLUMN ${col}`);
  console.log(`  - ${table}.${col}`);
}

async function main() {
  if (process.argv[2] !== "--yes") {
    console.log(
      `About to run against ${url} — this DROPs address/ministry/memberNumber/prayerRequest\n` +
      `from RosterMember and ShalomMember (irreversible, user-confirmed). Re-run with --yes to proceed.`
    );
    process.exit(1);
  }

  console.log("Migrating Turso schema (prayer notes + profile cleanup)...");

  // ── Member: carry birthday over so 또래 can be computed like the roster ──
  const mem = await getColumns("Member");
  await addCol("Member", "birthday", "TEXT NOT NULL DEFAULT ''", mem);

  // ── PrayerNote: new table ────────────────────────────────────────────────
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='PrayerNote'"
  );
  if (tables.rows.length === 0) {
    await client.execute(`
      CREATE TABLE PrayerNote (
        id               TEXT PRIMARY KEY,
        memberId         TEXT NOT NULL REFERENCES Member(id) ON DELETE CASCADE,
        attendanceDateId TEXT NOT NULL REFERENCES AttendanceDate(id) ON DELETE CASCADE,
        text             TEXT NOT NULL,
        updatedAt        DATETIME NOT NULL,
        UNIQUE(memberId, attendanceDateId)
      )
    `);
    console.log("  + PrayerNote table created");
  }

  // ── RosterMember / ShalomMember: drop the four removed fields ───────────
  const rm = await getColumns("RosterMember");
  for (const col of ["address", "ministry", "memberNumber", "prayerRequest"]) {
    await dropCol("RosterMember", col, rm);
  }

  const sm = await getColumns("ShalomMember");
  for (const col of ["address", "ministry", "memberNumber", "prayerRequest"]) {
    await dropCol("ShalomMember", col, sm);
  }

  console.log("Migration complete.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => client.close());
