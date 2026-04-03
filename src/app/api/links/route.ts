import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const links = await prisma.link.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ links });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  if (session.role !== "PASTOR" && session.role !== "EXECUTIVE") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { title, url } = await request.json();
  if (!title) return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });

  const maxOrder = await prisma.link.findFirst({ orderBy: { order: "desc" }, select: { order: true } });

  const link = await prisma.link.create({
    data: { title, url: url || "", order: (maxOrder?.order ?? -1) + 1 },
  });

  return NextResponse.json({ link }, { status: 201 });
}
