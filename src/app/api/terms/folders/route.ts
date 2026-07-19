import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (session.role !== "PASTOR") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { name, parentId } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "폴더 이름을 입력해주세요." }, { status: 400 });
  }

  if (parentId) {
    const parent = await prisma.termHistory.findUnique({ where: { id: parentId } });
    if (!parent) return NextResponse.json({ error: "상위 폴더를 찾을 수 없습니다." }, { status: 404 });
    if (parent.type !== "FOLDER") {
      return NextResponse.json({ error: "폴더 안에만 만들 수 있습니다." }, { status: 400 });
    }
  }

  const maxOrder = await prisma.termHistory.aggregate({
    where: { parentId: parentId ?? null },
    _max: { order: true },
  });

  const folder = await prisma.termHistory.create({
    data: {
      name: name.trim(),
      type: "FOLDER",
      data: "[]",
      parentId: parentId ?? null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    select: { id: true, name: true, type: true, parentId: true, order: true, createdAt: true },
  });

  return NextResponse.json({ history: folder }, { status: 201 });
}
