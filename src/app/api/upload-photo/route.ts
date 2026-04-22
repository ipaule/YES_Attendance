import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN이 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId") || "anon";
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "파일 크기는 2MB 이하여야 합니다." },
      { status: 413 },
    );
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "파일 크기는 2MB 이하여야 합니다." },
      { status: 413 },
    );
  }

  const pathname = `roster-photos/${memberId}-${Date.now()}.jpg`;
  const blob = await put(pathname, body, {
    access: "public",
    contentType: "image/jpeg",
    token,
  });

  return NextResponse.json({ url: blob.url });
}
