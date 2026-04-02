"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, BarChart3, CalendarPlus, RotateCcw, ClipboardList, Settings, History, TrendingUp } from "lucide-react";
import type { Group } from "@/types";

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState<string | null>(null);

  // New term state
  const [showTermDialog, setShowTermDialog] = useState(false);
  const [termStep, setTermStep] = useState<1 | 2 | 3>(1);
  const [confirmText, setConfirmText] = useState("");
  const [termName, setTermName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async (): Promise<Group[]> => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      return data.groups;
    },
  });

  const bulkDateMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      const res = await fetch("/api/dates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      return data;
    },
    onSuccess: (data) => {
      setResult(data.message);
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      setResult(error.message);
    },
  });

  const newTermMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      return data;
    },
    onSuccess: () => {
      setShowTermDialog(false);
      setTermStep(1);
      setTermName("");
      queryClient.invalidateQueries();
      router.refresh();
    },
  });

  const handleNewTermClick = () => {
    setShowTermDialog(true);
    setTermStep(1);
    setConfirmText("");
    setTermName("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">공동체 관리</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewTermClick}
            className="flex items-center gap-1.5 text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            새로운 텀 시작
          </button>
          <button
            onClick={() => {
              setShowDateRange(!showDateRange);
              setResult(null);
            }}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            <CalendarPlus className="h-4 w-4" />
            날짜 일괄 추가
          </button>
        </div>
      </div>

      {/* New term dialog */}
      {showTermDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            {termStep === 1 && (
              <>
                <h3 className="text-lg font-bold text-red-600">새로운 텀 시작</h3>
                <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700 space-y-2">
                  <p className="font-semibold">이 작업은 되돌릴 수 없습니다!</p>
                  <p>현재 사랑·소망·믿음의 모든 데이터(순, 순원, 출석, 날짜)가 히스토리에 저장된 후 삭제됩니다.</p>
                  <p>모든 사용자 계정(AJ 제외)이 삭제됩니다.</p>
                </div>
                <p className="text-sm text-gray-600">정말 새로운 텀을 시작하시겠습니까?</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowTermDialog(false)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setTermStep(2)}
                    className="text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700"
                  >
                    계속
                  </button>
                </div>
              </>
            )}
            {termStep === 2 && (
              <>
                <h3 className="text-lg font-bold text-red-600">확인</h3>
                <p className="text-sm text-gray-600">
                  확인을 위해 아래에 <span className="font-bold text-red-600">새로운 텀 시작</span>을 입력해주세요.
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && confirmText === "새로운 텀 시작") setTermStep(3);
                  }}
                  placeholder="새로운 텀 시작"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowTermDialog(false); setTermStep(1); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setTermStep(3)}
                    disabled={confirmText !== "새로운 텀 시작"}
                    className="text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 disabled:opacity-50"
                  >
                    계속
                  </button>
                </div>
              </>
            )}
            {termStep === 3 && (
              <>
                <h3 className="text-lg font-bold text-red-600">텀 이름 입력</h3>
                <p className="text-sm text-gray-600">
                  저장할 텀의 이름을 입력해주세요. (예: 2026년 1학기)
                </p>
                <input
                  type="text"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && termName.trim()) newTermMutation.mutate(termName.trim());
                  }}
                  placeholder="텀 이름"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
                {newTermMutation.isError && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
                    {(newTermMutation.error as Error).message}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowTermDialog(false); setTermStep(1); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => termName.trim() && newTermMutation.mutate(termName.trim())}
                    disabled={!termName.trim() || newTermMutation.isPending}
                    className="text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 disabled:opacity-50"
                  >
                    {newTermMutation.isPending ? "저장 중..." : "저장하고 새로 시작"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showDateRange && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">일요일 날짜 일괄 추가</h3>
            <p className="text-xs text-gray-500">
              시작일부터 종료일까지의 모든 일요일을 사랑·소망·믿음 순에 추가합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => {
                if (startDate && endDate) {
                  bulkDateMutation.mutate({ startDate, endDate });
                }
              }}
              disabled={!startDate || !endDate || bulkDateMutation.isPending}
              className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {bulkDateMutation.isPending ? "추가 중..." : "추가"}
            </button>
            <button
              onClick={() => {
                setShowDateRange(false);
                setResult(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              닫기
            </button>
          </div>

          {result && (
            <div className={`text-sm rounded-lg p-3 ${
              bulkDateMutation.isError
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}>
              {result}
            </div>
          )}
        </div>
      )}

      {/* 공동체 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">공동체</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.filter((g) => g.name !== "샬롬").map((group) => (
            <Link key={`g-${group.id}`} href={`/dashboard/group/${group.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0"><FolderOpen className="h-4 w-4 text-indigo-600" /></div>
              <div><h3 className="font-semibold text-sm text-gray-800">{group.name} 현황</h3></div>
            </Link>
          ))}
        </div>
      </div>

      {/* 샬롬 */}
      {(() => {
        const shalom = data?.find((g) => g.name === "샬롬");
        if (!shalom) return null;
        return (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">샬롬</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link href={`/dashboard/group/${shalom.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0"><FolderOpen className="h-4 w-4 text-indigo-600" /></div>
                <div><h3 className="font-semibold text-sm text-gray-800">샬롬 현황</h3></div>
              </Link>
              <Link href="/dashboard/shalom"
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-amber-300 hover:shadow-md transition-all flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0"><ClipboardList className="h-4 w-4 text-amber-600" /></div>
                <div><h3 className="font-semibold text-sm text-gray-800">샬롬 리스트</h3></div>
              </Link>
              <Link href="/dashboard/graphs/shalom"
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
                <div><h3 className="font-semibold text-sm text-gray-800">샬롬 그래프</h3></div>
              </Link>
            </div>
          </div>
        );
      })()}

      {/* 전체 관리 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">전체 관리</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/dashboard/graphs/combined"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0"><BarChart3 className="h-4 w-4 text-emerald-600" /></div>
            <div><h3 className="font-semibold text-sm text-gray-800">합산 그래프</h3></div>
          </Link>
          <Link href="/dashboard/roster"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-purple-300 hover:shadow-md transition-all flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0"><ClipboardList className="h-4 w-4 text-purple-600" /></div>
            <div><h3 className="font-semibold text-sm text-gray-800">전체 리스트</h3></div>
          </Link>
          <Link href="/dashboard/admin"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><Settings className="h-4 w-4 text-gray-600" /></div>
            <div><h3 className="font-semibold text-sm text-gray-800">리더쉽 관리</h3></div>
          </Link>
        </div>
      </div>

      {/* 기록 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">기록</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/dashboard/history"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><History className="h-4 w-4 text-gray-600" /></div>
            <div><h3 className="font-semibold text-sm text-gray-800">지난 텀 기록</h3></div>
          </Link>
          <Link href="/dashboard/shalom/history"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><History className="h-4 w-4 text-gray-600" /></div>
            <div><h3 className="font-semibold text-sm text-gray-800">샬롬 기록</h3></div>
          </Link>
        </div>
      </div>
    </div>
  );
}
