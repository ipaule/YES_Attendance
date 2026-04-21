import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [users, teams, groups, members, attendanceDates, roster] = await Promise.all([
      prisma.user.count(),
      prisma.team.count(),
      prisma.group.count(),
      prisma.member.count(),
      prisma.attendanceDate.count(),
      prisma.rosterMember.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      db: "ok",
      counts: { users, teams, groups, members, attendanceDates, roster },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        db: "fail",
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 503 }
    );
  }
}
