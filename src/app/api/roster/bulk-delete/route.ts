import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteRosterMember } from "@/lib/roster-mutations";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberIds } = await request.json();
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let ok = 0;
  const failed: string[] = [];

  // ponytail: sequential loop, same no-atomicity ceiling as /api/roster/bulk.
  for (const memberId of memberIds) {
    try {
      await deleteRosterMember(memberId);
      ok++;
    } catch {
      failed.push(memberId);
    }
  }

  return NextResponse.json({ ok, failed });
}
