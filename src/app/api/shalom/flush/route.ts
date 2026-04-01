import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const hasAccess = await canAccessShalom(session);
    if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

    const { memberIds, historyId, historyName } = await request.json();

    if (!memberIds || memberIds.length === 0) {
      return NextResponse.json({ error: "기록할 멤버를 선택해주세요." }, { status: 400 });
    }

    if (!historyId && !historyName?.trim()) {
      return NextResponse.json({ error: "기록 이름을 입력해주세요." }, { status: 400 });
    }

    // Get selected members
    const members = await prisma.shalomMember.findMany({
      where: { id: { in: memberIds } },
    });

    const memberData = members.map((m) => ({
      name: m.name,
      gender: m.gender,
      birthYear: m.birthYear,
      phone: m.phone,
      visitDate: m.visitDate,
      inviter: m.inviter,
      leader: m.leader,
      note: m.note,
      status: m.status,
    }));

    if (historyId) {
      // Append to existing history
      const existing = await prisma.shalomHistory.findUnique({
        where: { id: historyId },
      });
      if (!existing) {
        return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
      }
      const existingData = JSON.parse(existing.data) as unknown[];
      const merged = [...existingData, ...memberData];
      await prisma.shalomHistory.update({
        where: { id: historyId },
        data: { data: JSON.stringify(merged) },
      });
    } else {
      // Create new history
      await prisma.shalomHistory.create({
        data: {
          name: historyName!.trim(),
          data: JSON.stringify(memberData),
        },
      });
    }

    // Delete flushed members
    await prisma.shalomMember.deleteMany({
      where: { id: { in: memberIds } },
    });

    return NextResponse.json({
      success: true,
      message: `${members.length}명의 기록이 저장되었습니다.`,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
