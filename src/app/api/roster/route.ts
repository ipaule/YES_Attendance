import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calculateAttendanceRate, calculateGrade } from "@/lib/attendance";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const filterGender = searchParams.get("gender") || "";
  const filterBirthYear = searchParams.get("birthYear") || "";
  const filterGroup = searchParams.get("groupName") || "";
  const filterGrade = searchParams.get("grade") || "";

  const members = await prisma.rosterMember.findMany({
    orderBy: { order: "asc" },
  });

  // Get current team members for attendance lookup
  const targetGroups = await prisma.group.findMany({
    where: { name: { in: ["사랑", "소망", "믿음"] } },
    select: { id: true },
  });
  const targetGroupIds = targetGroups.map((g) => g.id);

  const currentMembers = await prisma.member.findMany({
    where: { team: { groupId: { in: targetGroupIds } } },
    include: {
      attendances: true,
      team: { include: { dates: { orderBy: { order: "asc" } } } },
    },
  });

  // Get all term histories for historical attendance
  const termHistories = await prisma.termHistory.findMany();
  const historyData = termHistories.map((th) => JSON.parse(th.data) as {
    teams: {
      members: {
        name: string;
        attendances: { status: string; attendanceDate: { label: string } }[];
      }[];
      dates: { label: string }[];
    }[];
  });

  // Build attendance map: name → all statuses
  const attendanceMap: Record<string, string[]> = {};

  // Current data
  for (const m of currentMembers) {
    const statuses = m.team.dates.map((d) => {
      const att = m.attendances.find((a) => a.attendanceDateId === d.id);
      return att?.status || "";
    });
    if (!attendanceMap[m.name]) attendanceMap[m.name] = [];
    attendanceMap[m.name].push(...statuses);
  }

  // History data
  for (const hd of historyData) {
    for (const team of hd.teams) {
      for (const member of team.members) {
        const statuses = team.dates.map((d) => {
          const att = member.attendances.find((a) => a.attendanceDate.label === d.label);
          return att?.status || "";
        });
        if (!attendanceMap[member.name]) attendanceMap[member.name] = [];
        attendanceMap[member.name].push(...statuses);
      }
    }
  }

  // Compute rate + grade for each roster member and apply filters
  const result = members
    .map((m) => {
      const statuses = attendanceMap[m.name] || [];
      const rate = statuses.length > 0 ? calculateAttendanceRate(statuses) : -1;
      const grade = rate >= 0 ? calculateGrade(rate) : "-";
      return { ...m, rate: rate >= 0 ? Math.round(rate) : -1, grade };
    })
    .filter((m) => {
      if (search && !m.name.includes(search)) return false;
      if (filterGender && m.gender !== filterGender) return false;
      if (filterBirthYear && m.birthYear !== filterBirthYear) return false;
      if (filterGroup && m.groupName !== filterGroup) return false;
      if (filterGrade && m.grade !== filterGrade) return false;
      return true;
    });

  return NextResponse.json({ members: result });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const data = await request.json();

  const maxOrder = await prisma.rosterMember.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const member = await prisma.rosterMember.create({
    data: {
      name: data.name || "",
      gender: data.gender || "",
      birthYear: data.birthYear || "",
      groupName: data.groupName || "",
      teamName: data.teamName || "",
      note: data.note || "",
      order: (maxOrder?.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
