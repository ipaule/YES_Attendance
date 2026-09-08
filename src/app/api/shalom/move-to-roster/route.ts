import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";
import { moveShalomMemberToRoster, ShalomMutationError } from "@/lib/shalom-mutations";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!(await canAccessShalom(session))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberIds } = await request.json();
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let ok = 0;
  const failed: { id: string; error: string }[] = [];

  // ponytail: sequential loop — each move is already its own atomic
  // transaction; batching those into one would mean threading a shared tx
  // client through moveShalomMemberToRoster. Ineligible rows land in `failed`
  // with the reason instead of being silently dropped.
  for (const memberId of memberIds) {
    try {
      await moveShalomMemberToRoster(memberId);
      ok++;
    } catch (e) {
      failed.push({ id: memberId, error: e instanceof ShalomMutationError ? e.message : "이동 실패" });
    }
  }

  return NextResponse.json({ ok, failed });
}
