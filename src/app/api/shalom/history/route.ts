import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const folders = await prisma.shalomHistory.findMany({
    select: { id: true, name: true, order: true, createdAt: true, data: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      order: f.order,
      createdAt: f.createdAt,
      count: (JSON.parse(f.data) as unknown[]).length,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "폴더 이름을 입력해주세요." }, { status: 400 });
  }

  const maxOrder = await prisma.shalomHistory.aggregate({ _max: { order: true } });

  const folder = await prisma.shalomHistory.create({
    data: {
      name: name.trim(),
      type: "FOLDER",
      data: "[]",
      parentId: null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    select: { id: true, name: true, order: true, createdAt: true },
  });

  return NextResponse.json({ folder: { ...folder, count: 0 } }, { status: 201 });
}
