// Reshape: "2026 1월-6월" was seeded last task as a single RECORD holding a
// 40-member JSON blob. This turns it into a FOLDER named "2026 1월-6월"
// containing 40 individual child RECORDs, one per graduated member — so each
// person is its own item inside the folder, per the user's ask.
//
// Surgical — only deletes existing row(s) named exactly "2026 1월-6월"
// (not a full ShalomHistory wipe; any folders/records the user made in the
// meantime are untouched).
//
// Run locally:  npx tsx --env-file=.env.local prisma/seed-shalom-history-2026h1-v2.ts
// Run on Turso: npx tsx --env-file=.env.local prisma/run-turso.ts prisma/seed-shalom-history-2026h1-v2.ts
//
// Raw client — writes the pre-encrypted `data` blob directly, bypassing the
// @/lib/db $extends wrapper (which only auto-encrypts app-server writes).
import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/crypto";

const prisma = new PrismaClient();

interface GraduatedMember {
  name: string;
  gender: string;
  birthYear: string;
  phone: string;
  visitDate: string;
  inviter: string;
  leader: string;
  note: string;
  status: string;
}

const FOLDER_NAME = "2026 1월-6월";

// Gender re-derived from 자매(여)/형제(남) in the original roster paste.
// birthYear = year portion of the cleaned birthdate. Phone already
// normalized to XXX-XXX-XXXX. status is "졸업" for all (H1-2026 graduates).
const RAW: [string, "남" | "여", string, string, string][] = [
  // name, gender, birthYear, phone, leader
  ["오민영", "여", "1998", "562-240-7438", "최예림"],
  ["이채영", "여", "1997", "949-942-0390", "최예림"],
  ["조근형", "남", "1998", "814-826-8639", "최예림"],
  ["김금서", "여", "2002", "714-686-3620", "최예림"],
  ["정호진", "남", "1998", "386-506-6934", "강예지"],
  ["최승규", "남", "1998", "310-365-6822", "강예지"],
  ["고태의", "여", "1992", "714-975-1212", "강예지"],
  ["이서영", "여", "1993", "317-703-4819", "김슬기"],
  ["이해원", "여", "1999", "510-710-2032", "김슬기"],
  ["윤나영", "여", "1985", "213-948-3232", "김슬기"],
  ["이현정", "여", "1995", "562-347-5220", "이성진"],
  ["남혜준", "여", "1996", "332-323-7393", "이성진"],
  ["김몰건", "남", "1999", "714-213-9900", "이성진"],
  ["임승주", "남", "2002", "201-518-6596", "이성진"],
  ["이채정", "여", "2003", "657-835-8744", "이웅희"],
  ["김반석", "남", "1995", "213-273-4691", "이웅희"],
  ["신민하", "여", "1997", "201-788-6423", "최현지"],
  ["남태희", "남", "1997", "857-452-9199", "최현지"],
  ["이가현", "여", "2001", "562-458-4209", "최현지"],
  ["이유영", "여", "2001", "424-461-4071", "최현지"],
  ["Jason Choi", "남", "1989", "714-222-9795", "원하은"],
  ["정승엽", "남", "1995", "909-510-2163", "원하은"],
  ["김경민", "남", "1994", "978-844-3253", "원하은"],
  ["박현진", "여", "1991", "415-507-3518", "원하은"],
  ["김인수", "남", "2001", "747-290-4472", "이수아"],
  ["이수빈", "여", "2000", "213-571-7578", "이수아"],
  ["이하진", "여", "1991", "", "이수아"],
  ["김해니", "여", "1999", "714-707-0576", "이수아"],
  ["김해나", "여", "2002", "714-858-5031", "조창현"],
  ["채지수", "여", "2002", "626-689-5904", "조창현"],
  ["김수빈", "여", "1997", "310-661-1196", "조창현"],
  ["장석호", "남", "1995", "626-532-2004", "조창현"],
  ["김현지", "여", "2002", "310-901-7457", "조창현"],
  ["박정윤", "여", "2002", "657-253-6308", "조창현"],
  ["최원재", "남", "2004", "714-322-7128", "강예지"],
  ["강민주", "여", "1997", "951-329-0294", "강예지"],
  ["김예린", "여", "1995", "714-349-3269", "강예지"],
  ["이재민", "남", "1993", "213-476-7403", "강예지"],
  ["송주랑", "여", "1989", "714-788-6481", "강예지"],
  ["김동환", "남", "1989", "213-571-8839", "강예지"],
];

const members: GraduatedMember[] = RAW.map(([name, gender, birthYear, phone, leader]) => ({
  name,
  gender,
  birthYear,
  phone,
  visitDate: "",
  inviter: "",
  leader,
  note: "",
  status: "졸업",
}));

async function main() {
  console.log(`Deleting existing row(s) named "${FOLDER_NAME}" (surgical — not a full wipe)...`);
  const { count } = await prisma.shalomHistory.deleteMany({ where: { name: FOLDER_NAME } });
  console.log(`  deleted ${count} row(s).`);

  console.log(`Creating folder "${FOLDER_NAME}" with ${members.length} individual member items inside...`);
  const folder = await prisma.shalomHistory.create({
    data: { name: FOLDER_NAME, type: "FOLDER", data: "[]", parentId: null, order: 0 },
  });

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    await prisma.shalomHistory.create({
      data: {
        name: m.name,
        type: "RECORD",
        parentId: folder.id,
        order: i,
        data: encrypt(JSON.stringify([m])),
      },
    });
  }
  console.log(`  created folder ${folder.id} + ${members.length} member records.`);

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
