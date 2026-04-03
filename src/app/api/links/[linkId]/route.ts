import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (session.role !== "PASTOR" && session.role !== "EXECUTIVE") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { linkId } = await params;
  const data = await request.json();

  const link = await prisma.link.update({ where: { id: linkId }, data });
  return NextResponse.json({ link });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (session.role !== "PASTOR" && session.role !== "EXECUTIVE") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { linkId } = await params;
  await prisma.link.delete({ where: { id: linkId } });
  return NextResponse.json({ success: true });
}
