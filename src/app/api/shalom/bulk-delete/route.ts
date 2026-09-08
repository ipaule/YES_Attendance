import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { memberIds } = await request.json();
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await prisma.shalomMember.deleteMany({ where: { id: { in: memberIds } } });

  return NextResponse.json({ ok: result.count });
}
