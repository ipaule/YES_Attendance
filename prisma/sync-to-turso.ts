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
  console.log("Syncing local dev.db → Turso...");

  // Clear Turso
  await turso.$executeRawUnsafe("DELETE FROM Attendance");
  await turso.$executeRawUnsafe("DELETE FROM AttendanceDate");
  await turso.$executeRawUnsafe("DELETE FROM Member");
  await turso.$executeRawUnsafe("DELETE FROM ShalomMember");
  await turso.$executeRawUnsafe("DELETE FROM ShalomHistory");
  await turso.$executeRawUnsafe("DELETE FROM TermHistory");
  await turso.$executeRawUnsafe("DELETE FROM GlobalDate");
  await turso.$executeRawUnsafe("UPDATE User SET teamId = NULL");
  await turso.$executeRawUnsafe("UPDATE Team SET leaderId = NULL");
  await turso.$executeRawUnsafe("DELETE FROM Team");
  await turso.$executeRawUnsafe("DELETE FROM User");
  await turso.$executeRawUnsafe('DELETE FROM "Group"');
  console.log("  Turso cleared");

  // Sync Groups
  const groups = await local.group.findMany();
  for (const g of groups) {
    await turso.group.create({ data: g });
  }
  console.log(`  Groups: ${groups.length}`);

  // Sync Users (without teamId first to avoid FK issues)
  const users = await local.user.findMany();
  for (const u of users) {
    await turso.user.create({ data: { ...u, teamId: null } });
  }
  console.log(`  Users: ${users.length}`);

  // Sync Teams (without leaderId first)
  const teams = await local.team.findMany();
  for (const t of teams) {
    await turso.team.create({ data: { ...t, leaderId: null } });
  }
  console.log(`  Teams: ${teams.length}`);

  // Now set leaderId and teamId
  for (const t of teams) {
    if (t.leaderId) {
      await turso.team.update({ where: { id: t.id }, data: { leaderId: t.leaderId } });
    }
  }
  for (const u of users) {
    if (u.teamId) {
      await turso.user.update({ where: { id: u.id }, data: { teamId: u.teamId } });
    }
  }
  console.log("  FK links set");

  // Sync Members
  const members = await local.member.findMany();
  for (const m of members) {
    await turso.member.create({ data: m });
  }
  console.log(`  Members: ${members.length}`);

  // Sync AttendanceDates
  const dates = await local.attendanceDate.findMany();
  for (const d of dates) {
    await turso.attendanceDate.create({ data: d });
  }
  console.log(`  Dates: ${dates.length}`);

  // Sync Attendance
  const attendance = await local.attendance.findMany();
  for (const a of attendance) {
    await turso.attendance.create({ data: a });
  }
  console.log(`  Attendance: ${attendance.length}`);

  // Sync GlobalDates
  const globalDates = await local.globalDate.findMany();
  for (const g of globalDates) {
    await turso.globalDate.create({ data: g });
  }
  console.log(`  GlobalDates: ${globalDates.length}`);

  // Sync TermHistory
  const termHistories = await local.termHistory.findMany();
  for (const t of termHistories) {
    await turso.termHistory.create({ data: t });
  }
  console.log(`  TermHistory: ${termHistories.length}`);

  // Sync ShalomMembers
  const shalomMembers = await local.shalomMember.findMany();
  for (const s of shalomMembers) {
    await turso.shalomMember.create({ data: s });
  }
  console.log(`  ShalomMembers: ${shalomMembers.length}`);

  // Sync ShalomHistory
  const shalomHistories = await local.shalomHistory.findMany();
  for (const s of shalomHistories) {
    await turso.shalomHistory.create({ data: s });
  }
  console.log(`  ShalomHistory: ${shalomHistories.length}`);

  console.log("Done!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await turso.$disconnect();
    await local.$disconnect();
  });
