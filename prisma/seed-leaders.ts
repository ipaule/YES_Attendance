import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const leaders: Record<string, string[]> = {
  믿음: ["권오익", "이상민", "김다빈", "장인환", "김성진", "윤지혜", "이정희", "안성경"],
  소망: ["송하영", "안예원", "이민경", "김성윤", "이현우", "송현빈", "박성주", "권오준", "안찬송"],
  사랑: ["감예인", "김아이린", "이예일", "김헤일리", "김성현"],
  샬롬: ["김슬기", "최현지", "원하은", "이수아", "조창현", "강예지"],
};

async function main() {
  const groups = await prisma.group.findMany();
  const groupMap = Object.fromEntries(groups.map((g) => [g.name, g.id]));

  const password = hashSync("1234", 10);
  let userCount = 0;
  let rosterCount = 0;

  for (const [groupName, names] of Object.entries(leaders)) {
    const groupId = groupMap[groupName];
    if (!groupId) {
      console.error(`Group not found: ${groupName}`);
      continue;
    }

    for (const name of names) {
      await prisma.user.upsert({
        where: { username: name },
        update: { groupId, role: "LEADER" },
        create: { username: name, password, role: "LEADER", groupId },
      });
      userCount++;

      await prisma.rosterMember.create({
        data: { name, groupName },
      });
      rosterCount++;
    }
  }

  console.log(`Done: ${userCount} users, ${rosterCount} roster entries created.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
