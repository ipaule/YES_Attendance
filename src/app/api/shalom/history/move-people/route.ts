import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

interface PersonRecord {
  id?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { fromId, toId, newFolderName, personIds } = await request.json();

  if (!fromId || !Array.isArray(personIds) || personIds.length === 0) {
    return NextResponse.json({ error: "이동할 사람을 선택해주세요." }, { status: 400 });
  }
  if (!toId && !newFolderName?.trim()) {
    return NextResponse.json({ error: "이동할 폴더를 선택해주세요." }, { status: 400 });
  }
  if (toId && toId === fromId) {
    return NextResponse.json({ error: "같은 폴더로는 이동할 수 없습니다." }, { status: 400 });
  }

  const source = await prisma.shalomHistory.findUnique({ where: { id: fromId } });
  if (!source) return NextResponse.json({ error: "원본 폴더를 찾을 수 없습니다." }, { status: 404 });

  const sourcePeople = JSON.parse(source.data) as PersonRecord[];
  const idSet = new Set<string>(personIds);
  const moved = sourcePeople.filter((p) => p.id && idSet.has(p.id));
  const kept = sourcePeople.filter((p) => !p.id || !idSet.has(p.id));

  if (moved.length === 0) {
    return NextResponse.json({ error: "이동할 사람을 찾을 수 없습니다." }, { status: 400 });
  }

  if (toId) {
    const dest = await prisma.shalomHistory.findUnique({ where: { id: toId } });
    if (!dest) return NextResponse.json({ error: "대상 폴더를 찾을 수 없습니다." }, { status: 404 });

    const destPeople = JSON.parse(dest.data) as PersonRecord[];
    await prisma.$transaction([
      prisma.shalomHistory.update({ where: { id: fromId }, data: { data: JSON.stringify(kept) } }),
      prisma.shalomHistory.update({
        where: { id: toId },
        data: { data: JSON.stringify([...destPeople, ...moved]) },
      }),
    ]);
  } else {
    const maxOrder = await prisma.shalomHistory.aggregate({ _max: { order: true } });
    await prisma.$transaction([
      prisma.shalomHistory.update({ where: { id: fromId }, data: { data: JSON.stringify(kept) } }),
      prisma.shalomHistory.create({
        data: {
          name: newFolderName.trim(),
          type: "FOLDER",
          data: JSON.stringify(moved),
          parentId: null,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      }),
    ]);
  }

  return NextResponse.json({ success: true, movedCount: moved.length });
}
