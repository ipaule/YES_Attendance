import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Entry = [string, string, string, string, string]; // name, birthDate (M/D/YYYY), gender, phone, rawNote

function toBirthday(d: string): string {
  if (!d.trim()) return "";
  const [m, day, y] = d.split("/");
  return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractYear(d: string): string {
  return d.split("/")[2] ?? "";
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

// ── Step 1: Fix 믿음 birthday format (M/D/YYYY → YYYY-MM-DD) ────────────────
async function fixMiDeumBirthdays() {
  const bad = await prisma.rosterMember.findMany({
    where: { birthday: { contains: "/" } },
  });

  let fixed = 0;
  for (const r of bad) {
    await prisma.rosterMember.update({
      where: { id: r.id },
      data: { birthday: toBirthday(r.birthday) },
    });
    fixed++;
  }
  console.log(`Fixed ${fixed} 믿음 birthday formats.`);
}

// ── Step 2: 소망 roster data ─────────────────────────────────────────────────
const data: Record<string, Entry[]> = {
  송하영: [
    ["이동찬", "5/5/1994",   "남", "380-997-8856", "구원의 확신 있음"],
    ["서창현", "1/20/1993",  "남", "657-258-8020", "아직 구원의 확신 없음"],
    ["배창현", "4/21/1995",  "남", "657-620-7100", "구원의 확신 있음"],
    ["정호진", "4/4/1998",   "남", "386-506-6934", "구원의 확신 있음"],
    ["김반석", "1/19/1995",  "남", "213-273-4691", "이웅희 샬롬 졸업 - 4/5"],
    ["오예진", "4/27/1998",  "여", "714-766-9898", "구원의 확신 있음"],
    ["이우정", "1/17/1993",  "여", "760-705-6717", "구원의 확신 있음"],
    ["최예림", "9/23/1997",  "여", "213-249-0541", "구원의 확신 있음"],
    ["김예빈", "5/6/1996",   "여", "669-977-8241", "구원의 확신 있음"],
  ],
  안예원: [
    ["김승태", "11/27/1993", "남", "949-969-2472", "구원의 확신 있음"],
    ["유성민", "1/22/1994",  "남", "562-351-7158", "구원의 확신 있음"],
    ["김태호", "11/28/1994", "남", "916-738-0026", "아직 구원의 확신 없음"],
    ["모요한", "9/16/1994",  "남", "213-322-5699", "구원의 확신 있음"],
    ["최승규", "11/13/1998", "남", "310-365-6822", "아직 구원의 확신 없음"],
    ["송아영", "11/13/1995", "여", "419-705-6521", "구원의 확신 있음"],
    ["박해선", "2/24/1994",  "여", "213-609-4441", "구원의 확신 있음"],
    ["이승주", "8/23/1995",  "여", "619-705-8234", "구원의 확신 있음"],
  ],
  이민경: [
    ["노민우", "3/3/1994",   "남", "714-737-7526", "잘 모르겠음"],
    ["마경석", "4/23/1993",  "남", "408-826-7813", "구원의 확신 있음"],
    ["김영현", "1/5/1994",   "남", "657-341-8234", "구원의 확신 있음"],
    ["박기호", "12/11/1993", "남", "949-254-2222", "잘 모르겠음"],
    ["이혜연", "4/7/1995",   "여", "213-924-3174", "구원의 확신 있음"],
    ["이유선", "6/3/1996",   "여", "714-576-3876", "구원의 확신 있음"],
    ["고휘",   "2/1/1995",   "여", "614-929-9295", "구원의 확신 있음"],
    ["정지민", "11/17/1996", "여", "949-683-1647", "구원의 확신 있음"],
  ],
  김성윤: [
    ["이후민", "10/20/1994", "남", "714-886-8553", "구원의 확신 있음"],
    ["김재우", "6/26/1997",  "남", "909-925-7768", "구원의 확신 있음"],
    ["조정익", "9/29/1994",  "남", "949-774-8171", "구원의 확신 있음"],
    ["조근형", "10/14/1998", "남", "814-826-8639", "구원의 확신 있음"],
    ["김이주", "12/23/1996", "여", "909-760-7159", "구원의 확신 있음"],
    ["송지수", "10/14/1994", "여", "714-469-0561", "구원의 확신 있음"],
    ["이예닮", "1/10/1998",  "여", "213-248-3990", "구원의 확신 있음"],
    ["이채영", "5/12/1997",  "여", "949-942-0390", "구원의 확신 있음"],
  ],
  이현우: [
    ["김수영", "11/16/1993", "남", "949-577-0319", "구원의 확신 있음"],
    ["백주안", "12/23/1996", "남", "310-684-9492", "구원의 확신 있음"],
    ["김우현", "4/19/1994",  "남", "951-233-0898", "구원의 확신 있음"],
    ["김도훈", "5/14/1998",  "남", "520-257-6632", "구원의 확신 있음"],
    ["김태연", "3/29/1993",  "여", "213-999-5701", "구원의 확신 있음"],
    ["신지현", "5/13/1995",  "여", "714-334-9269", "잘 모르겠음"],
    ["김진선", "5/9/1996",   "여", "323-776-2926", "구원의 확신 있음"],
    ["배유민", "3/20/1998",  "여", "657-252-2607", "아직 구원의 확신 없음"],
    ["김두현", "",           "여", "818-858-4839", ""],
  ],
  송현빈: [
    ["김인찬", "2/6/1993",   "남", "225-588-6612", "구원의 확신 있음"],
    ["김앤디", "2/19/1993",  "남", "206-334-5351", "구원의 확신 있음"],
    ["함형진", "4/6/1995",   "남", "714-732-1274", "구원의 확신 있음"],
    ["이해승", "3/6/1996",   "남", "323-970-7810", "아직 구원의 확신 없음"],
    ["배서영", "8/6/1997",   "여", "617-459-3383", "구원의 확신 있음"],
    ["김채선", "12/7/1998",  "여", "714-514-9652", "구원의 확신 있음"],
    ["김조이", "3/23/1996",  "여", "714-512-7384", "구원의 확신 있음"],
    ["오민영", "12/7/1998",  "여", "562-240-7438", "구원의 확신 있음"],
  ],
  박성주: [
    ["정대성", "11/13/1996", "남", "714-266-8993", "구원의 확신 있음"],
    ["김연성", "5/20/1993",  "남", "657-252-6564", "구원의 확신 있음"],
    ["조용현", "9/14/1998",  "남", "714-773-2998", "구원의 확신 있음"],
    ["이홍준", "1/6/1996",   "남", "951-214-1835", "구원의 확신 있음"],
    ["차수빈", "4/21/1997",  "여", "909-569-4267", "구원의 확신 있음"],
    ["강현진", "12/13/1994", "여", "714-321-3070", "구원의 확신 있음"],
    ["이재서", "3/20/1994",  "여", "657-239-6284", "구원의 확신 있음"],
    ["이예은", "11/19/1994", "여", "213-800-3571", "구원의 확신 있음"],
    ["남혜준", "10/21/1996", "여", "332-323-7393", "이성진 샬롬 졸업 - 4/12"],
  ],
  권오준: [
    ["임겸",   "5/7/1993",   "남", "714-204-5328", "구원의 확신 있음"],
    ["홍예찬", "11/9/1993",  "남", "714-900-0295", "구원의 확신 있음"],
    ["이인용", "10/16/1998", "남", "714-448-8895", "구원의 확신 있음"],
    ["표중현", "10/13/1998", "남", "929-990-5978", "구원의 확신 있음"],
    ["이정란", "9/6/1997",   "여", "714-886-8552", "구원의 확신 있음"],
    ["안수진", "1/24/1996",  "여", "213-435-5750", "구원의 확신 있음"],
    ["신서연", "8/18/1998",  "여", "714-735-0010", "구원의 확신 있음"],
    ["원하은", "2/13/1994",  "여", "714-318-3037", "구원의 확신 있음"],
    ["이서영", "5/24/1993",  "여", "317-703-4819", "김슬기 샬롬 졸업 - 4/5"],
  ],
  안찬송: [
    ["김영인", "7/29/1995",  "남", "909-816-4369", "구원의 확신 있음"],
    ["이성진", "10/26/1997", "남", "925-623-2126", "구원의 확신 있음"],
    ["김윤재", "4/13/1997",  "남", "949-599-4091", "구원의 확신 있음"],
    ["정선혁", "12/17/1998", "남", "714-880-2473", "구원의 확신 있음"],
    ["박윤진", "12/8/1994",  "여", "949-812-2556", "구원의 확신 있음"],
    ["최지은", "3/15/1994",  "여", "760-896-5240", "구원의 확신 있음"],
    ["박현진", "5/11/1997",  "여", "770-361-2228", "구원의 확신 있음"],
    ["여수민", "11/29/1995", "여", "657-256-2406", "아직 구원의 확신 없음"],
    ["이현정", "12/21/1995", "여", "562-347-5220", "이성진 샬롬 졸업 - 4/12"],
  ],
};

async function importSomang() {
  const teams = await prisma.team.findMany({ include: { group: true } });
  const teamMap = Object.fromEntries(teams.map((t) => [t.name, t]));

  let upserted = 0;
  let memberCreated = 0;

  for (const [leaderName, entries] of Object.entries(data)) {
    const team = teamMap[leaderName];
    if (!team) { console.error(`Team not found: ${leaderName}`); continue; }
    const groupName = team.group.name;

    for (const [name, rawDate, gender, phone, rawNote] of entries) {
      const { salvationAssurance, note } = parseNote(rawNote);
      const birthday = rawDate ? toBirthday(rawDate) : "";
      const birthYear = rawDate ? extractYear(rawDate) : "";

      const existing = await prisma.rosterMember.findFirst({
        where: { name, teamName: leaderName },
      });

      if (existing) {
        await prisma.rosterMember.update({
          where: { id: existing.id },
          data: { birthday, birthYear, salvationAssurance, note, groupName, gender, phone },
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

async function main() {
  await fixMiDeumBirthdays();
  await importSomang();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
