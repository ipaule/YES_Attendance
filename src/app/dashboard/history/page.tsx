"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, FolderOpen, Pencil, Check, X, RotateCcw, CalendarPlus } from "lucide-react";

interface TermSummary {
  id: string;
  name: string;
  createdAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Date range state
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateResult, setDateResult] = useState<string | null>(null);

  // New term state
  const [showTermDialog, setShowTermDialog] = useState(false);
  const [termStep, setTermStep] = useState<1 | 2 | 3>(1);
  const [confirmText, setConfirmText] = useState("");
  const [termName, setTermName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["terms"],
    queryFn: async (): Promise<TermSummary[]> => {
      const res = await fetch("/api/terms");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.terms;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (termId: string) => {
      const res = await fetch(`/api/terms/${termId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["terms"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ termId, name }: { termId: string; name: string }) => {
      const res = await fetch(`/api/terms/${termId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["terms"] });
      setEditingId(null);
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
    onSuccess: (data) => { setDateResult(data.message); },
    onError: (error: Error) => { setDateResult(error.message); },
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">지난 텀 기록</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowDateRange(!showDateRange); setDateResult(null); }}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            <CalendarPlus className="h-4 w-4" />
            날짜 일괄 추가
          </button>
          <button
            onClick={handleNewTermClick}
            className="flex items-center gap-1.5 text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            새로운 텀 시작
          </button>
        </div>
      </div>

      {/* Date range form */}
      {showDateRange && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">일요일 날짜 일괄 추가</h3>
            <p className="text-xs text-gray-500">시작일부터 종료일까지의 모든 일요일을 믿음·소망·사랑 순에 추가합니다.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">시작일</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">종료일</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button onClick={() => { if (startDate && endDate) bulkDateMutation.mutate({ startDate, endDate }); }} disabled={!startDate || !endDate || bulkDateMutation.isPending} className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50">{bulkDateMutation.isPending ? "추가 중..." : "추가"}</button>
            <button onClick={() => { setShowDateRange(false); setDateResult(null); }} className="text-sm text-gray-500 hover:text-gray-700">닫기</button>
          </div>
          {dateResult && (
            <div className={`text-sm rounded-lg p-3 ${bulkDateMutation.isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{dateResult}</div>
          )}
        </div>
      )}

      {/* New term dialog */}
      {showTermDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            {termStep === 1 && (
              <>
                <h3 className="text-lg font-bold text-red-600">새로운 텀 시작</h3>
                <div className="bg-red-50 rounded-lg p-4 text-sm text-red-700 space-y-2">
                  <p className="font-semibold">이 작업은 되돌릴 수 없습니다!</p>
                  <p>현재 사랑·소망·믿음의 모든 데이터(순, 순원, 출석, 날짜)가<br />기록된 후 삭제됩니다.</p>
                  <p>모든 사랑·소망·믿음 순장의 계정정보가 삭제됩니다.</p>
                  <p>계속 섬기시는 순장님들은 새롭게 회원 가입을 해주세요.</p>
                </div>
                <p className="text-sm text-gray-600">정말 새로운 텀을 시작하시겠습니까?</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowTermDialog(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">취소</button>
                  <button onClick={() => setTermStep(2)} className="text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700">계속</button>
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
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && confirmText === "새로운 텀 시작") setTermStep(3); }}
                  placeholder="새로운 텀 시작"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowTermDialog(false); setTermStep(1); }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">취소</button>
                  <button onClick={() => setTermStep(3)} disabled={confirmText !== "새로운 텀 시작"} className="text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 disabled:opacity-50">계속</button>
                </div>
              </>
            )}
            {termStep === 3 && (
              <>
                <h3 className="text-lg font-bold text-red-600">텀 이름 입력</h3>
                <p className="text-sm text-gray-600">저장할 텀의 이름을 입력해주세요. (예: 2026년 봄텀)</p>
                <input
                  type="text"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && termName.trim()) newTermMutation.mutate(termName.trim()); }}
                  placeholder="텀 이름"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
                {newTermMutation.isError && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{(newTermMutation.error as Error).message}</div>
                )}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowTermDialog(false); setTermStep(1); }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">취소</button>
                  <button onClick={() => termName.trim() && newTermMutation.mutate(termName.trim())} disabled={!termName.trim() || newTermMutation.isPending} className="text-sm bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 disabled:opacity-50">
                    {newTermMutation.isPending ? "저장 중..." : "저장하고 새로 시작"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(!data || data.length === 0) ? (
        <div className="text-center py-12 text-gray-400">
          <p>저장된 텀 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((term) => (
            <div
              key={term.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all"
            >
              {editingId === term.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="h-5 w-5 text-amber-600" />
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editName.trim()) renameMutation.mutate({ termId: term.id, name: editName });
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 text-sm border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button onClick={() => editName.trim() && renameMutation.mutate({ termId: term.id, name: editName })} className="text-indigo-600 hover:text-indigo-800"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <>
                  <button onClick={() => router.push(`/dashboard/history/${term.id}`)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{term.name}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(term.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => { setEditingId(term.id); setEditName(term.name); }} className="text-gray-300 hover:text-indigo-500 transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { if (confirm(`"${term.name}" 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) deleteMutation.mutate(term.id); }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
