import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Break circular refs before deleting
  await prisma.team.updateMany({ data: { leaderId: null } });
  await prisma.user.updateMany({
    where: { username: { not: "AJ" } },
    data: { groupId: null, teamId: null },
  });
  await prisma.user.update({
    where: { username: "AJ" },
    data: { groupId: null, teamId: null },
  });

  // Delete data in safe order
  await prisma.attendance.deleteMany();
  await prisma.attendanceDate.deleteMany();
  await prisma.member.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany({ where: { username: { not: "AJ" } } });
  await prisma.group.deleteMany();
  await prisma.globalDate.deleteMany();
  await prisma.termHistory.deleteMany();
  await prisma.shalomMember.deleteMany();
  await prisma.shalomHistory.deleteMany();
  await prisma.rosterMember.deleteMany();
  await prisma.dropdownOption.deleteMany();
  await prisma.link.deleteMany();

  console.log("Reset complete. Only AJ's account remains.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
