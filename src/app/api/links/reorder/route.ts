import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (session.role !== "PASTOR" && session.role !== "EXECUTIVE") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { linkIds } = await request.json();
  if (!linkIds?.length) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  for (let i = 0; i < linkIds.length; i++) {
    await prisma.link.update({ where: { id: linkIds[i] }, data: { order: i } });
  }

  return NextResponse.json({ success: true });
}
