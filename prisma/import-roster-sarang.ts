import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Entry = [string, string, string, string, string];

function toBirthday(d: string): string {
  if (!d.trim()) return "";
  const [m, day, y] = d.split("/");
  return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractYear(d: string): string {
  return d.split("/")[2] ?? "";
}

function normalizePhone(p: string): string {
  return p.trim().replace(/\s+/g, "-");
}

function parseNote(raw: string): { salvationAssurance: string; note: string } {
  if (!raw.trim()) return { salvationAssurance: "", note: "" };
  const parts = raw.split("|").map((p) => p.trim());
  let salvationAssurance = "";
  const noteParts: string[] = [];
  for (const p of parts) {
    if (p === "구원의 확신 있음") salvationAssurance = "있음";
    else if (p === "아직 구원의 확신 없음") salvationAssurance = "없음";
    else if (p === "잘 모르겠음") salvationAssurance = "잘 모르겠음";
    else if (p) noteParts.push(p);
  }
  return { salvationAssurance, note: noteParts.join(" | ") };
}

const data: Record<string, Entry[]> = {
  감예인: [
    ["박준식", "1/6/2000",   "남", "805-895-5975", "구원의 확신 있음"],
    ["최태환", "7/26/1999",  "남", "213-393-9126", "구원의 확신 있음"],
    ["곽예성", "11/11/2000", "남", "925 319 8892", "잘 모르겠음"],
    ["김몰건", "3/29/1999",  "남", "714-213-9900", "이성진 샬롬 졸업 - 4/12"],
    ["최영선", "6/4/1999",   "여", "562-449-1713", "구원의 확신 있음"],
    ["양혜람", "11/2/2002",  "여", "657-222-7600", "구원의 확신 있음"],
    ["노을",   "3/1/2001",   "여", "760-499-0880", "구원의 확신 있음"],
    ["류예나", "8/4/2004",   "여", "714-853-4411", "구원의 확신 있음"],
    ["김명혜", "7/14/2000",  "여", "562-244-5961", "구원의 확신 있음"],
    ["이해원", "2/2/1999",   "여", "510-710-2032", "김슬기 샬롬 졸업 - 4/5"],
  ],
  김아이린: [
    ["남민수", "5/18/1999",  "남", "714-732-0275", "잘 모르겠음"],
    ["김한별", "10/8/2001",  "남", "213-589-5802", "구원의 확신 있음"],
    ["반동규", "6/8/2000",   "남", "714-715-5184", "구원의 확신 있음"],
    ["김지우", "11/5/2000",  "여", "714-323-1300", "구원의 확신 있음"],
    ["강예지", "2/1/2001",   "여", "714-249-5126", "구원의 확신 있음"],
    ["이성은", "9/28/1999",  "여", "714-337-8389", "구원의 확신 있음"],
    ["백이경", "9/26/2000",  "여", "619-455-9030", "구원의 확신 있음"],
    ["이은서", "10/22/1999", "여", "714-576-3629", "구원의 확신 있음"],
    ["이채정", "10/6/2003",  "여", "657-835-8744", "이웅희 샬롬 졸업 - 4/5"],
  ],
  이예일: [
    ["김재민", "6/29/2000",  "남", "646-943-3998", "구원의 확신 있음"],
    ["주재훈", "10/27/2000", "남", "310-346-4526", "구원의 확신 있음"],
    ["조하영", "10/27/2004", "남", "840-213-7767", "구원의 확신 있음"],
    ["임승주", "2/20/2002",  "남", "201-518-6596", "이성진 샬롬 졸업 - 4/12"],
    ["이승현", "9/22/1999",  "여", "570-665-4449", "아직 구원의 확신 없음"],
    ["배윤서", "12/24/2000", "여", "830 350 2570", "아직 구원의 확신 없음"],
    ["전예은", "12/16/2002", "여", "657-474-6806", "구원의 확신 있음"],
    ["김채원", "11/2/1999",  "여", "714-699-0933", "구원의 확신 있음"],
    ["최진주", "3/3/2001",   "여", "626-324-4920", "구원의 확신 있음"],
  ],
  김헤일리: [
    ["설지인", "1/4/2000",   "여", "325-716-5278", "아직 구원의 확신 없음"],
    ["정지오", "12/24/2000", "여", "213-500-6982", "잘 모르겠음"],
    ["좌혜연", "3/4/2000",   "여", "213-298-4624", ""],
    ["이연수", "4/23/2003",  "여", "814-954-2336", "아직 구원의 확신 없음"],
    ["김다연", "8/3/1999",   "여", "323-839-7819", "구원의 확신 있음"],
    ["정은총", "2/10/2000",  "여", "626-499-9736", "잘 모르겠음"],
    ["김예진", "7/28/2001",  "여", "213-271-4750", "구원의 확신 있음"],
    ["허예은", "3/12/2002",  "여", "714-476-4532", "구원의 확신 있음"],
  ],
  김성현: [
    ["최혜성", "10/26/1999", "남", "714-476-8835", "잘 모르겠음"],
    ["조은",   "8/12/1999",  "남", "714-944-2234", "구원의 확신 있음"],
    ["윤도연", "3/27/2000",  "남", "949-659-7933", "아직 구원의 확신 없음"],
    ["이수아", "9/30/2000",  "여", "818-489-9492", "구원의 확신 있음"],
    ["조현아", "10/27/2001", "여", "208-916-5990", "구원의 확신 있음"],
    ["고지호", "5/14/1999",  "여", "714-208-4976", "구원의 확신 있음"],
    ["김수빈", "10/21/2000", "여", "949-795-3745", "구원의 확신 있음"],
    ["이우주", "4/1/2003",   "여", "510-990-7846", "구원의 확신 있음"],
  ],
};

async function main() {
  const teams = await prisma.team.findMany({ include: { group: true } });
  const teamMap = Object.fromEntries(teams.map((t) => [t.name, t]));

  let upserted = 0;
  let memberCreated = 0;

  for (const [leaderName, entries] of Object.entries(data)) {
    const team = teamMap[leaderName];
    if (!team) { console.error(`Team not found: ${leaderName}`); continue; }
    const groupName = team.group.name;

    for (const [name, rawDate, gender, rawPhone, rawNote] of entries) {
      const { salvationAssurance, note } = parseNote(rawNote);
      const birthday = rawDate ? toBirthday(rawDate) : "";
      const birthYear = rawDate ? extractYear(rawDate) : "";
      const phone = normalizePhone(rawPhone);

      const existing = await prisma.rosterMember.findFirst({
        where: { name, teamName: leaderName },
      });

      if (existing) {
        await prisma.rosterMember.update({
          where: { id: existing.id },
          data: { birthday, birthYear, gender, phone, salvationAssurance, note, groupName },
        });
      } else {
        await prisma.rosterMember.create({
          data: { name, groupName, teamName: leaderName, gender, birthYear, birthday, phone, salvationAssurance, note },
        });
      }
      upserted++;

      const memberExists = await prisma.member.findFirst({ where: { name, teamId: team.id } });
      if (!memberExists) {
        await prisma.member.create({
          data: { name, gender, birthYear, teamId: team.id },
        });
        memberCreated++;
      }
    }

    console.log(`✓ ${leaderName}: ${entries.length} entries`);
  }

  console.log(`\nDone: ${upserted} roster upserts, ${memberCreated} new member records.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
