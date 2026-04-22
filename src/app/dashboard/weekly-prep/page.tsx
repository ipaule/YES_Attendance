"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Copy, Check } from "lucide-react";
import { CareNotesPrintable } from "@/components/CareNotesPrintable";

interface BirthdayEntry {
  mmdd: string;
  name: string;
}
interface BirthdayResponse {
  rangeStart: string;
  rangeEnd: string;
  entries: BirthdayEntry[];
}

interface CareNoteRow {
  name: string;
  birthday: string;
  phone: string;
  photo: string;
  gender: string;
}
interface CareNoteTeam {
  teamId: string;
  teamName: string;
  groupName: string;
  groupColor: string;
  leader: CareNoteRow | null;
  members: CareNoteRow[];
  sundayLabel: string;
}

export default function WeeklyPrepPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [careTeams, setCareTeams] = useState<CareNoteTeam[] | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printTeamId, setPrintTeamId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyBirthdays = () => {
    if (!birthdays) return;
    const text = birthdays.entries.map((e) => `${e.mmdd} ${e.name}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const { data: birthdays, isLoading } = useQuery<BirthdayResponse>({
    queryKey: ["weekly-prep-birthdays"],
    queryFn: async () => {
      const res = await fetch("/api/weekly-prep/birthdays");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handlePrint = async (teamId: string | null) => {
    setPrinting(true);
    try {
      const data = await queryClient.fetchQuery<{ teams: CareNoteTeam[] }>({
        queryKey: ["weekly-prep-care-notes"],
        queryFn: async () => {
          const res = await fetch("/api/weekly-prep/care-notes");
          if (!res.ok) throw new Error("Failed to load care notes");
          return res.json();
        },
      });
      setCareTeams(data.teams);
      setPrintTeamId(teamId);
      // Wait for layout + image loads, then trigger print.
      await new Promise((resolve) => setTimeout(resolve, 400));
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  const { data: careNotesPreview } = useQuery<{ teams: CareNoteTeam[] }>({
    queryKey: ["weekly-prep-care-notes"],
    queryFn: async () => {
      const res = await fetch("/api/weekly-prep/care-notes");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });
  const teamOptions = careNotesPreview?.teams || [];

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">한주의 준비</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={printTeamId || ""}
            onChange={(e) => setPrintTeamId(e.target.value || null)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 max-w-[200px]"
          >
            <option value="">전체 순</option>
            {teamOptions.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.groupName} · {t.teamName}
              </option>
            ))}
          </select>
          <button
            onClick={() => handlePrint(printTeamId)}
            disabled={printing}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            {printing
              ? "준비 중..."
              : printTeamId
                ? "Print This Team"
                : "Print Care Notes"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-700">
            이번 주 생일
            {birthdays && (
              <span className="text-xs text-gray-400 font-normal ml-2">
                ({birthdays.rangeStart} ~ {birthdays.rangeEnd})
              </span>
            )}
          </h2>
          {birthdays && birthdays.entries.length > 0 && (
            <button
              onClick={handleCopyBirthdays}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "복사됨" : "복사"}
            </button>
          )}
        </div>
        {isLoading ? (
          <p className="text-sm text-gray-400">로딩 중...</p>
        ) : birthdays && birthdays.entries.length > 0 ? (
          <div className="mt-3 space-y-1 font-mono text-sm text-gray-800">
            {birthdays.entries.map((e, i) => (
              <div key={i}>
                {e.mmdd} {e.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mt-3">이번 주 생일이 없습니다.</p>
        )}
      </div>

      {careTeams && <CareNotesPrintable teams={careTeams} filterTeamId={printTeamId} />}
    </div>
  );
}
