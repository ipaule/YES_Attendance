import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessShalom } from "@/lib/permissions";

interface ShalomRecord {
  id?: string;
  name: string;
  gender: string;
  birthYear: string;
}

export interface ShalomSearchResult {
  name: string;
  gender: string;
  birthYear: string;
  folderId: string;
  folderName: string;
  highlight: string;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const hasAccess = await canAccessShalom(session);
  if (!hasAccess) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const folders = await prisma.shalomHistory.findMany({
    orderBy: { order: "asc" },
  });

  const results: ShalomSearchResult[] = [];
  // ponytail: blobs are encrypted, so no DB-side filter is possible — every
  // query fully decrypts and JSON-parses every folder's data column. Fine at
  // today's scale (dozens of rows); if it gets slow, add a plaintext `names`
  // index column populated on write.
  for (const folder of folders) {
    const people = JSON.parse(folder.data) as ShalomRecord[];
    const matches = people
      .filter((p) => p.name.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    for (const p of matches) {
      results.push({
        name: p.name,
        gender: p.gender,
        birthYear: p.birthYear,
        folderId: folder.id,
        folderName: folder.name,
        // Row ids in shalom blobs aren't always stable (the detail route
        // backfills a missing id with crypto.randomUUID() per request and
        // never persists it), so fall back to a name-based highlight key.
        highlight: p.id ? p.id : `name:${p.name}`,
      });
    }
  }

  return NextResponse.json({ results });
}
