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
  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  const term = await prisma.termHistory.update({
    where: { id: termId },
    data: { name: name.trim() },
    select: { id: true, name: true, createdAt: true },
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

  await prisma.termHistory.delete({ where: { id: termId } });

  return NextResponse.json({ success: true });
}
