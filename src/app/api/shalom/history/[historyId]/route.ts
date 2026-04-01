import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ historyId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { historyId } = await params;
  const history = await prisma.shalomHistory.findUnique({ where: { id: historyId } });

  if (!history) return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json({
    id: history.id,
    name: history.name,
    createdAt: history.createdAt,
    data: JSON.parse(history.data),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ historyId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { historyId } = await params;
  const { name } = await request.json();

  const history = await prisma.shalomHistory.update({
    where: { id: historyId },
    data: { name: name.trim() },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json({ history });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ historyId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { historyId } = await params;
  await prisma.shalomHistory.delete({ where: { id: historyId } });

  return NextResponse.json({ success: true });
}
