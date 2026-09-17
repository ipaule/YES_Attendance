// Turso-targeted twin of backfill-member-birthday.ts — same additive,
// scoped-match logic, opposite guard (requires Turso env vars instead of
// forcing them empty). Run after scripts/drop-removed-profile-columns.ts
// (Member.birthday must exist first).
//
// Additive only: never deletes, never overwrites a Member.birthday that's
// already set, and skips (reporting) any name that resolveRosterMember
// can't confidently match — never a bare name match, per this project's
// documented wrong-person history. Safe to re-run.
export {}; // no top-level import in this file otherwise — forces module
           // scope so `main` doesn't collide with the local twin's `main`.

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    "TURSO_DATABASE_URL/TURSO_AUTH_TOKEN must be set to run this against Turso — see backfill-member-birthday.ts for the local-only version."
  );
}

async function main() {
  const { prisma } = await import("../src/lib/db");
  const { resolveRosterMember } = await import("../src/lib/roster-match");

  const members = await prisma.member.findMany({
    where: { birthday: "" },
    include: { team: { include: { group: true } } },
  });

  console.log(`${members.length} team members missing birthday. Resolving against roster...`);

  let filled = 0;
  let noMatch = 0;
  let ambiguous = 0;
  let rosterBlank = 0;

  for (const m of members) {
    const result = await resolveRosterMember({
      name: m.name,
      teamName: m.team.name,
      groupName: m.team.group.name,
      gender: m.gender || null,
      birthYear: m.birthYear || null,
    });

    if (result === null) {
      noMatch++;
      console.log(`  no match: ${m.name} (${m.team.group.name}/${m.team.name})`);
      continue;
    }
    if ("ambiguous" in result) {
      ambiguous++;
      console.log(`  ambiguous: ${m.name} (${m.team.group.name}/${m.team.name}) — ${result.candidates.length} candidates`);
      continue;
    }
    if (!result.birthday) {
      rosterBlank++;
      continue; // roster itself has no birthday — leave Member.birthday blank too
    }

    await prisma.member.update({
      where: { id: m.id },
      data: { birthday: result.birthday },
    });
    filled++;
  }

  console.log(`\nFilled: ${filled}`);
  console.log(`Roster match has no birthday (left blank): ${rosterBlank}`);
  console.log(`No roster match: ${noMatch}`);
  console.log(`Ambiguous match (left blank): ${ambiguous}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
