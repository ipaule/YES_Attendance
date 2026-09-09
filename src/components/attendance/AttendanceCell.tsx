"use client";

import { useRef, useState, memo } from "react";
import * as Popover from "@radix-ui/react-popover";
import type { AttendanceStatus } from "@/types";
import { statusOption } from "@/lib/attendance-status";
import { StatusOptionList } from "@/components/StatusOptionList";
import { HelpTip } from "@/components/HelpTip";
import { helpAnswer } from "@/content/help";

type CellStatus = AttendanceStatus | "";

interface AttendanceCellProps {
  status: CellStatus;
  awrReason: string | null;
  onChange: (status: AttendanceStatus | "", awrReason?: string) => void;
  locked?: boolean;
}

function AttendanceCellImpl({ status, awrReason, onChange, locked }: AttendanceCellProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(awrReason || "");
  const reasonInputRef = useRef<HTMLInputElement>(null);

  // Popover reopens fresh each time — resync the draft reason to the latest
  // saved value rather than whatever was left over from the last open.
  const handleOpenChange = (next: boolean) => {
    if (next) setReason(awrReason || "");
    setOpen(next);
  };

  const canHaveReason = status === "ABSENT" || status === "AWR";
  const missingReason = status === "AWR" && !awrReason;
  const hasReason = canHaveReason && !!awrReason;
  const { glyph, colorClass } = statusOption(status);

  // Explicit selection replaces the old cycle-through-click model. Every
  // call passes the current reason explicitly (never omitted), which is
  // what actually fixes A3 — the old bug was a call site that forgot the
  // second argument, not something a "don't forget it" comment can prevent.
  const handleSelect = (next: AttendanceStatus | "") => {
    if (locked) return;
    onChange(next, reason || undefined);
    if (next === "ABSENT" || next === "AWR") {
      requestAnimationFrame(() => reasonInputRef.current?.focus());
    } else {
      setOpen(false);
    }
  };

  const commitReasonIfChanged = () => {
    if (locked || !canHaveReason) return;
    if (reason !== (awrReason || "")) onChange(status, reason || undefined);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`relative w-11 h-11 flex flex-col items-center justify-center rounded-lg transition-colors ${
            locked ? "cursor-default opacity-60" : "hover:bg-gray-100 cursor-pointer"
          }`}
        >
          <span className={`font-bold text-lg leading-none ${colorClass}`}>{glyph}</span>
          {hasReason && (
            <span
              className="w-full px-0.5 text-[8px] leading-tight text-gray-500 truncate"
              title={awrReason ?? undefined}
            >
              {awrReason}
            </span>
          )}
          {missingReason && (
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500"
              title="사유결석 사유 없음"
            />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="center"
          sideOffset={4}
          className="z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-52"
        >
          <StatusOptionList
            current={status}
            disabled={locked}
            onSelect={handleSelect}
            className="grid grid-cols-2 gap-1.5"
          />
          {canHaveReason && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                {status === "ABSENT" ? "결석" : "사유결석"} 사유 {locked ? "보기" : "입력"}
                {!locked && <HelpTip text={helpAnswer("a6")} />}
              </p>
              <input
                ref={reasonInputRef}
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={locked}
                onBlur={commitReasonIfChanged}
                onKeyDown={(e) => {
                  if (locked) return;
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    commitReasonIfChanged();
                    setOpen(false);
                  }
                  if (e.key === "Escape") {
                    setReason(awrReason || "");
                    setOpen(false);
                  }
                }}
                placeholder="사유 (선택)"
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
