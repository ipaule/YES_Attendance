import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { applyRosterPatch } from "@/lib/roster-mutations";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberIds, patch } = await request.json();
  if (!Array.isArray(memberIds) || memberIds.length === 0 || !patch || typeof patch !== "object") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let ok = 0;
  const warnings: string[] = [];
  const failed: string[] = [];

  // ponytail: sequential loop, no $transaction — the side effects in
  // applyRosterPatch touch Group/Team/Member, and an interactive transaction
  // would mean threading a tx client through all of it. No atomicity across
  // the batch; a partial failure is reported in `failed` instead of rolled back.
  for (const memberId of memberIds) {
    try {
      const { warning } = await applyRosterPatch(memberId, patch, { bumpToTop: false });
      ok++;
      if (warning) warnings.push(warning);
    } catch {
      failed.push(memberId);
    }
  }

  return NextResponse.json({ ok, warnings, failed });
}
