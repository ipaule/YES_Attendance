// One-off restore: 샬롬 졸업 history entries that were flushed (archived +
// deleted from ShalomMember) without ever being moved to RosterMember first.
// See /Users/paul/.claude/plans/i-need-to-double-check-declarative-cocoa.md.
//
// Additive only — creates RosterMember rows, never deletes or clears anything.
//
// Usage (dry run by default; --apply to write):
//   set -a; source .env.local; source .env; set +a   # prod (Turso)
//   npx tsx prisma/restore-flushed-graduates.ts
//   npx tsx prisma/restore-flushed-graduates.ts --apply
//
//   set -a; source .env.local; set +a                # local dev.db (TURSO_* blank)
//   npx tsx prisma/restore-flushed-graduates.ts --apply
import { prisma } from "../src/lib/db";
import { normalizeRosterName } from "../src/lib/roster-names";

const APPLY = process.argv.includes("--apply");

interface HistoryPerson {
  id?: string;
  name: string;
  gender?: string;
  birthYear?: string;
  phone?: string;
  visitDate?: string;
  inviter?: string;
  leader?: string;
  note?: string;
  status?: string;
}

// History birthYear is a mix of "91"/"03" (2-digit) and "1999" (4-digit).
// Roster's 졸업 cohort is consistently 4-digit already, but normalize both
// sides the same way before comparing so a stray 2-digit value still matches.
function normalizeYear(v: string | null | undefined): string {
  if (!v) return "";
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return "";
  if (v.length >= 4) return String(n);
  return String(n >= 50 ? 1900 + n : 2000 + n);
}

async function main() {
  const historyRows = await prisma.shalomHistory.findMany({
    where: { name: { contains: "졸업" } },
  });

  const roster = await prisma.rosterMember.findMany({
    select: { id: true, name: true, gender: true, birthYear: true },
  });
  const rosterIndex = new Map<string, typeof roster>();
  for (const r of roster) {
    const key = normalizeRosterName(r.name);
    if (!rosterIndex.has(key)) rosterIndex.set(key, []);
    rosterIndex.get(key)!.push(r);
  }

  const toCreate: { source: string; person: HistoryPerson }[] = [];
  const skipped: { source: string; person: HistoryPerson; matched: string }[] = [];

  for (const row of historyRows) {
    const people = JSON.parse(row.data) as HistoryPerson[];
    for (const p of people) {
      if (p.status !== "졸업") continue;
      const candidates = (rosterIndex.get(normalizeRosterName(p.name)) ?? []).filter(
        (r) =>
          (!r.gender || !p.gender || r.gender === p.gender) &&
          (!r.birthYear || !p.birthYear || normalizeYear(r.birthYear) === normalizeYear(p.birthYear))
      );
      if (candidates.length > 0) {
        skipped.push({ source: row.name, person: p, matched: candidates.map((c) => c.name).join(", ") });
      } else {
        toCreate.push({ source: row.name, person: p });
      }
    }
  }

  console.log(`Scanned ${historyRows.length} 졸업 history folder(s).`);
  console.log(`\nAlready in roster (${skipped.length}) — skipping:`);
  for (const s of skipped) console.log(`  ${s.person.name} (${s.source}) -> matches roster: ${s.matched}`);

  console.log(`\nMissing from roster (${toCreate.length}) — ${APPLY ? "creating" : "would create"}:`);
  for (const c of toCreate) {
    console.log(
      `  ${c.person.name} | ${c.person.gender ?? "-"} | ${c.person.birthYear ?? "-"} | ${c.person.phone ?? "-"} | from ${c.source}`
    );
  }

  if (!APPLY) {
    console.log("\nDry run only — pass --apply to write these rows.");
    return;
  }
  if (toCreate.length === 0) {
    console.log("\nNothing to create.");
    return;
  }

  // Bump every existing row's order so the restored people land on top,
  // same "new arrivals first" behavior as the single-person 로스터로 이동 move.
  await prisma.$executeRawUnsafe(
    `UPDATE RosterMember SET "order" = "order" + ${toCreate.length}`
  );

  const created: { id: string; name: string }[] = [];
  for (let i = 0; i < toCreate.length; i++) {
    const { person } = toCreate[i];
    const header = `[샬롬 졸업${person.visitDate ? ` · 방문일: ${person.visitDate}` : ""}${
      person.inviter ? ` · 인도자: ${person.inviter}` : ""
    }]`;
    const leaderLine = person.leader ? `순장: ${person.leader}` : "";
    const noteCombined = [header, leaderLine, person.note].filter(Boolean).join("\n");

    const row = await prisma.rosterMember.create({
      data: {
        name: person.name,
        gender: person.gender ?? "",
        birthYear: person.birthYear ?? "",
        phone: person.phone ?? "",
        note: noteCombined,
        order: i,
      },
    });
    created.push({ id: row.id, name: row.name });
  }

  console.log(`\nCreated ${created.length} RosterMember row(s):`);
  for (const c of created) console.log(`  ${c.id}  ${c.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
