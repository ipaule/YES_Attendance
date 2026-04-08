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

  const oldMember = await prisma.rosterMember.findUnique({ where: { id: memberId } });
  const member = await prisma.rosterMember.update({
    where: { id: memberId },
    data,
  });

  // Sync name/gender/birthYear changes to team Member records
  if (oldMember) {
    const updates: Record<string, string> = {};
    if (data.name !== undefined && data.name !== oldMember.name) updates.name = data.name;
    if (data.gender !== undefined && data.gender !== oldMember.gender) updates.gender = data.gender;
    if (data.birthYear !== undefined && data.birthYear !== oldMember.birthYear) updates.birthYear = data.birthYear;

    if (Object.keys(updates).length > 0) {
      await prisma.member.updateMany({
        where: { name: oldMember.name },
        data: updates,
      });
    }
  }

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
