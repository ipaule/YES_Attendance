import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

interface TermMember {
  id: string;
  name: string;
  gender: string;
  birthYear: string;
  birthday?: string;
}

interface TermTeam {
  name: string;
  members: TermMember[];
}

interface TermSnapshot {
  teams: TermTeam[];
}

export interface TermSearchResult {
  name: string;
  gender: string;
  birthYear: string;
  birthday?: string;
  termId: string;
  termName: string;
  teamName: string;
  highlight: string;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  if (session.role !== "PASTOR") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const records = await prisma.termHistory.findMany({
    where: { type: "RECORD" },
    orderBy: { createdAt: "desc" },
  });

  const results: TermSearchResult[] = [];
  // ponytail: blobs are encrypted, so no DB-side filter is possible — every
  // query fully decrypts and JSON-parses every term snapshot (all teams and
  // members inside it). Fine at today's scale (dozens of rows); if it gets
  // slow, add a plaintext `names` index column populated on write.
  for (const record of records) {
    const snapshot = JSON.parse(record.data) as TermSnapshot;
    for (const team of snapshot.teams) {
      const matches = team.members
        .filter((m) => m.name.includes(q))
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));
      for (const m of matches) {
        results.push({
          name: m.name,
          gender: m.gender,
          birthYear: m.birthYear,
          birthday: m.birthday,
          termId: record.id,
          termName: record.name,
          teamName: team.name,
          highlight: m.id,
        });
      }
    }
  }

  return NextResponse.json({ results });
}
