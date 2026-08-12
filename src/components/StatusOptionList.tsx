"use client";

import type { AttendanceStatus } from "@/types";
import { STATUS_OPTIONS, type StatusOption } from "@/lib/attendance-status";

interface StatusOptionListProps {
  current: AttendanceStatus | "";
  onSelect: (value: AttendanceStatus | "") => void;
  disabled?: boolean;
  options?: StatusOption[];
  className?: string;
}

// Renders the shared label-button set for picking an attendance status.
// Used inline (mobile row) and inside the desktop popover — same component,
// different layout via `className` and a different `options` subset.
export function StatusOptionList({
  current,
  onSelect,
  disabled = false,
  options = STATUS_OPTIONS,
  className = "flex gap-1.5",
}: StatusOptionListProps) {
  return (
    <div className={className}>
      {options.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value || "blank"}
            type="button"
            onClick={() => onSelect(opt.value)}
            disabled={disabled}
            className={`flex-1 min-h-[44px] text-xs font-medium rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-default ${
              active ? opt.activeClass : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
