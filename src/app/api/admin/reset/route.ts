import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PASTOR") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { confirmText } = await request.json();

    if (confirmText !== "데이터 초기화") {
      return NextResponse.json({ error: "확인 텍스트가 일치하지 않습니다." }, { status: 400 });
    }

    // Unlink users from teams
    await prisma.user.updateMany({
      where: { teamId: { not: null } },
      data: { teamId: null },
    });
    await prisma.team.updateMany({
      where: { leaderId: { not: null } },
      data: { leaderId: null },
    });

    // Delete everything
    await prisma.attendance.deleteMany();
    await prisma.attendanceDate.deleteMany();
    await prisma.member.deleteMany();
    await prisma.team.deleteMany();
    await prisma.globalDate.deleteMany();
    await prisma.termHistory.deleteMany();
    await prisma.shalomMember.deleteMany();
    await prisma.shalomHistory.deleteMany();
    await prisma.user.deleteMany({ where: { username: { not: "AJ" } } });

    return NextResponse.json({
      success: true,
      message: "모든 데이터가 초기화되었습니다. (AJ 계정만 유지)",
    });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
