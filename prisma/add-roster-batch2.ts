import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Birthday format in source data: MM/DD/YY or MM/DD/YYYY → converted to YYYY-MM-DD
const entries = [
  { name: "양은혜",      englishName: "",           gender: "여", groupName: "",   phone: "714-369-9725", birthday: "1999-10-30" },
  { name: "조대현",      englishName: "",           gender: "남", groupName: "",   phone: "626-635-9547", birthday: "2000-03-25" },
  { name: "옥지은",      englishName: "Jieun Ok",   gender: "여", groupName: "사랑", phone: "714-420-3268", birthday: "2000-04-08" },
  { name: "한희윤",      englishName: "",           gender: "여", groupName: "사랑", phone: "510-320-7705", birthday: "2002-01-15" },
  { name: "차은지",      englishName: "",           gender: "여", groupName: "사랑", phone: "310-347-5443", birthday: "2001-03-05" },
  { name: "Samuel Kim",  englishName: "Samuel Kim", gender: "남", groupName: "",   phone: "612-345-0712", birthday: "1999-01-25" },
  { name: "박희서",      englishName: "",           gender: "여", groupName: "",   phone: "858-910-1189", birthday: "2001-04-20" },
  { name: "옥한나",      englishName: "Hanna Ok",   gender: "여", groupName: "사랑", phone: "714-420-3209", birthday: "2001-05-09" },
  { name: "박진하",      englishName: "",           gender: "여", groupName: "",   phone: "",             birthday: "2002-10-24" },
  { name: "이승현",      englishName: "",           gender: "남", groupName: "",   phone: "570-665-4449", birthday: "1999-09-22" },
  { name: "심민섭",      englishName: "Minsub shim",gender: "남", groupName: "사랑", phone: "813-415-4874", birthday: "1999-02-06" },
  { name: "양은별",      englishName: "",           gender: "여", groupName: "사랑", phone: "714-580-5582", birthday: "2000-12-20" },
  { name: "정예원",      englishName: "",           gender: "여", groupName: "사랑", phone: "310-345-2436", birthday: "2002-06-07" },
  { name: "원대인",      englishName: "",           gender: "남", groupName: "사랑", phone: "949-351-8557", birthday: "1999-10-24" },
  { name: "전수원",      englishName: "",           gender: "여", groupName: "사랑", phone: "310-757-1808", birthday: "2001-06-14" },
  { name: "박새미",      englishName: "",           gender: "여", groupName: "사랑", phone: "602-586-8794", birthday: "1999-04-09" },
  { name: "김혜경",      englishName: "",           gender: "여", groupName: "",   phone: "626-393-0344", birthday: "2000-10-26" },
  { name: "김은경",      englishName: "",           gender: "여", groupName: "",   phone: "626-392-0266", birthday: "2000-10-26" },
  { name: "고상윤",      englishName: "",           gender: "남", groupName: "",   phone: "213-570-1264", birthday: "1997-06-09" },
  { name: "박민우",      englishName: "",           gender: "남", groupName: "",   phone: "714-345-7956", birthday: "1996-04-09" },
  { name: "박건우",      englishName: "",           gender: "남", groupName: "",   phone: "949-413-5324", birthday: "1995-12-09" },
  { name: "김예진",      englishName: "",           gender: "여", groupName: "",   phone: "714-365-5391", birthday: "1994-12-02" },
  { name: "최대성",      englishName: "",           gender: "남", groupName: "",   phone: "858-900-1803", birthday: "1998-04-13" },
  { name: "최현지",      englishName: "",           gender: "여", groupName: "",   phone: "213-523-6041", birthday: "1998-11-17" },
  { name: "조유진",      englishName: "",           gender: "여", groupName: "",   phone: "973-583-3623", birthday: "1996-09-29" },
  { name: "윤도훈",      englishName: "",           gender: "남", groupName: "소망", phone: "424-381-1262", birthday: "1996-04-23" },
  { name: "목현수",      englishName: "Henry Mock", gender: "남", groupName: "소망", phone: "562-322-8569", birthday: "1996-03-02" },
  { name: "엄웅식",      englishName: "",           gender: "남", groupName: "소망", phone: "657-671-5548", birthday: "1995-05-01" },
  { name: "김해정",      englishName: "",           gender: "여", groupName: "",   phone: "714-865-7111", birthday: "1996-06-25" },
  { name: "최유진",      englishName: "",           gender: "여", groupName: "",   phone: "714-402-0246", birthday: "1996-09-30" },
  { name: "여주민",      englishName: "",           gender: "남", groupName: "",   phone: "657-217-3177", birthday: "1997-07-15" },
  { name: "양동현",      englishName: "",           gender: "남", groupName: "소망", phone: "562-896-2399", birthday: "1995-04-27" },
  { name: "진주환",      englishName: "Arthur Chin",gender: "남", groupName: "소망", phone: "424-371-3350", birthday: "1998-07-30" },
  { name: "오한별",      englishName: "Isaac Oh",   gender: "남", groupName: "소망", phone: "949-525-3170", birthday: "1997-09-21" },
  { name: "고휘",        englishName: "",           gender: "남", groupName: "",   phone: "614-929-9295", birthday: "1995-02-01" },
  { name: "김준영",      englishName: "",           gender: "남", groupName: "",   phone: "213-700-1702", birthday: "1996-08-19" },
  { name: "양하은",      englishName: "Grace Yang", gender: "여", groupName: "소망", phone: "714-904-5353", birthday: "1998-02-28" },
  { name: "이웅희",      englishName: "",           gender: "남", groupName: "",   phone: "310-531-3538", birthday: "1993-08-27" },
  { name: "최영 (Robin)",englishName: "Robin Choi", gender: "남", groupName: "소망", phone: "714-620-9861", birthday: "1994-04-25" },
  { name: "전장희",      englishName: "",           gender: "여", groupName: "",   phone: "714-944-7334", birthday: "1994-01-14" },
  { name: "최명성",      englishName: "",           gender: "남", groupName: "",   phone: "714-476-8836", birthday: "1997-01-17" },
  { name: "임예은",      englishName: "Joann Lim",  gender: "여", groupName: "사랑", phone: "714-514-8198", birthday: "1997-04-09" },
  { name: "박지수",      englishName: "",           gender: "여", groupName: "",   phone: "909-703-7564", birthday: "1996-10-03" },
  { name: "최원희",      englishName: "",           gender: "남", groupName: "",   phone: "334-744-7037", birthday: "1993-01-26" },
  { name: "김리아",      englishName: "",           gender: "여", groupName: "",   phone: "659-252-9135", birthday: "1996-03-04" },
];

async function main() {
  for (const entry of entries) {
    const existing = await prisma.rosterMember.findFirst({ where: { name: entry.name } });
    if (existing) {
      if (!existing.birthday && entry.birthday) {
        await prisma.rosterMember.update({
          where: { id: existing.id },
          data: { birthday: entry.birthday },
        });
        console.log(`✓ Updated birthday: ${entry.name} → ${entry.birthday}`);
      } else {
        console.log(`⚠  Skipped (already exists): ${entry.name}`);
      }
      continue;
    }
    await prisma.$executeRawUnsafe('UPDATE "RosterMember" SET "order" = "order" + 1');
    await prisma.rosterMember.create({
      data: { ...entry, teamName: "", order: 0 },
    });
    console.log(`✓ Added: ${entry.name}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
