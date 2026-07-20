import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

interface PersonRecord {
  id?: string;
  [key: string]: unknown;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ historyId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { historyId } = await params;
  const folder = await prisma.shalomHistory.findUnique({ where: { id: historyId } });

  if (!folder) return NextResponse.json({ error: "폴더를 찾을 수 없습니다." }, { status: 404 });

  const people = (JSON.parse(folder.data) as PersonRecord[]).map((p) =>
    p.id ? p : { ...p, id: crypto.randomUUID() }
  );

  return NextResponse.json({
    id: folder.id,
    name: folder.name,
    createdAt: folder.createdAt,
    data: people,
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
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  const folder = await prisma.shalomHistory.update({
    where: { id: historyId },
    data: { name: body.name.trim() },
    select: { id: true, name: true, order: true, createdAt: true },
  });

  return NextResponse.json({ folder });
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
  const folder = await prisma.shalomHistory.findUnique({ where: { id: historyId } });
  if (!folder) return NextResponse.json({ error: "폴더를 찾을 수 없습니다." }, { status: 404 });

  const people = JSON.parse(folder.data) as unknown[];
  if (people.length > 0) {
    return NextResponse.json(
      { error: "폴더에 사람이 남아 있어 삭제할 수 없습니다. 먼저 다른 폴더로 이동해주세요." },
      { status: 400 }
    );
  }

  await prisma.shalomHistory.delete({ where: { id: historyId } });

  return NextResponse.json({ success: true });
}
