import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { nextPaletteColor, PALETTE } from "@/lib/dropdownSeeds";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const options = await prisma.dropdownOption.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ options });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { category, value, color } = await request.json();
  if (!category || !value) {
    return NextResponse.json({ error: "카테고리와 값을 입력해주세요." }, { status: 400 });
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return NextResponse.json({ error: "값을 입력해주세요." }, { status: 400 });
  }

  const existing = await prisma.dropdownOption.findUnique({
    where: { category_value: { category, value: trimmedValue } },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 항목입니다." }, { status: 409 });
  }

  let chosenColor = color;
  if (!chosenColor || !PALETTE.includes(chosenColor)) {
    const sameCategory = await prisma.dropdownOption.findMany({
      where: { category },
      select: { color: true },
    });
    chosenColor = nextPaletteColor(sameCategory.map((o) => o.color));
  }

  const maxOrder = await prisma.dropdownOption.findFirst({
    where: { category },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const option = await prisma.dropdownOption.create({
    data: {
      category,
      value: trimmedValue,
      color: chosenColor,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ option }, { status: 201 });
}
