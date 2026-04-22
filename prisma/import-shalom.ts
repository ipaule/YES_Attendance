import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Entry = [string, string, string]; // name, gender, 또래 (2-digit)

const data: Record<string, Entry[]> = {
  김슬기: [
    ["정서연", "여", "93"],
    ["이서영", "여", "93"],
    ["이해원", "여", "99"],
    ["윤나영", "여", "85"],
  ],
  최현지: [
    ["박민정", "여", "01"],
    ["이가현", "여", "01"],
    ["신민하", "여", "97"],
    ["신선하", "여", "99"],
    ["남태희", "남", "97"],
    ["이유영", "여", "01"],
  ],
  원하은: [
    ["Jason Choi", "남", "89"],
    ["김경민",     "남", "94"],
    ["정승엽",     "남", "95"],
    ["박현진",     "여", "91"],
  ],
  이수아: [
    ["김해니", "여", "99"],
    ["김인수", "남", "01"],
    ["이수빈", "여", "00"],
    ["이하진", "여", "91"],
    ["성윤석", "남", "01"],
  ],
  조창현: [
    ["임민규", "남", "98"],
    ["장석호", "남", "95"],
    ["김해나", "여", "02"],
    ["채지수", "여", "02"],
    ["김현지", "여", "02"],
    ["김수빈", "여", "97"],
    ["박정윤", "여", "02"],
  ],
  강예지: [
    ["최원재", "남", "04"],
    ["강민주", "여", "97"],
    ["이재민", "남", "93"],
    ["김예린", "여", "95"],
    ["송주랑", "여", "89"],
  ],
};

async function main() {
  let created = 0;
  let skipped = 0;

  for (const [leader, entries] of Object.entries(data)) {
    for (const [name, gender, birthYear] of entries) {
      const existing = await prisma.shalomMember.findFirst({
        where: { name, leader },
      });

      if (existing) {
        console.log(`Skip: ${name} (${leader})`);
        skipped++;
        continue;
      }

      await prisma.shalomMember.create({
        data: { name, gender, birthYear, leader, status: "등록" },
      });
      created++;
    }

    console.log(`✓ ${leader}: ${entries.length} entries`);
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
