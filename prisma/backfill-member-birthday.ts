// Backfills Member.birthday from the matching RosterMember, so the team
// attendance table can compute 또래 the same way the roster does
// (last two digits of birthday, falling back to birthYear).
//
// Additive only: never deletes, never overwrites a Member.birthday that's
// already set, and skips (reporting) any name that resolveRosterMember
// can't confidently match — never a bare name match, per this project's
// documented wrong-person history. Safe to re-run.
//
// Local dev.db only. `next dev` resolves TURSO_DATABASE_URL to "" because
// .env.local's blank value overrides .env's real one — but @prisma/client's
// own built-in dotenv loader only reads .env (ignores .env.local) and a
// plain `tsx` run of this file would otherwise pick up the real Turso
// credentials. Forcing them empty here, before the dynamic import below,
// guarantees src/lib/db.ts takes the local-sqlite branch regardless.
process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";

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
