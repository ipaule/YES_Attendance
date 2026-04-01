import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  // Clear existing shalom data
  await prisma.shalomMember.deleteMany();
  await prisma.shalomHistory.deleteMany();

  const leaders = ["정우", "채림", "한솔", "서진", "나래"];
  const inviters = ["김목사", "이집사", "박권사", "최장로", "정전도사", "친구", "가족", "지인"];
  const genders = ["MALE", "FEMALE"];
  const birthYears = ["97", "98", "99", "00", "01", "02", "03"];

  // --- History data (flushed in the past) ---

  // History 1: 2025년 하반기 (Jul-Dec 2025)
  const history1: {
    name: string; gender: string; birthYear: string; phone: string;
    visitDate: string; inviter: string; leader: string; note: string; status: string;
  }[] = [];

  const names2025 = [
    "강도현", "윤채린", "박시은", "이태양", "김나윤",
    "정하린", "최유빈", "한서아", "오진우", "임채영",
    "송다현", "전민규", "문예지", "배지후", "홍서율",
  ];

  for (let i = 0; i < names2025.length; i++) {
    const month = 7 + Math.floor(i / 3); // Jul-Nov
    const day = 1 + Math.floor(Math.random() * 27);
    const status = i < 5 ? "졸업" : i < 10 ? "등록" : "방문";
    history1.push({
      name: names2025[i],
      gender: pick(genders),
      birthYear: pick(birthYears),
      phone: `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      visitDate: `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      inviter: pick(inviters),
      leader: pick(leaders),
      note: i % 4 === 0 ? "대학생" : "",
      status,
    });
  }

  await prisma.shalomHistory.create({
    data: {
      name: "2025년 하반기",
      data: JSON.stringify(history1),
    },
  });

  // History 2: 2026년 1분기 (Jan-Mar 2026)
  const history2: typeof history1 = [];

  const names2026q1 = [
    "양지윤", "류승준", "안하영", "노태민", "고채은",
    "서유빈", "남진아", "구현우", "유서현", "변채린",
    "김동현", "이소율", "박태양",
  ];

  for (let i = 0; i < names2026q1.length; i++) {
    const month = 1 + Math.floor(i / 5); // Jan-Mar
    const day = 1 + Math.floor(Math.random() * 27);
    const status = i < 4 ? "졸업" : i < 8 ? "등록" : "방문";
    history2.push({
      name: names2026q1[i],
      gender: pick(genders),
      birthYear: pick(birthYears),
      phone: `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      visitDate: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      inviter: pick(inviters),
      leader: pick(leaders),
      note: i % 3 === 0 ? "직장인" : "",
      status,
    });
  }

  await prisma.shalomHistory.create({
    data: {
      name: "2026년 1분기",
      data: JSON.stringify(history2),
    },
  });

  // --- Current shalom members (active, not yet flushed) ---
  // Visit dates: Mar-Jun 2026

  const currentNames = [
    "김서윤", "이하준", "박민아", "최동우", "정유리",
    "강태현", "조은채", "윤진서", "장하영", "임도경",
    "한소민", "오준혁", "신예원", "권태양", "황나현",
    "송민서", "전도윤", "문서아", "배진우", "홍채린",
  ];

  for (let i = 0; i < currentNames.length; i++) {
    const month = 3 + Math.floor(i / 6); // Mar-Jun
    const day = 1 + Math.floor(Math.random() * 27);
    let status: string;
    if (i < 5) status = "졸업";
    else if (i < 12) status = "등록";
    else status = "방문";

    await prisma.shalomMember.create({
      data: {
        name: currentNames[i],
        gender: pick(genders),
        birthYear: pick(birthYears),
        phone: `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        visitDate: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        inviter: pick(inviters),
        leader: pick(leaders),
        note: i % 5 === 0 ? "대학생" : i % 7 === 0 ? "직장인" : "",
        status,
      },
    });
  }

  // --- Make some 졸업 names match members in 사랑/소망/믿음 teams ---
  // The 졸업 names from history + current that should exist in the attendance teams:
  // History1 졸업: 강도현, 윤채린, 박시은, 이태양, 김나윤
  // History2 졸업: 양지윤, 류승준, 안하영, 노태민
  // Current 졸업: 김서윤, 이하준, 박민아, 최동우, 정유리

  // Check if any of these names already exist in teams (from sample data)
  const graduateNames = [
    "강도현", "윤채린", "박시은", "이태양", "김나윤",
    "양지윤", "류승준", "안하영", "노태민",
    "김서윤", "이하준", "박민아", "최동우", "정유리",
  ];

  const existingMembers = await prisma.member.findMany({
    where: { name: { in: graduateNames } },
    select: { name: true },
  });
  const existingNames = new Set(existingMembers.map((m) => m.name));

  // Add missing graduates to random teams in 사랑/소망/믿음
  const targetGroups = await prisma.group.findMany({
    where: { name: { in: ["사랑", "소망", "믿음"] } },
    select: { id: true },
  });
  const teams = await prisma.team.findMany({
    where: { groupId: { in: targetGroups.map((g) => g.id) } },
    include: { dates: { orderBy: { order: "asc" } } },
  });

  if (teams.length > 0) {
    for (const gName of graduateNames) {
      if (existingNames.has(gName)) continue;

      const team = pick(teams);
      const member = await prisma.member.create({
        data: {
          name: gName,
          gender: pick(genders),
          birthYear: pick(birthYears),
          teamId: team.id,
          order: 99,
        },
      });

      // Create random attendance — vary quality so grades differ
      const quality = Math.random(); // 0-1, higher = better attendance
      for (const date of team.dates) {
        const r = Math.random();
        let status: string;
        if (r < quality * 0.9) status = "HERE";
        else if (r < quality * 0.9 + 0.15) status = "ABSENT";
        else status = "";

        if (status) {
          await prisma.attendance.create({
            data: {
              memberId: member.id,
              attendanceDateId: date.id,
              status,
            },
          });
        }
      }
    }
  }

  console.log("Shalom sample data created:");
  console.log("  Current members: 20 (5 졸업, 7 등록, 8 방문)");
  console.log("  History 1 (2025년 하반기): 15 members (5 졸업, 5 등록, 5 방문)");
  console.log("    Visit dates: 2025-07 ~ 2025-11");
  console.log("  History 2 (2026년 1분기): 13 members (4 졸업, 4 등록, 5 방문)");
  console.log("    Visit dates: 2026-01 ~ 2026-03");
  console.log("  Current visit dates: 2026-03 ~ 2026-06");
  console.log("  14 졸업 names added to 사랑/소망/믿음 teams with varied attendance");
  console.log("");
  console.log("Test date ranges:");
  console.log("  All data: 2025-07-01 ~ 2026-06-30");
  console.log("  History1 only: 2025-07-01 ~ 2025-12-31");
  console.log("  History2 only: 2026-01-01 ~ 2026-03-31");
  console.log("  Current only: 2026-03-01 ~ 2026-06-30");
  console.log("  Overlap H2+Current: 2026-01-01 ~ 2026-06-30");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
