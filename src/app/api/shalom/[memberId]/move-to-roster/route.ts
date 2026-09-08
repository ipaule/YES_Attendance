import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";
import { moveShalomMemberToRoster, ShalomMutationError } from "@/lib/shalom-mutations";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!(await canAccessShalom(session))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { memberId } = await params;

  try {
    const roster = await moveShalomMemberToRoster(memberId);
    return NextResponse.json({ roster });
  } catch (e) {
    if (e instanceof ShalomMutationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
