"use client";

import { Search } from "lucide-react";
import type { HttpError } from "@/lib/http";

interface HistorySearchBoxProps<T> {
  input: string;
  onInputChange: (value: string) => void;
  searching: boolean;
  isLoading: boolean;
  error: HttpError | null;
  results: T[];
  renderRow: (result: T, index: number) => React.ReactNode;
  placeholder?: string;
}

export function HistorySearchBox<T>({
  input,
  onInputChange,
  searching,
  isLoading,
  error,
  results,
  renderRow,
  placeholder = "이름 검색...",
}: HistorySearchBoxProps<T>) {
  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-1.5">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          className="text-sm border-0 focus:outline-none flex-1"
        />
      </div>

      {searching && (
        <>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500"><p>검색 중...</p></div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error.message}</div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p>검색 결과가 없습니다.</p></div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 px-1">{results.length}명 찾음</p>
              {results.map((r, i) => renderRow(r, i))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
