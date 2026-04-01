"use client";

import { useState, useRef, useEffect } from "react";
import type { AttendanceStatus } from "@/types";

type CellStatus = AttendanceStatus | "";

interface AttendanceCellProps {
  status: CellStatus;
  awrReason: string | null;
  onChange: (status: AttendanceStatus, awrReason?: string) => void;
}

export function AttendanceCell({
  status,
  awrReason,
  onChange,
}: AttendanceCellProps) {
  const [showAwrInput, setShowAwrInput] = useState(false);
  const [reason, setReason] = useState(awrReason || "");
  const [showTooltip, setShowTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAwrInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAwrInput]);

  const handleClick = () => {
    // Cycle: blank → O → X → AWR → O
    if (status === "HERE") {
      onChange("ABSENT");
    } else if (status === "ABSENT") {
      setShowAwrInput(true);
    } else if (status === "AWR") {
      onChange("HERE");
    } else {
      // blank/default → O
      onChange("HERE");
    }
  };

  const handleAwrSubmit = () => {
    onChange("AWR", reason);
    setShowAwrInput(false);
  };

  const handleAwrCancel = () => {
    setShowAwrInput(false);
    setReason(awrReason || "");
    // Skip AWR, go back to O
    onChange("HERE");
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

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => status === "AWR" && awrReason && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      >
        {getStatusIcon()}
      </button>

      {/* AWR Tooltip */}
      {showTooltip && awrReason && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
          {awrReason}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}

      {/* AWR Reason Input */}
      {showAwrInput && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-48">
          <p className="text-xs text-gray-500 mb-2">사유 입력</p>
          <input
            ref={inputRef}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAwrSubmit();
              if (e.key === "Escape") handleAwrCancel();
            }}
            placeholder="사유를 입력하세요"
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex gap-1 mt-2">
            <button
              onClick={handleAwrSubmit}
              className="flex-1 text-xs bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-700"
            >
              확인
            </button>
            <button
              onClick={handleAwrCancel}
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
