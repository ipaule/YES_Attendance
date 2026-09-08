import { NextRequest, NextResponse } from "next/server";
import { compareSync } from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password, persist } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "이름와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "가입된 계정이 없습니다. 회원가입 후 이용해주세요." },
        { status: 404 }
      );
    }

    if (!compareSync(password, user.password)) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // Trust boundary: only an explicit boolean counts. A client sending
    // "false" (string), null, or nothing gets the default-ON behavior, never
    // a silent downgrade of the user's actual intent.
    const remember = typeof persist === "boolean" ? persist : true;

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      groupId: user.groupId,
      teamId: user.teamId,
      tokenVersion: user.tokenVersion,
      loginAt: Math.floor(Date.now() / 1000),
      persist: remember,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        groupId: user.groupId,
        teamId: user.teamId,
      },
    });

    setAuthCookie(response, token, remember);

    return response;
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
