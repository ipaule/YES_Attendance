// Testing-only: pulls production Turso data DOWN into local dev.db so local
// testing works against realistic data instead of tiny fixtures. Mirror of
// sync-to-turso.ts with the direction reversed — Turso is read-only here
// (only `findMany`), every write lands on the local PrismaClient. Uses raw
// PrismaClient on both sides by design — ciphertext passes through
// unchanged (same key on both, per sync-to-turso.ts's own comment).
//
// Clears LOCAL dev.db before writing (never Turso) — safe, dev.db is
// disposable test data. Preserves the local-only e2e-pastor test account
// (it has no Turso counterpart) the same way sync-to-turso.ts preserves AJ.
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
  console.log("Syncing Turso → local dev.db...");

  const e2ePastor = await local.user.findUnique({ where: { username: "e2e-pastor" } });

  // Clear local (never Turso — this connection never writes to `turso`).
  await local.$executeRawUnsafe("DELETE FROM PrayerNote");
  await local.$executeRawUnsafe("DELETE FROM Attendance");
  await local.$executeRawUnsafe("DELETE FROM AttendanceDate");
  await local.$executeRawUnsafe("DELETE FROM Member");
  await local.$executeRawUnsafe("DELETE FROM ShalomMember");
  await local.$executeRawUnsafe("DELETE FROM ShalomHistory");
  await local.$executeRawUnsafe("DELETE FROM RosterMember");
  await local.$executeRawUnsafe("DELETE FROM TermHistory");
  await local.$executeRawUnsafe("DELETE FROM GlobalDate");
  await local.$executeRawUnsafe("UPDATE User SET teamId = NULL");
  await local.$executeRawUnsafe("UPDATE Team SET leaderId = NULL");
  await local.$executeRawUnsafe("DELETE FROM Team");
  await local.$executeRawUnsafe("DELETE FROM User");
  await local.$executeRawUnsafe('DELETE FROM "Group"');
  console.log("  Local cleared");

  const groups = await turso.group.findMany();
  for (const g of groups) await local.group.create({ data: g });
  console.log(`  Groups: ${groups.length}`);

  const users = await turso.user.findMany();
  for (const u of users) await local.user.create({ data: { ...u, teamId: null } });
  console.log(`  Users: ${users.length}`);

  const teams = await turso.team.findMany();
  for (const t of teams) await local.team.create({ data: { ...t, leaderId: null } });
  console.log(`  Teams: ${teams.length}`);

  for (const t of teams) {
    if (t.leaderId) await local.team.update({ where: { id: t.id }, data: { leaderId: t.leaderId } });
  }
  for (const u of users) {
    if (u.teamId) await local.user.update({ where: { id: u.id }, data: { teamId: u.teamId } });
  }
  console.log("  FK links set");

  const members = await turso.member.findMany();
  for (const m of members) await local.member.create({ data: m });
  console.log(`  Members: ${members.length}`);

  const dates = await turso.attendanceDate.findMany();
  for (const d of dates) await local.attendanceDate.create({ data: d });
  console.log(`  Dates: ${dates.length}`);

  const attendance = await turso.attendance.findMany();
  for (const a of attendance) await local.attendance.create({ data: a });
  console.log(`  Attendance: ${attendance.length}`);

  const globalDates = await turso.globalDate.findMany();
  for (const g of globalDates) await local.globalDate.create({ data: g });
  console.log(`  GlobalDates: ${globalDates.length}`);

  const termHistories = await turso.termHistory.findMany();
  for (const t of termHistories) await local.termHistory.create({ data: t });
  console.log(`  TermHistory: ${termHistories.length}`);

  const shalomMembers = await turso.shalomMember.findMany();
  for (const s of shalomMembers) await local.shalomMember.create({ data: s });
  console.log(`  ShalomMembers: ${shalomMembers.length}`);

  const shalomHistories = await turso.shalomHistory.findMany();
  for (const s of shalomHistories) await local.shalomHistory.create({ data: s });
  console.log(`  ShalomHistory: ${shalomHistories.length}`);

  const rosterMembers = await turso.rosterMember.findMany();
  for (const r of rosterMembers) await local.rosterMember.create({ data: r });
  console.log(`  RosterMembers: ${rosterMembers.length}`);

  const prayerNotes = await turso.prayerNote.findMany();
  for (const p of prayerNotes) await local.prayerNote.create({ data: p });
  console.log(`  PrayerNotes: ${prayerNotes.length}`);

  // Restore the local-only e2e test account, unchanged.
  if (e2ePastor) {
    await local.user.create({ data: { ...e2ePastor, teamId: null } });
    console.log("  Restored local e2e-pastor test account");
  }

  console.log("Done!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await turso.$disconnect();
    await local.$disconnect();
  });
