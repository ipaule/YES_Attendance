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
    type: history.type,
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
  const body = await request.json();
  const data: { name?: string; parentId?: string | null } = {};

  if (body.name !== undefined) {
    if (!body.name.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    data.name = body.name.trim();
  }

  if (body.parentId !== undefined) {
    const newParentId: string | null = body.parentId;

    if (newParentId === historyId) {
      return NextResponse.json({ error: "폴더를 자기 자신 안으로 옮길 수 없습니다." }, { status: 400 });
    }

    if (newParentId) {
      const newParent = await prisma.shalomHistory.findUnique({ where: { id: newParentId } });
      if (!newParent) return NextResponse.json({ error: "상위 폴더를 찾을 수 없습니다." }, { status: 404 });
      if (newParent.type !== "FOLDER") {
        return NextResponse.json({ error: "폴더 안으로만 옮길 수 있습니다." }, { status: 400 });
      }

      // Cycle check: walk up from the destination — it must never reach historyId
      let cursor: string | null = newParentId;
      while (cursor) {
        if (cursor === historyId) {
          return NextResponse.json(
            { error: "폴더를 자신의 하위 폴더 안으로 옮길 수 없습니다." },
            { status: 400 }
          );
        }
        const node: { parentId: string | null } | null = await prisma.shalomHistory.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
        cursor = node?.parentId ?? null;
      }
    }

    data.parentId = newParentId;
  }

  const history = await prisma.shalomHistory.update({
    where: { id: historyId },
    data,
    select: { id: true, name: true, type: true, parentId: true, order: true, createdAt: true },
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
  const node = await prisma.shalomHistory.findUnique({ where: { id: historyId } });
  if (!node) return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });

  if (node.type === "RECORD") {
    return NextResponse.json(
      { error: "기록은 삭제할 수 없습니다. 보관된 데이터는 이동만 가능합니다." },
      { status: 403 }
    );
  }

  // FOLDER: delete the folder itself but preserve its contents — promote
  // direct children up to the folder's own parent, never cascade-delete.
  await prisma.$transaction([
    prisma.shalomHistory.updateMany({
      where: { parentId: historyId },
      data: { parentId: node.parentId },
    }),
    prisma.shalomHistory.delete({ where: { id: historyId } }),
  ]);

  return NextResponse.json({ success: true });
}
