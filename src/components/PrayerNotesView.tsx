"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PrayerNoteTeam } from "@/lib/prayer-notes-query";

interface PrayerNotesViewProps {
  heading: string;
  teams: PrayerNoteTeam[];
  isLoading: boolean;
  error: unknown;
  /** Group page and 한 주의 준비 show a heading per team (and per group on
   * the 한 주의 준비 rollup); the team page itself doesn't need to repeat
   * its own name as a sub-heading. */
  showTeamHeadings?: boolean;
  showGroupHeadings?: boolean;
}

// Shared by all three 기도제목 pages (team/group/한 주의 준비) — each is
// just this view fed a different scope of `teams` from GET /api/prayer-notes.
// Every member is listed (item 5's "매 개인" requirement), "—" when they
// have no notes, one line per dated note, ordered by date (the query already
// sorts). break-inside-avoid keeps one person's block from splitting across
// a printed page.
export function PrayerNotesView({
  heading,
  teams,
  isLoading,
  error,
  showTeamHeadings,
  showGroupHeadings,
}: PrayerNotesViewProps) {
  const router = useRouter();

  // Pure per-render computation (no mutable variable captured across the
  // map callback) of which teams start a new group section.
  const startsNewGroup = teams.map(
    (t, i) => showGroupHeadings && (i === 0 || t.groupName !== teams[i - 1].groupName)
  );

  return (
    <div className="max-w-4xl mx-auto pb-20 lg:pb-4">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{heading}</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" />
          인쇄
        </button>
      </div>

      <h1 className="hidden print:block text-lg font-bold mb-4">{heading}</h1>

      {isLoading && <div className="text-center py-12 text-gray-400 print:hidden">불러오는 중...</div>}
      {!!error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 print:hidden">
          불러오는 중 오류가 발생했습니다.
        </div>
      )}
      {!isLoading && !error && teams.length === 0 && (
        <div className="text-center py-12 text-gray-400 print:hidden">팀이 없습니다.</div>
      )}

      <div className="space-y-6">
        {teams.map((team, i) => {
          const groupHeading = startsNewGroup[i];
          return (
            <div key={team.teamId}>
              {groupHeading && (
                <h2 className="text-base font-bold text-gray-800 mt-6 mb-2 first:mt-0 break-inside-avoid">
                  {team.groupName}
                </h2>
              )}
              {showTeamHeadings && (
                <h3 className="text-sm font-semibold text-gray-600 mb-2 break-inside-avoid">
                  {team.teamName}
                </h3>
              )}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100 print:border-0 print:shadow-none print:rounded-none">
                {team.members.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400">순원이 없습니다.</div>
                )}
                {team.members.map((m) => (
                  <div key={m.id} className="flex gap-4 px-4 py-3 break-inside-avoid">
                    <div className="w-20 shrink-0 text-sm font-medium text-gray-800">{m.name}</div>
                    <div className="flex-1 min-w-0 text-sm text-gray-700 space-y-0.5">
                      {m.notes.length === 0 ? (
                        <div className="text-gray-400">—</div>
                      ) : (
                        m.notes.map((n, i) => (
                          <div key={i}>
                            <span className="text-gray-400">{n.label}</span> — {n.text}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: Letter portrait;
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}
