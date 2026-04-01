import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password, groupId } = await request.json();

    if (!username || !password || !groupId) {
      return NextResponse.json(
        { error: "모든 필드를 입력해주세요." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요." },
        { status: 409 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json(
        { error: "존재하지 않는 그룹입니다." },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        username,
        password: hashSync(password, 10),
        role: "LEADER",
        groupId,
      },
    });

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      groupId: user.groupId,
      teamId: user.teamId,
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

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
