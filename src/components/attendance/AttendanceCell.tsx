"use client";

import { useState, useRef, useEffect, memo } from "react";
import { Pencil } from "lucide-react";
import type { AttendanceStatus } from "@/types";

type CellStatus = AttendanceStatus | "";

interface AttendanceCellProps {
  status: CellStatus;
  awrReason: string | null;
  onChange: (status: AttendanceStatus | "", awrReason?: string) => void;
  locked?: boolean;
}

function AttendanceCellImpl({
  status,
  awrReason,
  onChange,
  locked,
}: AttendanceCellProps) {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState(awrReason || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showReasonInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showReasonInput]);

  useEffect(() => {
    if (!showReasonInput) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setShowReasonInput(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showReasonInput]);

  const handleClick = () => {
    if (locked) return;
    // Cycle: blank → O → X → △ → blank → O ...
    if (status === "HERE") {
      onChange("ABSENT");
    } else if (status === "ABSENT") {
      onChange("AWR");
    } else if (status === "AWR") {
      onChange("");
    } else {
      onChange("HERE");
    }
  };

  const handleReasonOpen = () => {
    setReason(awrReason || "");
    setShowReasonInput(true);
  };

  const handleReasonSubmit = () => {
    if (status === "ABSENT" || status === "AWR") {
      onChange(status, reason || undefined);
      setShowReasonInput(false);
    }
  };

  const handleReasonCancel = () => {
    setShowReasonInput(false);
    setReason(awrReason || "");
  };

  const getStatusIcon = () => {
    switch (status) {
      case "HERE":
        return <span className="text-green-600 font-bold text-lg">O</span>;
      case "ABSENT":
        return <span className="text-red-500 font-bold text-lg">X</span>;
      case "AWR":
        return <span className="text-yellow-500 font-bold text-lg">△</span>;
      default:
        return <span className="text-gray-300 text-lg">-</span>;
    }
  };

  const canHaveReason = status === "ABSENT" || status === "AWR";

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        onClick={handleClick}
        className={`w-11 h-11 flex items-center justify-center rounded-lg transition-colors ${locked ? "cursor-default opacity-60" : "hover:bg-gray-100 cursor-pointer"}`}
      >
        {getStatusIcon()}
      </button>

      {/* Reason affordance — tap to view/edit, since hover doesn't work on touch */}
      {canHaveReason && (
        <button
          onClick={handleReasonOpen}
          className="relative w-6 h-11 -ml-1 flex items-center justify-center text-gray-300 hover:text-gray-500"
        >
          <Pencil className="h-3 w-3" />
          {awrReason && (
            <span className="absolute top-2 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
          )}
        </button>
      )}

      {/* Reason Input (for both X and AWR); read-only when the date is locked */}
      {showReasonInput && canHaveReason && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-48">
          <p className="text-xs text-gray-500 mb-2">
            {status === "ABSENT" ? "결석" : "사유결석"} 사유 {locked ? "보기" : "입력"}
          </p>
          <input
            ref={inputRef}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={locked}
            onKeyDown={(e) => {
              if (locked) return;
              if (e.key === "Enter" && !e.nativeEvent.isComposing) handleReasonSubmit();
              if (e.key === "Escape") handleReasonCancel();
            }}
            placeholder="사유 (선택)"
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <div className="flex gap-1 mt-2">
            {locked ? (
              <button
                onClick={handleReasonCancel}
                className="flex-1 min-h-[44px] text-xs bg-gray-100 text-gray-600 rounded px-2 py-1 hover:bg-gray-200"
              >
                닫기
              </button>
            ) : (
              <>
                <button
                  onClick={handleReasonSubmit}
                  className="flex-1 min-h-[44px] text-xs bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-700"
                >
                  확인
                </button>
                <button
                  onClick={handleReasonCancel}
                  className="flex-1 min-h-[44px] text-xs bg-gray-100 text-gray-600 rounded px-2 py-1 hover:bg-gray-200"
                >
                  취소
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// `onChange` is intentionally excluded from the comparison: it's a closure
// captured per-cell over a stable (memberId, dateId) pair, so its identity
// changing across renders doesn't affect what this cell should render.
// Only status/awrReason/locked determine the visual output, and skipping
// re-renders when those are unchanged is what keeps a single tap from
// re-rendering every cell in the table.
export const AttendanceCell = memo(AttendanceCellImpl, (prev, next) => {
  return (
    prev.status === next.status &&
    prev.awrReason === next.awrReason &&
    prev.locked === next.locked
  );
});
