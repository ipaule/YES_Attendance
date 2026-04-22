import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const leaderName = "권오익";
const groupName = "믿음";

const rosterData = [
  { name: "이준희", birthDate: "12/13/1985", gender: "남", phone: "213-872-7499", note: "구원의 확신 있음" },
  { name: "이병진", birthDate: "12/1/1980", gender: "남", phone: "714-345-7421", note: "구원의 확신 있음" },
  { name: "나민재", birthDate: "2/24/1983", gender: "남", phone: "925-300-7795", note: "구원의 확신 있음" },
  { name: "김규태", birthDate: "2/20/1991", gender: "남", phone: "909-456-0956", note: "구원의 확신 있음" },
  { name: "손운빈", birthDate: "3/31/1991", gender: "남", phone: "714-222-4700", note: "구원의 확신 있음" },
  { name: "양경호", birthDate: "7/13/1983", gender: "남", phone: "714-501-9986", note: "구원의 확신 있음" },
  { name: "정영선", birthDate: "1/14/1985", gender: "남", phone: "718-440-6600", note: "구원의 확신 있음" },
  { name: "곽신영", birthDate: "11/27/1987", gender: "여", phone: "213-999-7512", note: "구원의 확신 있음" },
  { name: "나예림", birthDate: "7/21/1989", gender: "여", phone: "310-713-7760", note: "구원의 확신 있음" },
  { name: "김써니", birthDate: "5/6/1990", gender: "여", phone: "818-523-2027", note: "구원의 확신 있음" },
  { name: "이세누리", birthDate: "9/19/1989", gender: "여", phone: "818-269-3866", note: "구원의 확신 있음" },
  { name: "윤나영", birthDate: "12/23/1985", gender: "여", phone: "213-948-3232", note: "김슬기 샬롬 졸업 - 4/5" },
];

function extractYear(dateStr: string): string {
  const parts = dateStr.split("/");
  return parts[2]; // MM/DD/YYYY format
}

async function main() {
  let created = 0;
  let skipped = 0;

  for (const data of rosterData) {
    const existing = await prisma.rosterMember.findFirst({
      where: { name: data.name, teamName: leaderName },
    });

    if (existing) {
      console.log(`Skip: ${data.name} (already exists in ${leaderName}'s team)`);
      skipped++;
      continue;
    }

    await prisma.rosterMember.create({
      data: {
        name: data.name,
        groupName,
        teamName: leaderName,
        gender: data.gender,
        birthYear: extractYear(data.birthDate),
        phone: data.phone,
        note: data.note,
      },
    });

    console.log(`Created: ${data.name}`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
