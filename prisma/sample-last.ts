import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randPhone() { return `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`; }
function randInt(min: number, max: number) { return min + Math.floor(Math.random() * (max - min + 1)); }

const lastNames = ["김","이","박","최","정","강","조","윤","장","임","한","오","신","권","황","송","전","문","배","홍","양","류","안","노","고","서","남","구","유","변","백","허","방","심","차","주","우","하","성","곽"];
const firstNames = ["민준","서준","도윤","하준","은우","지호","시우","예준","유준","준서","지민","서연","하은","지유","수아","다은","채원","지아","서윤","예은","민서","하린","소율","윤서","은서","지원","도현","민재","승현","태영","하늘","재원","소민","유나","현우","민지","태현","서현","예린","도영","승민","지훈","영은","태윤","서진","민호","가영","준혁","은지","석진","수빈","지혜","현서","재민","태우","은비","지수","하영","민정","소연","유진","채린","동현","나영","성민","혜진","윤아","진호","태리","하윤","찬영","소라","동윤","예솔","태양","민아","서아","진혁","소윤","도경","승아","진서","은채","채윤","동민","유라","태준","가현","동우","수현","예지","시현","보라","세훈","다영","준영","지현"];
const usedNames = new Set<string>();
function uname(): string { let n: string; do { n = pick(lastNames) + pick(firstNames); } while (usedNames.has(n)); usedNames.add(n); return n; }

const birthYears = ["96","97","98","99","00","01","02","03"];
const genders = ["MALE","FEMALE"];
const reasons = ["병가","출장","가족행사","시험기간","여행","개인사정","야근","감기","봉사활동"];
const inviters = ["김목사","이집사","박권사","최장로","정전도사","친구","가족","지인","동아리","교회"];

function randStatus(): string {
  const r = Math.random();
  if (r < 0.62) return "HERE"; if (r < 0.82) return "ABSENT"; if (r < 0.92) return "AWR"; return "";
}

async function main() {
  const groups = await prisma.group.findMany({ orderBy: { order: "asc" } });
  const sarang = groups.find(g => g.name === "사랑")!;
  const somang = groups.find(g => g.name === "소망")!;
  const mitum = groups.find(g => g.name === "믿음")!;
  const shalom = groups.find(g => g.name === "샬롬")!;
  const mainGroups = [sarang, somang, mitum];

  const totalRoster = randInt(300, 350);
  console.log(`Target roster: ${totalRoster}`);

  // ====== 1. ROSTER ======
  console.log("1. Roster...");
  const roster: { name: string; gender: string; birthYear: string; groupName: string }[] = [];
  for (let i = 0; i < totalRoster; i++) {
    const name = uname(); const gender = pick(genders); const birthYear = pick(birthYears);
    const groupName = pick(["사랑","소망","믿음"]);
    roster.push({ name, gender, birthYear, groupName });
    await prisma.rosterMember.create({
      data: { name, gender, birthYear, groupName, note: i % 8 === 0 ? "대학생" : i % 12 === 0 ? "직장인" : i % 20 === 0 ? "새신자" : "", order: i },
    });
  }
  console.log(`  ${roster.length} roster members`);

  // ====== 2. LEADERS + EXECUTIVES ======
  console.log("2. Users...");
  const leadersByGroup: Record<string, { id: string; username: string }[]> = {};
  for (const group of [...mainGroups, shalom]) {
    const count = group.name === "샬롬" ? 5 : 10;
    leadersByGroup[group.id] = [];
    for (let i = 0; i < count; i++) {
      const username = uname();
      const user = await prisma.user.create({ data: { username, password: hashSync("1234", 10), role: "LEADER", groupId: group.id } });
      leadersByGroup[group.id].push({ id: user.id, username });
    }
  }
  for (const group of [...mainGroups, shalom]) {
    const username = uname();
    await prisma.user.create({ data: { username, password: hashSync("1234", 10), role: "EXECUTIVE", groupId: group.id } });
  }
  console.log(`  35 leaders + 4 executives`);

  // ====== 3. SUNDAYS (Jan 4 – Mar 29 2026) ======
  const sundays: Date[] = [];
  const cur = new Date(2026, 0, 4, 12);
  const endDate = new Date(2026, 2, 29, 12);
  while (cur <= endDate) { sundays.push(new Date(cur)); cur.setDate(cur.getDate() + 7); }
  for (let i = 0; i < sundays.length; i++) {
    const s = sundays[i];
    await prisma.globalDate.create({ data: { date: s, label: `${s.getMonth()+1}/${s.getDate()}`, order: i } });
  }
  console.log(`  ${sundays.length} Sundays`);

  // ====== 4. TEAMS + MEMBERS ======
  console.log("4. Teams + members...");
  let rIdx = 0;
  for (const group of mainGroups) {
    for (const leader of leadersByGroup[group.id]) {
      const team = await prisma.team.create({ data: { name: leader.username, groupId: group.id, leaderId: leader.id } });
      await prisma.user.update({ where: { id: leader.id }, data: { teamId: team.id } });
      const teamDates = [];
      for (let d = 0; d < sundays.length; d++) {
        const s = sundays[d];
        teamDates.push(await prisma.attendanceDate.create({ data: { date: s, label: `${s.getMonth()+1}/${s.getDate()}`, teamId: team.id, order: d } }));
      }
      const memberCount = randInt(9, 11);
      for (let m = 0; m < memberCount; m++) {
        let person = null;
        for (let k = rIdx; k < roster.length; k++) {
          if (roster[k].groupName === group.name) {
            person = roster[k]; [roster[rIdx], roster[k]] = [roster[k], roster[rIdx]]; rIdx++; break;
          }
        }
        if (!person) break;
        const member = await prisma.member.create({ data: { name: person.name, gender: person.gender, birthYear: person.birthYear, teamId: team.id, order: m } });
        const rr = await prisma.rosterMember.findFirst({ where: { name: person.name } });
        if (rr) await prisma.rosterMember.update({ where: { id: rr.id }, data: { teamName: leader.username, groupName: group.name } });
        for (const dateRec of teamDates) {
          const status = randStatus();
          if (status) {
            const reason = (status === "ABSENT") ? pick(reasons) : (status === "AWR") ? pick(reasons) : null;
            await prisma.attendance.create({ data: { memberId: member.id, attendanceDateId: dateRec.id, status, awrReason: reason } });
          }
        }
      }
    }
  }
  // Shalom teams
  for (const leader of leadersByGroup[shalom.id]) {
    const team = await prisma.team.create({ data: { name: leader.username, groupId: shalom.id, leaderId: leader.id } });
    await prisma.user.update({ where: { id: leader.id }, data: { teamId: team.id } });
  }
  const totalMembers = await prisma.member.count();
  console.log(`  35 teams, ${totalMembers} team members`);

  // ====== 5. SHALOM — Monthly pattern: ~20 방문, ~15 등록, ~9 졸업 per month ======
  console.log("5. Shalom...");
  const shalomLeaders = leadersByGroup[shalom.id].map(l => l.username);
  const shalomTeams = await prisma.team.findMany({
    where: { groupId: shalom.id },
    include: { dates: { orderBy: { order: "asc" } } },
  });
  const mainTeamsForGrad = await prisma.team.findMany({
    where: { groupId: { in: mainGroups.map(g => g.id) } },
    include: { dates: { orderBy: { order: "asc" } } },
  });

  // History: Jan 2025 – Feb 2026 (14 months, sent to history in 2 batches)
  const historyBatch1: typeof shHistory1Data = []; // 2025 상반기 (Jan-Jun 2025)
  const historyBatch2: typeof shHistory1Data = []; // 2025 하반기 (Jul-Dec 2025)
  const historyBatch3: typeof shHistory1Data = []; // 2026 1-2월

  type ShalomRecord = { name: string; gender: string; birthYear: string; phone: string; visitDate: string; inviter: string; leader: string; note: string; status: string };
  const shHistory1Data: ShalomRecord[] = [];

  const allGraduates: { name: string; gender: string; birthYear: string }[] = [];

  // Generate monthly shalom data
  const months2025 = [[2025,1],[2025,2],[2025,3],[2025,4],[2025,5],[2025,6],[2025,7],[2025,8],[2025,9],[2025,10],[2025,11],[2025,12]];
  const months2026early = [[2026,1],[2026,2]];
  const months2026current = [[2026,3]]; // March only (current list)

  function genMonthData(year: number, month: number): ShalomRecord[] {
    const records: ShalomRecord[] = [];
    const visitCount = randInt(18, 22);
    const enrollCount = randInt(13, 17);
    const gradCount = randInt(7, 11);

    for (let i = 0; i < visitCount; i++) {
      const name = uname();
      const gender = pick(genders);
      const birthYear = pick(birthYears);
      const day = randInt(1, 28);
      let status: string;
      if (i < gradCount) { status = "졸업"; allGraduates.push({ name, gender, birthYear }); }
      else if (i < enrollCount) status = "등록";
      else status = "방문";

      records.push({
        name, gender, birthYear, phone: randPhone(),
        visitDate: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
        inviter: pick(inviters), leader: pick(shalomLeaders),
        note: i % 7 === 0 ? "대학생" : i % 11 === 0 ? "직장인" : "", status,
      });
    }
    return records;
  }

  // 2025 상반기
  for (const [y, m] of months2025.slice(0, 6)) {
    historyBatch1.push(...genMonthData(y, m));
  }
  await prisma.shalomHistory.create({ data: { name: "2025년 상반기", data: JSON.stringify(historyBatch1) } });
  console.log(`  History 2025 상반기: ${historyBatch1.length} members`);

  // 2025 하반기
  for (const [y, m] of months2025.slice(6)) {
    historyBatch2.push(...genMonthData(y, m));
  }
  await prisma.shalomHistory.create({ data: { name: "2025년 하반기", data: JSON.stringify(historyBatch2) } });
  console.log(`  History 2025 하반기: ${historyBatch2.length} members`);

  // 2026 1-2월
  for (const [y, m] of months2026early) {
    historyBatch3.push(...genMonthData(y, m));
  }
  await prisma.shalomHistory.create({ data: { name: "2026년 1-2월", data: JSON.stringify(historyBatch3) } });
  console.log(`  History 2026 1-2월: ${historyBatch3.length} members`);

  // Current shalom list: March 2026 only
  const marchData = genMonthData(2026, 3);
  for (let i = 0; i < marchData.length; i++) {
    const r = marchData[i];
    await prisma.shalomMember.create({
      data: { name: r.name, gender: r.gender, birthYear: r.birthYear, phone: r.phone, visitDate: r.visitDate, inviter: r.inviter, leader: r.leader, note: r.note, status: r.status, order: i },
    });
    // If 등록, add to a shalom team
    if (r.status === "등록" || r.status === "졸업") {
      const team = pick(shalomTeams);
      await prisma.member.create({ data: { name: r.name, gender: r.gender, birthYear: r.birthYear, teamId: team.id, order: 99 + i } });
    }
  }
  console.log(`  Current shalom list: ${marchData.length} members`);

  // ====== 6. ADD GRADUATES TO MAIN TEAMS ======
  console.log("6. Adding graduates to main teams...");
  let gradAdded = 0;
  for (const grad of allGraduates) {
    if (!mainTeamsForGrad.length) break;
    const team = pick(mainTeamsForGrad);
    const member = await prisma.member.create({
      data: { name: grad.name, gender: grad.gender, birthYear: grad.birthYear, teamId: team.id, order: 99 + gradAdded },
    });
    // Varied attendance quality
    const quality = 0.2 + Math.random() * 0.7; // 0.2-0.9
    for (const date of team.dates) {
      const r = Math.random();
      let status: string;
      if (r < quality * 0.8) status = "HERE";
      else if (r < quality * 0.8 + 0.12) status = "ABSENT";
      else if (r < quality * 0.8 + 0.17) status = "AWR";
      else status = "";
      if (status) {
        const reason = (status === "ABSENT") ? pick(reasons) : (status === "AWR") ? pick(reasons) : null;
        await prisma.attendance.create({ data: { memberId: member.id, attendanceDateId: date.id, status, awrReason: reason } });
      }
    }
    gradAdded++;
  }
  console.log(`  ${gradAdded} graduates added to main teams`);

  // ====== 7. TERM HISTORY ======
  console.log("7. Term history...");
  const histTeams = [];
  for (const group of mainGroups) {
    for (let t = 0; t < 10; t++) {
      const tName = uname();
      const histDates = [];
      const hStart = new Date(2025, 2, 2, 12); // Mar 2 2025
      for (let d = 0; d < 18; d++) {
        const s = new Date(hStart); s.setDate(hStart.getDate() + d * 7);
        histDates.push({ label: `${s.getMonth()+1}/${s.getDate()}`, date: s.toISOString() });
      }
      const histMembers = [];
      for (let m = 0; m < randInt(8, 11); m++) {
        const mName = uname();
        histMembers.push({
          id: `h-${t}-${m}`, name: mName, gender: pick(genders), birthYear: pick(birthYears), order: m,
          attendances: histDates.map(d => ({ status: randStatus() || "HERE", awrReason: null, attendanceDate: { label: d.label, date: d.date } })),
        });
      }
      histTeams.push({
        id: `ht-${group.name}-${t}`, name: tName, groupId: group.id,
        group: { id: group.id, name: group.name }, leader: { id: `hl-${t}`, username: tName },
        members: histMembers, dates: histDates.map((d, i) => ({ id: `hd-${t}-${i}`, ...d, order: i })),
      });
    }
  }
  await prisma.termHistory.create({
    data: { name: "2025년 1학기", data: JSON.stringify({ users: [], groups: mainGroups, teams: histTeams, globalDates: [], snapshotDate: "2025-07-31T00:00:00.000Z" }) },
  });
  console.log(`  1 term history (30 teams)`);

  // ====== SUMMARY ======
  const c = {
    roster: await prisma.rosterMember.count(),
    users: await prisma.user.count(),
    teams: await prisma.team.count(),
    members: await prisma.member.count(),
    att: await prisma.attendance.count(),
    shalom: await prisma.shalomMember.count(),
    shalomHist: await prisma.shalomHistory.count(),
  };
  console.log(`\n=== DONE ===`);
  console.log(`Roster: ${c.roster} | Users: ${c.users} | Teams: ${c.teams}`);
  console.log(`Members: ${c.members} | Attendance: ${c.att}`);
  console.log(`Shalom current: ${c.shalom} | Shalom history: ${c.shalomHist}`);
  console.log(`Total graduates in main teams: ${gradAdded}`);
  console.log(`Sundays: ${sundays.length} (1/4 – 3/29)`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
