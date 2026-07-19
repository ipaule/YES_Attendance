import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ termId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { termId } = await params;

  const term = await prisma.termHistory.findUnique({
    where: { id: termId },
  });

  if (!term) {
    return NextResponse.json({ error: "텀을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    id: term.id,
    name: term.name,
    type: term.type,
    createdAt: term.createdAt,
    data: JSON.parse(term.data),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ termId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { termId } = await params;
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

    if (newParentId === termId) {
      return NextResponse.json({ error: "폴더를 자기 자신 안으로 옮길 수 없습니다." }, { status: 400 });
    }

    if (newParentId) {
      const newParent = await prisma.termHistory.findUnique({ where: { id: newParentId } });
      if (!newParent) return NextResponse.json({ error: "상위 폴더를 찾을 수 없습니다." }, { status: 404 });
      if (newParent.type !== "FOLDER") {
        return NextResponse.json({ error: "폴더 안으로만 옮길 수 있습니다." }, { status: 400 });
      }

      // Cycle check: walk up from the destination — it must never reach termId
      let cursor: string | null = newParentId;
      while (cursor) {
        if (cursor === termId) {
          return NextResponse.json(
            { error: "폴더를 자신의 하위 폴더 안으로 옮길 수 없습니다." },
            { status: 400 }
          );
        }
        const node: { parentId: string | null } | null = await prisma.termHistory.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
        cursor = node?.parentId ?? null;
      }
    }

    data.parentId = newParentId;
  }

  const term = await prisma.termHistory.update({
    where: { id: termId },
    data,
    select: { id: true, name: true, type: true, parentId: true, order: true, createdAt: true },
  });

  return NextResponse.json({ term });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ termId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { termId } = await params;

  const term = await prisma.termHistory.findUnique({ where: { id: termId } });
  if (!term) return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });

  if (term.type === "FOLDER") {
    const childCount = await prisma.termHistory.count({ where: { parentId: termId } });
    if (childCount > 0) {
      return NextResponse.json(
        { error: "폴더가 비어있지 않습니다. 하위 항목을 먼저 이동해주세요." },
        { status: 400 }
      );
    }
  }

  await prisma.termHistory.delete({ where: { id: termId } });

  return NextResponse.json({ success: true });
}
