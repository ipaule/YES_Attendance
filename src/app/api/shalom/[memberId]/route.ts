import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { memberId } = await params;
  const member = await prisma.shalomMember.findUnique({ where: { id: memberId } });
  if (!member) {
    return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ member });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { memberId } = await params;
  const data = await request.json();

  if (data.phone && !/^\d{3}-\d{3}-\d{4}$/.test(data.phone)) {
    return NextResponse.json({ error: "전화번호 형식: XXX-XXX-XXXX" }, { status: 400 });
  }

  // Whitelist editable fields; never let the client set movedToRosterAt or id.
  const allowed: Record<string, unknown> = {};
  for (const key of [
    "name",
    "englishName",
    "gender",
    "birthYear",
    "phone",
    "visitDate",
    "inviter",
    "leader",
    "note",
    "status",
  ] as const) {
    if (key in data) allowed[key] = data[key];
  }

  const member = await prisma.shalomMember.update({
    where: { id: memberId },
    data: allowed,
  });

  return NextResponse.json({ member });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { memberId } = await params;
  await prisma.shalomMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
