import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randPhone() { return `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`; }

const lastNames = ["김","이","박","최","정","강","조","윤","장","임","한","오","신","권","황","송","전","문","배","홍","양","류","안","노","고","서","남","구","유","변"];
const firstNames = ["민준","서준","도윤","하준","은우","지호","시우","예준","유준","준서","지민","서연","하은","지유","수아","다은","채원","지아","서윤","예은","민서","하린","소율","윤서","은서","지원","도현","민재","승현","태영","하늘","재원","소민","유나","현우","민지","태현","서현","예린","도영","승민","지훈","영은","태윤","서진","민호","가영","준혁","은지","석진","수빈","지혜","현서","재민","태우","은비","지수","하영","민정","소연","유진","채린","동현","나영","성민","혜진","윤아","진호","태리","하윤","찬영","소라","동윤","예솔","태양","민아","서아","진혁","소윤","도경","승아","진서","은채","채윤","동민","유라","태준","가현","동우"];

const usedNames = new Set<string>();
function uname(): string {
  let n: string;
  do { n = pick(lastNames) + pick(firstNames); } while (usedNames.has(n));
  usedNames.add(n);
  return n;
}

const birthYears = ["96","97","98","99","00","01","02","03"];
const genders = ["MALE","FEMALE"];
const absentReasons = ["병가","출장","가족행사","시험기간","여행","개인사정","야근","감기"];
const inviters = ["김목사","이집사","박권사","최장로","정전도사","친구","가족","지인","동아리"];

function randStatus(): string {
  const r = Math.random();
  if (r < 0.62) return "HERE";
  if (r < 0.82) return "ABSENT";
  if (r < 0.92) return "AWR";
  return "";
}

async function main() {
  const groups = await prisma.group.findMany({ orderBy: { order: "asc" } });
  const sarang = groups.find(g => g.name === "사랑")!;
  const somang = groups.find(g => g.name === "소망")!;
  const mitum = groups.find(g => g.name === "믿음")!;
  const shalom = groups.find(g => g.name === "샬롬")!;
  const mainGroups = [sarang, somang, mitum];

  // ====== 1. ROSTER (300 people) ======
  console.log("1. Roster...");
  const roster: { name: string; gender: string; birthYear: string; groupName: string }[] = [];
  for (let i = 0; i < 300; i++) {
    const name = uname();
    const gender = pick(genders);
    const birthYear = pick(birthYears);
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
      const user = await prisma.user.create({
        data: { username, password: hashSync("1234", 10), role: "LEADER", groupId: group.id },
      });
      leadersByGroup[group.id].push({ id: user.id, username });
    }
  }
  // 1 exec per group
  for (const group of [...mainGroups, shalom]) {
    const username = uname();
    await prisma.user.create({
      data: { username, password: hashSync("1234", 10), role: "EXECUTIVE", groupId: group.id },
    });
  }
  console.log(`  35 leaders + 4 executives`);

  // ====== 3. SUNDAYS (Jan 4 – Mar 29 2026, all past) ======
  const sundays: Date[] = [];
  const cur = new Date(2026, 0, 4, 12); // Jan 4 2026 noon local (Sunday)
  const endDate = new Date(2026, 2, 29, 12); // Mar 29 2026 noon local
  while (cur <= endDate) { sundays.push(new Date(cur)); cur.setDate(cur.getDate() + 7); }

  for (let i = 0; i < sundays.length; i++) {
    const s = sundays[i];
    await prisma.globalDate.create({
      data: { date: s, label: `${s.getMonth()+1}/${s.getDate()}`, order: i },
    });
  }
  console.log(`  ${sundays.length} Sundays (1/4 – 3/29)`);

  // ====== 4. TEAMS + MEMBERS ======
  console.log("4. Teams...");
  let rIdx = 0;
  for (const group of mainGroups) {
    const leaders = leadersByGroup[group.id];
    for (const leader of leaders) {
      const team = await prisma.team.create({
        data: { name: leader.username, groupId: group.id, leaderId: leader.id },
      });
      await prisma.user.update({ where: { id: leader.id }, data: { teamId: team.id } });

      const teamDates = [];
      for (let d = 0; d < sundays.length; d++) {
        const s = sundays[d];
        teamDates.push(await prisma.attendanceDate.create({
          data: { date: s, label: `${s.getMonth()+1}/${s.getDate()}`, teamId: team.id, order: d },
        }));
      }

      // ~10 members from roster
      const memberCount = 9 + Math.floor(Math.random() * 3);
      for (let m = 0; m < memberCount; m++) {
        let person = null;
        for (let k = rIdx; k < roster.length; k++) {
          if (roster[k].groupName === group.name) {
            person = roster[k];
            [roster[rIdx], roster[k]] = [roster[k], roster[rIdx]];
            rIdx++;
            break;
          }
        }
        if (!person) break;

        const member = await prisma.member.create({
          data: { name: person.name, gender: person.gender, birthYear: person.birthYear, teamId: team.id, order: m },
        });

        // Update roster
        const rr = await prisma.rosterMember.findFirst({ where: { name: person.name } });
        if (rr) await prisma.rosterMember.update({ where: { id: rr.id }, data: { teamName: leader.username, groupName: group.name } });

        // Attendance with some ABSENT reasons
        for (const dateRec of teamDates) {
          const status = randStatus();
          if (status) {
            const reason = (status === "ABSENT" && Math.random() < 0.4) ? pick(absentReasons)
              : (status === "AWR") ? pick(absentReasons) : null;
            await prisma.attendance.create({
              data: { memberId: member.id, attendanceDateId: dateRec.id, status, awrReason: reason },
            });
          }
        }
      }
    }
  }

  // Shalom teams (empty, just structure)
  for (const leader of leadersByGroup[shalom.id]) {
    const team = await prisma.team.create({
      data: { name: leader.username, groupId: shalom.id, leaderId: leader.id },
    });
    await prisma.user.update({ where: { id: leader.id }, data: { teamId: team.id } });
  }

  const totalMembers = await prisma.member.count();
  console.log(`  35 teams, ${totalMembers} members`);

  // ====== 5. SHALOM CURRENT (20) ======
  console.log("5. Shalom list...");
  const shalomLeaders = leadersByGroup[shalom.id].map(l => l.username);
  for (let i = 0; i < 20; i++) {
    const name = uname();
    const month = 1 + Math.floor(i / 8);
    const day = 1 + Math.floor(Math.random() * 27);
    const statuses = ["방문","방문","방문","등록","등록","등록","등록","졸업","졸업"];
    await prisma.shalomMember.create({
      data: {
        name, gender: pick(genders), birthYear: pick(birthYears), phone: randPhone(),
        visitDate: `2026-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
        inviter: pick(inviters), leader: pick(shalomLeaders),
        note: i % 5 === 0 ? "대학생" : i % 7 === 0 ? "직장인" : "",
        status: pick(statuses), order: i,
      },
    });
  }

  // ====== 6. SHALOM HISTORY ======
  console.log("6. Shalom history...");
  const sh1 = [];
  for (let i = 0; i < 18; i++) {
    const name = uname();
    const month = 3 + Math.floor(i / 5);
    const day = 1 + Math.floor(Math.random() * 27);
    sh1.push({
      name, gender: pick(genders), birthYear: pick(birthYears), phone: randPhone(),
      visitDate: `2025-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
      inviter: pick(inviters), leader: pick(shalomLeaders), note: i % 6 === 0 ? "대학생" : "",
      status: i < 6 ? "졸업" : i < 12 ? "등록" : "방문",
    });
  }
  await prisma.shalomHistory.create({ data: { name: "2025년 상반기", data: JSON.stringify(sh1) } });

  const sh2 = [];
  for (let i = 0; i < 15; i++) {
    const name = uname();
    const month = 9 + Math.floor(i / 5);
    const day = 1 + Math.floor(Math.random() * 27);
    sh2.push({
      name, gender: pick(genders), birthYear: pick(birthYears), phone: randPhone(),
      visitDate: `2025-${String(Math.min(month, 12)).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
      inviter: pick(inviters), leader: pick(shalomLeaders), note: "",
      status: i < 5 ? "졸업" : i < 10 ? "등록" : "방문",
    });
  }
  await prisma.shalomHistory.create({ data: { name: "2025년 하반기", data: JSON.stringify(sh2) } });

  // ====== 7. Add 졸업 names to main teams for grade tracking ======
  const graduates = [...sh1.filter(m => m.status === "졸업"), ...sh2.filter(m => m.status === "졸업")];
  const currentTeams = await prisma.team.findMany({
    where: { groupId: { in: mainGroups.map(g => g.id) } },
    include: { dates: { orderBy: { order: "asc" } } },
  });
  for (const grad of graduates) {
    if (!currentTeams.length) break;
    const team = pick(currentTeams);
    const member = await prisma.member.create({
      data: { name: grad.name, gender: grad.gender, birthYear: grad.birthYear, teamId: team.id, order: 99 },
    });
    const quality = Math.random();
    for (const date of team.dates) {
      const r = Math.random();
      const status = r < quality * 0.85 ? "HERE" : r < quality * 0.85 + 0.12 ? "ABSENT" : "";
      if (status) await prisma.attendance.create({ data: { memberId: member.id, attendanceDateId: date.id, status } });
    }
  }
  console.log(`  ${graduates.length} graduates added to main teams`);

  // ====== 8. TERM HISTORY (2025 1학기: Mar-Jul 2025) ======
  console.log("8. Term history...");
  const histTeams = [];
  for (const group of mainGroups) {
    for (let t = 0; t < 10; t++) {
      const tName = uname();
      const histDates = [];
      const hStart = new Date("2025-03-02");
      for (let d = 0; d < 18; d++) {
        const s = new Date(hStart);
        s.setDate(hStart.getDate() + d * 7);
        histDates.push({ label: `${s.getMonth()+1}/${s.getDate()}`, date: s.toISOString() });
      }
      const histMembers = [];
      for (let m = 0; m < 8 + Math.floor(Math.random() * 4); m++) {
        const mName = uname();
        histMembers.push({
          id: `h-${t}-${m}`, name: mName, gender: pick(genders), birthYear: pick(birthYears), order: m,
          attendances: histDates.map(d => ({
            status: randStatus() || "HERE", awrReason: null, attendanceDate: { label: d.label, date: d.date },
          })),
        });
      }
      histTeams.push({
        id: `ht-${group.name}-${t}`, name: tName, groupId: group.id,
        group: { id: group.id, name: group.name },
        leader: { id: `hl-${t}`, username: tName },
        members: histMembers, dates: histDates.map((d, i) => ({ id: `hd-${t}-${i}`, ...d, order: i })),
      });
    }
  }
  await prisma.termHistory.create({
    data: {
      name: "2025년 1학기",
      data: JSON.stringify({ users: [], groups: mainGroups, teams: histTeams, globalDates: [], snapshotDate: "2025-07-31T00:00:00.000Z" }),
    },
  });

  // ====== SUMMARY ======
  const c = {
    roster: await prisma.rosterMember.count(),
    users: await prisma.user.count(),
    teams: await prisma.team.count(),
    members: await prisma.member.count(),
    att: await prisma.attendance.count(),
    shalom: await prisma.shalomMember.count(),
  };
  console.log(`\n=== DONE ===`);
  console.log(`Roster: ${c.roster} | Users: ${c.users} | Teams: ${c.teams}`);
  console.log(`Members: ${c.members} | Attendance: ${c.att} | Shalom: ${c.shalom}`);
  console.log(`Sundays: ${sundays.length} (1/4 – 3/29 2026)`);
  console.log(`Term history: 1 (2025년 1학기) | Shalom history: 2`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
