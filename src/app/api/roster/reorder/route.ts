import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberIds } = await request.json();
  if (!memberIds?.length) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  for (let i = 0; i < memberIds.length; i++) {
    await prisma.rosterMember.update({
      where: { id: memberIds[i] },
      data: { order: i },
    });
  }

  return NextResponse.json({ success: true });
}
