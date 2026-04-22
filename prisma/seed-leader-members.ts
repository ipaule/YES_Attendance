import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: "LEADER", teamId: { not: null } },
    include: { team: { include: { group: true } }, group: true },
  });

  let rosterUpdated = 0;
  let membersCreated = 0;

  for (const user of users) {
    if (!user.team || !user.group) continue;

    // Update RosterMember: set teamName so they appear as assigned
    const updated = await prisma.rosterMember.updateMany({
      where: { name: user.username, teamName: "" },
      data: { teamName: user.team.name, groupName: user.group.name },
    });
    rosterUpdated += updated.count;

    // Create Member record in their team if not already there
    const existing = await prisma.member.findFirst({
      where: { name: user.username, teamId: user.teamId! },
    });

    if (!existing) {
      const rosterMember = await prisma.rosterMember.findFirst({
        where: { name: user.username },
      });
      await prisma.member.create({
        data: {
          name: user.username,
          gender: rosterMember?.gender ?? "남",
          birthYear: rosterMember?.birthYear ?? "",
          teamId: user.teamId!,
        },
      });
      membersCreated++;
    }
  }

  console.log(`Done: ${rosterUpdated} roster entries updated, ${membersCreated} member records created.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
