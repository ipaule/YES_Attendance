import { NextResponse } from "next/server";
import { getSession, signToken, setAuthCookie, clearAuthCookie, RENEW_AFTER } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      role: true,
      groupId: true,
      teamId: true,
      tokenVersion: true,
      group: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    const res = NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    clearAuthCookie(res); // deleted account: stop re-presenting a dead cookie
    return res;
  }

  // Revocation. Bumped on password change and on PASTOR role/group edits.
  // ponytail: Edge middleware has no DB, so this lands on the next /me (page
  // mount), not the next arbitrary API call. Upgrade path if that window ever
  // matters: a short-TTL token + refresh, not a Session table.
  if (user.tokenVersion !== (session.tokenVersion ?? 0)) {
    const res = NextResponse.json({ error: "다시 로그인해주세요." }, { status: 401 });
    clearAuthCookie(res);
    return res;
  }

  const response = NextResponse.json({ user });

  // Sliding renewal, throttled to once/day — useAuth fires this on every page
  // mount (multiple times per dashboard load), so re-signing every call would
  // needlessly re-sign and re-set-cookie several times per page view for a
  // window that's 30 days wide. Also re-signs immediately on a teamId change
  // (team-leader assignment) since canAccessTeam reads teamId from the JWT.
  const now = Math.floor(Date.now() / 1000);
  if (now - (session.iat ?? 0) > RENEW_AFTER || user.teamId !== session.teamId) {
    const persist = session.persist ?? true; // legacy tokens predate the choice
    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      groupId: user.groupId,
      teamId: user.teamId,
      tokenVersion: user.tokenVersion,
      loginAt: session.loginAt ?? now, // never reset — that would defeat the 90d cap
      persist,
    });
    setAuthCookie(response, token, persist);
  }

  return response;
}
