import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";
import { calculateAttendanceRate, calculateGrade } from "@/lib/attendance";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const hasAccess = await canAccessShalom(session);
    if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // --- Bar Graph 1: 방문/등록/졸업 counts ---
    // Get current shalom members
    const currentMembers = await prisma.shalomMember.findMany();

    // Get all history records
    const histories = await prisma.shalomHistory.findMany();
    const historyMembers: { name: string; visitDate: string; status: string }[] = [];
    for (const h of histories) {
      const data = JSON.parse(h.data) as { name: string; visitDate: string; status: string }[];
      historyMembers.push(...data);
    }

    // Combine and filter by date range
    const allMembers = [
      ...currentMembers.map((m) => ({ name: m.name, visitDate: m.visitDate, status: m.status })),
      ...historyMembers,
    ];

    const filtered = allMembers.filter((m) => {
      if (!m.visitDate) return !startDate; // include blank dates only if no filter
      if (startDate && m.visitDate < startDate) return false;
      if (endDate && m.visitDate > endDate) return false;
      return true;
    });

    const statusCounts = {
      방문: filtered.filter((m) => m.status === "방문").length,
      등록: filtered.filter((m) => m.status === "등록").length,
      졸업: filtered.filter((m) => m.status === "졸업").length,
    };

    // --- Bar Graph 2: 졸업 grade distribution (filtered by same date range) ---
    const graduateNames = new Set<string>();
    for (const m of filtered) {
      if (m.status === "졸업" && m.name) {
        graduateNames.add(m.name);
      }
    }

    // Search current teams in 사랑/소망/믿음 for matching names
    const targetGroups = await prisma.group.findMany({
      where: { name: { in: ["사랑", "소망", "믿음"] } },
      select: { id: true },
    });
    const targetGroupIds = targetGroups.map((g) => g.id);

    const currentTeamMembers = await prisma.member.findMany({
      where: {
        team: { groupId: { in: targetGroupIds } },
        name: { in: Array.from(graduateNames) },
      },
      include: {
        attendances: true,
        team: { include: { dates: { orderBy: { order: "asc" } } } },
      },
    });

    // Calculate grades from current data
    const gradeMap: Record<string, string> = {};
    for (const member of currentTeamMembers) {
      const statuses = member.team.dates.map((d) => {
        const att = member.attendances.find((a) => a.attendanceDateId === d.id);
        return att?.status || "";
      });
      const rate = calculateAttendanceRate(statuses);
      const grade = calculateGrade(rate);
      gradeMap[member.name] = grade;
    }

    // Search term histories for matching names not found in current
    const termHistories = await prisma.termHistory.findMany();
    for (const th of termHistories) {
      const data = JSON.parse(th.data) as {
        teams: {
          members: {
            name: string;
            attendances: { status: string; attendanceDate: { label: string } }[];
          }[];
          dates: { label: string }[];
        }[];
      };

      for (const team of data.teams) {
        for (const member of team.members) {
          if (graduateNames.has(member.name) && !gradeMap[member.name]) {
            const statuses = team.dates.map((d) => {
              const att = member.attendances.find(
                (a) => a.attendanceDate.label === d.label
              );
              return att?.status || "";
            });
            const rate = calculateAttendanceRate(statuses);
            gradeMap[member.name] = calculateGrade(rate);
          }
        }
      }
    }

    // Count by grade buckets
    const gradeCounts = { A: 0, B: 0, C: 0, "D이하": 0 };
    for (const name of graduateNames) {
      const grade = gradeMap[name];
      if (!grade) continue; // not found in any team
      if (grade === "A") gradeCounts.A++;
      else if (grade === "B") gradeCounts.B++;
      else if (grade === "C") gradeCounts.C++;
      else gradeCounts["D이하"]++; // D or F
    }

    return NextResponse.json({
      statusCounts,
      gradeCounts,
      totalGraduates: graduateNames.size,
      matchedGraduates: Object.keys(gradeMap).length,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
