// Brings Turso schema up to date with local schema.prisma.
// Safe to re-run — uses ALTER TABLE IF NOT EXISTS (via column-existence check).
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

async function main() {
  console.log("Migrating Turso schema...");

  // ── ShalomMember ──────────────────────────────────────────────────────────
  const sm = await getColumns("ShalomMember");
  await addCol("ShalomMember", "englishName",    "TEXT NOT NULL DEFAULT ''", sm);
  await addCol("ShalomMember", "movedToRosterAt","DATETIME",                 sm);

  // ── RosterMember ──────────────────────────────────────────────────────────
  const rm = await getColumns("RosterMember");
  await addCol("RosterMember", "englishName",              "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "birthday",                 "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "email",                    "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "phone",                    "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "address",                  "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "salvationAssurance",       "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "training",                 "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "memberNumber",             "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "prayerRequest",            "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "peerGroup",                "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "photo",                    "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "baptismStatus",            "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "recentAttendanceOverride", "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "contactStatus",            "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "personStatus",             "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "statusReason",             "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "assignee",                 "TEXT NOT NULL DEFAULT ''", rm);
  await addCol("RosterMember", "registrationDate",         "TEXT NOT NULL DEFAULT ''", rm);

  // ── DropdownOption ────────────────────────────────────────────────────────
  const doTables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='DropdownOption'"
  );
  if (doTables.rows.length === 0) {
    await client.execute(`
      CREATE TABLE DropdownOption (
        id        TEXT PRIMARY KEY,
        category  TEXT NOT NULL,
        value     TEXT NOT NULL,
        color     TEXT NOT NULL,
        "order"   INTEGER NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, value)
      )
    `);
    console.log("  + DropdownOption table created");
  }

  // ── Link ──────────────────────────────────────────────────────────────────
  const lk = await getColumns("Link");
  await addCol("Link", "editedBy", "TEXT NOT NULL DEFAULT ''", lk);

  // ── Member ────────────────────────────────────────────────────────────────
  // No new columns detected — verified match.

  console.log("Migration complete.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => client.close());
