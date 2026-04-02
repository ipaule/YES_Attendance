import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;
  const data = await request.json();

  const member = await prisma.rosterMember.update({
    where: { id: memberId },
    data,
  });

  return NextResponse.json({ member });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;
  await prisma.rosterMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
