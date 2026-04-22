import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const members = await prisma.shalomMember.findMany({
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const data = await request.json();

  if (!data.name || !data.gender) {
    return NextResponse.json({ error: "이름과 성별은 필수입니다." }, { status: 400 });
  }

  if (data.phone && !/^\d{3}-\d{3}-\d{4}$/.test(data.phone)) {
    return NextResponse.json({ error: "전화번호 형식: XXX-XXX-XXXX" }, { status: 400 });
  }

  const existing = await prisma.shalomMember.findFirst({ where: { name: data.name } });
  if (existing) {
    return NextResponse.json({ error: "이미 같은 이름이 존재합니다." }, { status: 409 });
  }

  await prisma.$executeRawUnsafe('UPDATE "ShalomMember" SET "order" = "order" + 1');

  const member = await prisma.shalomMember.create({
    data: {
      name: data.name,
      englishName: data.englishName || "",
      gender: data.gender,
      birthYear: data.birthYear || "",
      phone: data.phone || "",
      visitDate: data.visitDate || "",
      inviter: data.inviter || "",
      leader: data.leader || "",
      note: data.note || "",
      status: data.status || "방문",
      order: 0,
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
