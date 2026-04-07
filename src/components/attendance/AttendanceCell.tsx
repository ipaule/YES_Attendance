"use client";

import { useState, useRef, useEffect } from "react";
import type { AttendanceStatus } from "@/types";

type CellStatus = AttendanceStatus | "";

interface AttendanceCellProps {
  status: CellStatus;
  awrReason: string | null;
  onChange: (status: AttendanceStatus | "", awrReason?: string) => void;
  locked?: boolean;
}

export function AttendanceCell({
  status,
  awrReason,
  onChange,
  locked,
}: AttendanceCellProps) {
  const [showReasonInput, setShowReasonInput] = useState<"ABSENT" | "AWR" | null>(null);
  const [reason, setReason] = useState(awrReason || "");
  const [showTooltip, setShowTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showReasonInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showReasonInput]);

  const handleClick = () => {
    if (locked) return;
    // Cycle: blank → O → X(reason) → △(reason) → blank → O ...
    if (status === "HERE") {
      onChange("ABSENT");
      setReason("");
      setTimeout(() => setShowReasonInput("ABSENT"), 50);
    } else if (status === "ABSENT") {
      setShowReasonInput(null);
      onChange("AWR");
      setReason("");
      setTimeout(() => setShowReasonInput("AWR"), 50);
    } else if (status === "AWR") {
      setShowReasonInput(null);
      onChange("");
    } else {
      onChange("HERE");
    }
  };

  const handleReasonSubmit = () => {
    if (showReasonInput) {
      onChange(showReasonInput, reason || undefined);
      setShowReasonInput(null);
    }
  };

  const handleReasonCancel = () => {
    setShowReasonInput(null);
    setReason("");
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

  const hasReason = (status === "ABSENT" || status === "AWR") && awrReason;

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => hasReason && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${locked ? "cursor-default opacity-60" : "hover:bg-gray-100 cursor-pointer"}`}
      >
        {getStatusIcon()}
      </button>

      {/* Reason Tooltip (for both X and AWR) */}
      {showTooltip && awrReason && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
          {awrReason}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}

      {/* Reason Input (for both X and AWR) */}
      {showReasonInput && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-48">
          <p className="text-xs text-gray-500 mb-2">
            {showReasonInput === "ABSENT" ? "결석" : "사유결석"} 사유 입력
          </p>
          <input
            ref={inputRef}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleReasonSubmit();
              if (e.key === "Escape") handleReasonCancel();
            }}
            placeholder="사유 (선택)"
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex gap-1 mt-2">
            <button
              onClick={handleReasonSubmit}
              className="flex-1 text-xs bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-700"
            >
              확인
            </button>
            <button
              onClick={handleReasonCancel}
              className="flex-1 text-xs bg-gray-100 text-gray-600 rounded px-2 py-1 hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
