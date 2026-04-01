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
    orderBy: { visitDate: "desc" },
  });

  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const data = await request.json();

  const member = await prisma.shalomMember.create({
    data: {
      name: data.name || "",
      gender: data.gender || "",
      birthYear: data.birthYear || "",
      phone: data.phone || "",
      visitDate: data.visitDate || "",
      inviter: data.inviter || "",
      leader: data.leader || "",
      note: data.note || "",
      status: data.status || "방문",
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
