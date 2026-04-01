import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessTeam } from "@/lib/permissions";
import * as XLSX from "xlsx";
import {
  calculateAttendanceRate,
  calculateGrade,
} from "@/lib/attendance";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "조를 선택해주세요." }, { status: 400 });
  }

  const hasAccess = await canAccessTeam(session, teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      group: { select: { name: true } },
      members: {
        orderBy: { order: "asc" },
        include: { attendances: true },
      },
      dates: { orderBy: { order: "asc" } },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "조를 찾을 수 없습니다." }, { status: 404 });
  }

  // Build spreadsheet data
  const headers = [
    "이름",
    "성별",
    "또래",
    ...team.dates.map((d) => d.label),
    "출석률",
    "등급",
  ];

  const rows = team.members.map((member) => {
    const statuses = team.dates.map((date) => {
      const att = member.attendances.find(
        (a) => a.attendanceDateId === date.id
      );
      return att?.status || "ABSENT";
    });

    const rate = calculateAttendanceRate(statuses);
    const grade = calculateGrade(rate);

    const statusLabels = statuses.map((s) => {
      switch (s) {
        case "HERE":
          return "○";
        case "ABSENT":
          return "✕";
        case "AWR":
          return "△";
        default:
          return "";
      }
    });

    return [
      member.name,
      member.gender === "MALE" ? "남" : "여",
      member.birthYear,
      ...statusLabels,
      `${rate.toFixed(0)}%`,
      grade,
    ];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws["!cols"] = [
    { wch: 10 },
    { wch: 5 },
    { wch: 8 },
    ...team.dates.map(() => ({ wch: 6 })),
    { wch: 8 },
    { wch: 5 },
  ];

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    `${team.group?.name || ""} ${team.name}`
  );

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(team.group?.name || "")}_${encodeURIComponent(team.name)}_출석표.xlsx"`,
    },
  });
}
