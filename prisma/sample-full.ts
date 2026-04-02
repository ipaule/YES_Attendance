import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randPhone() { return `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`; }

const koreanLastNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "신", "권", "황", "송", "전", "문", "배", "홍", "양", "류", "안", "노", "고", "서", "남", "구", "유", "변"];
const koreanFirstNames = ["민준", "서준", "도윤", "하준", "은우", "지호", "시우", "예준", "유준", "준서", "지민", "서연", "하은", "지유", "수아", "다은", "채원", "지아", "서윤", "예은", "민서", "하린", "소율", "윤서", "은서", "지원", "도현", "민재", "승현", "태영", "하늘", "재원", "소민", "유나", "현우", "민지", "태현", "서현", "예린", "도영", "승민", "지훈", "영은", "태윤", "서진", "민호", "가영", "준혁", "은지", "석진", "수빈", "지혜", "현서", "재민", "태우", "은비", "지수", "하영", "민정", "소연", "유진", "채린", "동현", "나영", "성민", "혜진", "윤아", "진호", "수아", "태리", "하윤", "찬영", "소라", "동윤", "예솔", "하영", "유진", "태양", "민아", "서아", "진혁", "소윤", "도경", "승아", "진서", "은채", "채윤", "동민", "유라", "태준"];

function uniqueName(used: Set<string>): string {
  let name: string;
  do {
    name = pick(koreanLastNames) + pick(koreanFirstNames);
  } while (used.has(name));
  used.add(name);
  return name;
}

const birthYears = ["96", "97", "98", "99", "00", "01", "02", "03"];
const genders = ["MALE", "FEMALE"];

function randomStatus(): string {
  const r = Math.random();
  if (r < 0.65) return "HERE";
  if (r < 0.85) return "ABSENT";
  if (r < 0.93) return "AWR";
  return "";
}

async function main() {
  const usedNames = new Set<string>();
  const groups = await prisma.group.findMany({ orderBy: { order: "asc" } });
  const sarang = groups.find(g => g.name === "사랑")!;
  const somang = groups.find(g => g.name === "소망")!;
  const mitum = groups.find(g => g.name === "믿음")!;
  const shalom = groups.find(g => g.name === "샬롬")!;
  const mainGroups = [sarang, somang, mitum];

  // ====== 1. Create Roster (300 people) ======
  console.log("Creating roster...");
  const rosterPeople: { name: string; gender: string; birthYear: string; groupName: string }[] = [];
  for (let i = 0; i < 300; i++) {
    const name = uniqueName(usedNames);
    const gender = pick(genders);
    const birthYear = pick(birthYears);
    const groupName = pick(["사랑", "소망", "믿음"]);
    rosterPeople.push({ name, gender, birthYear, groupName });
    await prisma.rosterMember.create({
      data: { name, gender, birthYear, groupName, note: i % 10 === 0 ? "대학생" : i % 15 === 0 ? "직장인" : "", order: i },
    });
  }
  console.log(`  Roster: ${rosterPeople.length}`);

  // ====== 2. Create Leaders (10 per main group + 5 shalom) ======
  console.log("Creating leaders...");
  const leadersByGroup: Record<string, { id: string; username: string }[]> = {};

  for (const group of [...mainGroups, shalom]) {
    const count = group.name === "샬롬" ? 5 : 10;
    leadersByGroup[group.id] = [];
    for (let i = 0; i < count; i++) {
      const username = uniqueName(usedNames);
      const user = await prisma.user.create({
        data: { username, password: hashSync("1234", 10), role: "LEADER", groupId: group.id },
      });
      leadersByGroup[group.id].push({ id: user.id, username });
    }
  }
  const totalLeaders = Object.values(leadersByGroup).flat().length;
  console.log(`  Leaders: ${totalLeaders}`);

  // ====== 3. Create 1 Executive per group ======
  console.log("Creating executives...");
  for (const group of [...mainGroups, shalom]) {
    const username = uniqueName(usedNames);
    await prisma.user.create({
      data: { username, password: hashSync("1234", 10), role: "EXECUTIVE", groupId: group.id },
    });
  }
  console.log("  Executives: 4");

  // ====== 4. Set up Sunday dates (March-June 2026) ======
  const sundays: Date[] = [];
  const start = new Date("2026-03-01");
  const end = new Date("2026-06-28");
  const current = new Date(start);
  const dow = current.getDay();
  if (dow !== 0) current.setDate(current.getDate() + (7 - dow));
  while (current <= end) { sundays.push(new Date(current)); current.setDate(current.getDate() + 7); }

  for (let i = 0; i < sundays.length; i++) {
    const s = sundays[i];
    await prisma.globalDate.create({
      data: { date: s, label: `${s.getMonth() + 1}/${s.getDate()}`, order: i },
    });
  }
  console.log(`  Sundays: ${sundays.length}`);

  // ====== 5. Create Teams + Assign Members from Roster ======
  console.log("Creating teams...");
  let rosterIdx = 0;

  for (const group of mainGroups) {
    const leaders = leadersByGroup[group.id];
    for (const leader of leaders) {
      // Create team named after leader
      const team = await prisma.team.create({
        data: { name: leader.username, groupId: group.id, leaderId: leader.id },
      });
      await prisma.user.update({ where: { id: leader.id }, data: { teamId: team.id } });

      // Add dates
      const teamDates = [];
      for (let d = 0; d < sundays.length; d++) {
        const s = sundays[d];
        const dateRec = await prisma.attendanceDate.create({
          data: { date: s, label: `${s.getMonth() + 1}/${s.getDate()}`, teamId: team.id, order: d },
        });
        teamDates.push(dateRec);
      }

      // Add ~10 members from roster (matching group)
      const groupRoster = rosterPeople.filter(r => r.groupName === group.name);
      const memberCount = 9 + Math.floor(Math.random() * 3); // 9-11
      for (let m = 0; m < memberCount && rosterIdx < rosterPeople.length; m++) {
        // Find next roster person for this group
        let person = null;
        for (let k = rosterIdx; k < rosterPeople.length; k++) {
          if (rosterPeople[k].groupName === group.name) {
            person = rosterPeople[k];
            // Swap to front so we don't revisit
            [rosterPeople[rosterIdx], rosterPeople[k]] = [rosterPeople[k], rosterPeople[rosterIdx]];
            rosterIdx++;
            break;
          }
        }
        if (!person) break;

        const member = await prisma.member.create({
          data: { name: person.name, gender: person.gender, birthYear: person.birthYear, teamId: team.id, order: m },
        });

        // Update roster with team assignment
        const rosterRec = await prisma.rosterMember.findFirst({ where: { name: person.name } });
        if (rosterRec) {
          await prisma.rosterMember.update({
            where: { id: rosterRec.id },
            data: { teamName: leader.username, groupName: group.name },
          });
        }

        // Create attendance
        for (const dateRec of teamDates) {
          const status = randomStatus();
          if (status) {
            await prisma.attendance.create({
              data: {
                memberId: member.id, attendanceDateId: dateRec.id, status,
                awrReason: status === "AWR" ? pick(["병가", "출장", "가족행사", "시험기간", "여행"]) : null,
              },
            });
          }
        }
      }
    }
  }

  // Shalom teams (5 leaders)
  for (const leader of leadersByGroup[shalom.id]) {
    const team = await prisma.team.create({
      data: { name: leader.username, groupId: shalom.id, leaderId: leader.id },
    });
    await prisma.user.update({ where: { id: leader.id }, data: { teamId: team.id } });
  }

  const totalTeams = await prisma.team.count();
  const totalMembers = await prisma.member.count();
  console.log(`  Teams: ${totalTeams}`);
  console.log(`  Members in teams: ${totalMembers}`);

  // ====== 6. Create Shalom Members (20 current) ======
  console.log("Creating shalom members...");
  const shalomLeaderNames = leadersByGroup[shalom.id].map(l => l.username);
  const shalomStatuses = ["방문", "방문", "방문", "등록", "등록", "등록", "등록", "졸업", "졸업"];
  const inviters = ["김목사", "이집사", "박권사", "최장로", "친구", "가족", "지인"];

  for (let i = 0; i < 20; i++) {
    const name = uniqueName(usedNames);
    const month = 3 + Math.floor(i / 6);
    const day = 1 + Math.floor(Math.random() * 27);
    await prisma.shalomMember.create({
      data: {
        name, gender: pick(genders), birthYear: pick(birthYears),
        phone: randPhone(),
        visitDate: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        inviter: pick(inviters), leader: pick(shalomLeaderNames),
        note: i % 5 === 0 ? "대학생" : i % 7 === 0 ? "직장인" : "",
        status: pick(shalomStatuses), order: i,
      },
    });
  }
  console.log("  Shalom current: 20");

  // ====== 7. Create Shalom History ======
  const shalomHistory1 = [];
  for (let i = 0; i < 15; i++) {
    const name = uniqueName(usedNames);
    const month = 7 + Math.floor(i / 4);
    const day = 1 + Math.floor(Math.random() * 27);
    const status = i < 5 ? "졸업" : i < 10 ? "등록" : "방문";
    shalomHistory1.push({
      name, gender: pick(genders), birthYear: pick(birthYears), phone: randPhone(),
      visitDate: `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      inviter: pick(inviters), leader: pick(shalomLeaderNames), note: "", status,
    });
  }
  await prisma.shalomHistory.create({ data: { name: "2025년 하반기", data: JSON.stringify(shalomHistory1) } });

  const shalomHistory2 = [];
  for (let i = 0; i < 12; i++) {
    const name = uniqueName(usedNames);
    const month = 1 + Math.floor(i / 5);
    const day = 1 + Math.floor(Math.random() * 27);
    const status = i < 4 ? "졸업" : i < 8 ? "등록" : "방문";
    shalomHistory2.push({
      name, gender: pick(genders), birthYear: pick(birthYears), phone: randPhone(),
      visitDate: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      inviter: pick(inviters), leader: pick(shalomLeaderNames), note: "", status,
    });
  }
  await prisma.shalomHistory.create({ data: { name: "2026년 1분기", data: JSON.stringify(shalomHistory2) } });
  console.log("  Shalom history: 2 records (15 + 12 members)");

  // ====== 8. Create Term History (a previous term snapshot) ======
  console.log("Creating term history...");
  // Build a fake history with 30 teams, ~10 members each
  const historyTeams = [];
  for (const group of mainGroups) {
    for (let t = 0; t < 10; t++) {
      const teamName = uniqueName(usedNames);
      const histDates = [];
      for (let d = 0; d < 14; d++) {
        const s = new Date(`2025-09-${7 + d * 7 > 28 ? ((d * 7 + 7) % 28) + 1 : 7 + d * 7}`);
        histDates.push({ label: `${9 + Math.floor(d / 4)}/${(d % 4) * 7 + 7}`, date: s.toISOString() });
      }
      const histMembers = [];
      for (let m = 0; m < 8 + Math.floor(Math.random() * 4); m++) {
        const mName = uniqueName(usedNames);
        const attendances = histDates.map(d => ({
          status: randomStatus() || "HERE",
          awrReason: null,
          attendanceDate: { label: d.label, date: d.date },
        }));
        histMembers.push({ id: `hist-${t}-${m}`, name: mName, gender: pick(genders), birthYear: pick(birthYears), order: m, attendances });
      }
      historyTeams.push({
        id: `hist-team-${group.name}-${t}`, name: teamName, groupId: group.id,
        group: { id: group.id, name: group.name },
        leader: { id: `hist-leader-${t}`, username: teamName },
        members: histMembers, dates: histDates.map((d, i) => ({ id: `hd-${t}-${i}`, ...d, order: i })),
      });
    }
  }

  await prisma.termHistory.create({
    data: {
      name: "2025년 2학기",
      data: JSON.stringify({
        users: [], groups: mainGroups, teams: historyTeams, globalDates: [], snapshotDate: "2025-12-31T00:00:00.000Z",
      }),
    },
  });
  console.log("  Term history: 1 record (30 teams)");

  // Add some 졸업 shalom names into current teams for grade tracking
  const graduateNames = [...shalomHistory1.filter(m => m.status === "졸업").map(m => m.name),
    ...shalomHistory2.filter(m => m.status === "졸업").map(m => m.name)];
  const currentTeams = await prisma.team.findMany({
    where: { groupId: { in: mainGroups.map(g => g.id) } },
    include: { dates: { orderBy: { order: "asc" } } },
  });
  for (const gName of graduateNames) {
    if (currentTeams.length === 0) break;
    const team = pick(currentTeams);
    const member = await prisma.member.create({
      data: { name: gName, gender: pick(genders), birthYear: pick(birthYears), teamId: team.id, order: 99 },
    });
    const quality = Math.random();
    for (const date of team.dates) {
      const r = Math.random();
      const status = r < quality * 0.85 ? "HERE" : r < quality * 0.85 + 0.15 ? "ABSENT" : "";
      if (status) await prisma.attendance.create({ data: { memberId: member.id, attendanceDateId: date.id, status } });
    }
  }
  console.log(`  Graduates added to teams: ${graduateNames.length}`);

  // Summary
  const finalRoster = await prisma.rosterMember.count();
  const finalUsers = await prisma.user.count();
  const finalTeams = await prisma.team.count();
  const finalMembers = await prisma.member.count();
  const finalAttendance = await prisma.attendance.count();
  console.log("\n=== SUMMARY ===");
  console.log(`Roster: ${finalRoster}`);
  console.log(`Users: ${finalUsers} (1 pastor + 4 execs + ${totalLeaders} leaders)`);
  console.log(`Teams: ${finalTeams} (30 main + 5 shalom)`);
  console.log(`Members: ${finalMembers}`);
  console.log(`Attendance records: ${finalAttendance}`);
  console.log(`Sundays: ${sundays.length}`);
  console.log(`Term histories: 1`);
  console.log(`Shalom current: 20, history: 27`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
