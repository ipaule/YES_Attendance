import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PALETTE } from "@/lib/dropdownSeeds";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const data = await request.json();
  const updateData: { value?: string; color?: string; order?: number } = {};

  if (typeof data.value === "string") {
    const v = data.value.trim();
    if (!v) return NextResponse.json({ error: "값을 입력해주세요." }, { status: 400 });
    updateData.value = v;
  }
  if (typeof data.color === "string" && PALETTE.includes(data.color)) {
    updateData.color = data.color;
  }
  if (typeof data.order === "number") {
    updateData.order = data.order;
  }

  try {
    const option = await prisma.dropdownOption.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ option });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "이미 존재하는 항목입니다." }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  await prisma.dropdownOption.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
