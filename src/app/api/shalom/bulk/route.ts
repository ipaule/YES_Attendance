import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { memberIds, patch } = await request.json();
  if (!Array.isArray(memberIds) || memberIds.length === 0 || !patch || typeof patch !== "object") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (patch.phone && !/^\d{3}-\d{3}-\d{4}$/.test(patch.phone)) {
    return NextResponse.json({ error: "전화번호 형식: XXX-XXX-XXXX" }, { status: 400 });
  }

  // Whitelist editable fields; never let the client set movedToRosterAt or id.
  const allowed: Record<string, unknown> = {};
  for (const key of [
    "name",
    "englishName",
    "gender",
    "birthYear",
    "birthday",
    "phone",
    "email",
    "visitDate",
    "inviter",
    "leader",
    "groupName",
    "teamName",
    "registrationDate",
    "salvationAssurance",
    "training",
    "baptismStatus",
    "photo",
    "note",
    "status",
  ] as const) {
    if (key in patch) allowed[key] = patch[key];
  }

  const result = await prisma.shalomMember.updateMany({
    where: { id: { in: memberIds } },
    data: allowed,
  });

  return NextResponse.json({ ok: result.count });
}
