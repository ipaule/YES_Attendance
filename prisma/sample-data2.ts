import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const koreanNames = [
  "김민준", "이서준", "박도윤", "최하준", "정은우",
  "강지호", "조시우", "윤예준", "장유준", "임준서",
  "한지민", "오서연", "신하은", "권지유", "황수아",
  "송다은", "전채원", "문지아", "배서윤", "홍예은",
  "양민서", "류하린", "안소율", "노윤서", "고은서",
  "서지원", "남도현", "구민재", "유승현", "변태영",
  "김하늘", "이재원", "박소민", "최유나", "정현우",
  "강민지", "조태현", "윤서현", "장예린", "임도영",
  "한승민", "오지훈", "신영은", "권태윤", "황서진",
  "송민호", "전가영", "문준혁", "배은지", "홍석진",
  "양수빈", "류지혜", "안현서", "노재민", "고태우",
  "서은비", "남지수", "구하영", "유민정", "변서준",
  "김태리", "이하윤", "박민호", "최서영", "정가은",
  "강준호", "조미래", "윤태민", "장하준", "임소영",
  "한도윤", "오예진", "신민수", "권서하", "황준영",
  "송지안", "전현우", "문다인", "배태호", "홍유리",
  "양은호", "류태영", "안지영", "노서윤", "고민준",
  "서하연", "남은우", "구태현", "유지민", "변하은",
  "김서진", "이준혁", "박은서", "최민재", "정소율",
  "강하은", "조윤서", "윤재민", "장소연", "임지훈",
  "한서윤", "오태준", "신가영", "권도현", "황지원",
  "송하영", "전민지", "문승우", "배소현", "홍태민",
  "양지훈", "류은서", "안태윤", "노하린", "고서연",
  "서민재", "남지혜", "구소율", "유태영", "변민서",
  "김예린", "이도현", "박지수", "최하린", "정민호",
  "강소연", "조현서", "윤지아", "장태윤", "임은비",
  "한가영", "오민재", "신태호", "권유나", "황도영",
  "송현우", "전서윤", "문지훈", "배하준", "홍은서",
  "김동현", "이나영", "박성민", "최혜진", "정윤아",
  "강태준", "조서영", "윤하늘", "장민지", "임준호",
  "한예솔", "오가현", "신동우", "권채린", "황민혁",
  "송유진", "전태양", "문서아", "배진우", "홍소미",
  "양도경", "류승아", "안진혁", "노채윤", "고동민",
  "서유라", "남태현", "구은채", "유진서", "변소윤",
  "김찬영", "이소라", "박동윤", "최예솔", "정하영",
  "강유진", "조태양", "윤민아", "장서윤", "임채원",
  "한동우", "오소미", "신유리", "권태준", "황나현",
  "송동혁", "전예솔", "문채린", "배유진", "홍태양",
  "양서아", "류동민", "안소윤", "노찬영", "고유라",
  "서진혁", "남소라", "구동윤", "유예솔", "변하영",
];

const leaderNames = [
  "영희", "철수", "지영", "민호", "수진",
  "태호", "은지", "준혁", "서현", "도영",
  "가영", "민수", "하은", "태윤", "소연",
  "재민", "유나", "승우", "지아", "현서",
  "다은", "시우", "예진", "진호", "수아",
  "윤아", "성민", "혜진", "동현", "나영",
];

const birthYears = ["97", "98", "99", "00", "01", "02", "03"];
const genders: ("MALE" | "FEMALE")[] = ["MALE", "FEMALE"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomStatus(): string {
  const r = Math.random();
  if (r < 0.65) return "HERE";
  if (r < 0.85) return "ABSENT";
  if (r < 0.93) return "AWR";
  return "";
}

async function main() {
  const groups = await prisma.group.findMany({ orderBy: { order: "asc" } });
  const targetGroups = groups.filter((g) => g.name !== "샬롬");

  // Sunday dates: March–June 2026
  const sundays: Date[] = [];
  const start = new Date("2026-03-01");
  const end = new Date("2026-06-30");
  const current = new Date(start);
  const dayOfWeek = current.getDay();
  if (dayOfWeek !== 0) current.setDate(current.getDate() + (7 - dayOfWeek));
  while (current <= end) {
    sundays.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  // Store global dates
  for (let i = 0; i < sundays.length; i++) {
    const s = sundays[i];
    await prisma.globalDate.create({
      data: {
        date: s,
        label: `${s.getMonth() + 1}/${s.getDate()}`,
        order: i,
      },
    });
  }

  let leaderIdx = 0;
  let memberIdx = 0;

  for (const group of targetGroups) {
    for (let t = 0; t < 10; t++) {
      const leaderUsername = leaderNames[leaderIdx++];

      const leaderUser = await prisma.user.create({
        data: {
          username: leaderUsername,
          password: hashSync("1234", 10),
          role: "LEADER",
          groupId: group.id,
        },
      });

      const team = await prisma.team.create({
        data: {
          name: leaderUsername,
          groupId: group.id,
          leaderId: leaderUser.id,
        },
      });

      await prisma.user.update({
        where: { id: leaderUser.id },
        data: { teamId: team.id },
      });

      // Add date columns
      const teamDates = [];
      for (let d = 0; d < sundays.length; d++) {
        const s = sundays[d];
        const dateRecord = await prisma.attendanceDate.create({
          data: {
            date: s,
            label: `${s.getMonth() + 1}/${s.getDate()}`,
            teamId: team.id,
            order: d,
          },
        });
        teamDates.push(dateRecord);
      }

      // 7–9 members per team
      const memberCount = 7 + Math.floor(Math.random() * 3);
      for (let m = 0; m < memberCount; m++) {
        const name = koreanNames[memberIdx++ % koreanNames.length];
        const member = await prisma.member.create({
          data: {
            name,
            gender: pick(genders),
            birthYear: pick(birthYears),
            teamId: team.id,
            order: m,
          },
        });

        for (const dateRecord of teamDates) {
          const status = randomStatus();
          if (status) {
            await prisma.attendance.create({
              data: {
                memberId: member.id,
                attendanceDateId: dateRecord.id,
                status,
                awrReason:
                  status === "AWR"
                    ? pick(["병가", "출장", "가족행사", "시험기간", "여행"])
                    : null,
              },
            });
          }
        }
      }
    }
  }

  const totalTeams = await prisma.team.count();
  const totalMembers = await prisma.member.count();
  const totalUsers = await prisma.user.count();
  console.log(`Sample data created:`);
  console.log(`  ${totalUsers} users (${totalUsers - 1} leaders + AJ)`);
  console.log(`  ${totalTeams} teams (10 per group × 3 groups)`);
  console.log(`  ${totalMembers} members`);
  console.log(`  ${sundays.length} Sundays (Mar–Jun 2026)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
