"use client";

import { useState, memo } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, MessageSquare } from "lucide-react";

interface PrayerNoteCellProps {
  text: string;
  onChange: (text: string) => void;
  locked?: boolean;
}

function PrayerNoteCellImpl({ text, onChange, locked }: PrayerNoteCellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(text);

  // Popover reopens fresh each time — resync the draft to the latest saved
  // value (same pattern as AttendanceCell's reason field) rather than
  // whatever was left in state from the last open.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(text);
      setOpen(next);
      return;
    }
    // Closing (including outside-click, which Radix already treats as
    // "close") is a save trigger too, in addition to the explicit button.
    if (!locked && draft !== text) onChange(draft);
    setOpen(next);
  };

  const hasText = !!text.trim();

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={hasText ? text : "기도제목"}
          className={`w-6 h-11 flex items-center justify-center rounded-lg border transition-colors ${
            locked
              ? "cursor-default opacity-60 border-gray-200"
              : "cursor-pointer border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
          } ${hasText ? "bg-indigo-50 border-indigo-300 text-indigo-600" : "text-gray-300"}`}
        >
          <MessageSquare className="h-3.5 w-3.5" fill={hasText ? "currentColor" : "none"} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="center"
          sideOffset={4}
          className="z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64"
        >
          <p className="text-xs text-gray-500 mb-1">기도제목 {locked ? "보기" : "입력"}</p>
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={locked}
            placeholder="기도제목을 입력하세요"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(text);
                setOpen(false);
              }
              // Enter is allowed to insert a newline — auto-close only
              // happens on blur/outside-click, matching "click elsewhere".
              if (e.key === "Enter" && !e.nativeEvent.isComposing) e.stopPropagation();
            }}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <div className="flex justify-end mt-1">
            <button
              type="button"
              disabled={locked}
              onClick={() => handleOpenChange(false)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 p-1"
            >
              <Check className="h-4 w-4" />
              저장
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export const PrayerNoteCell = memo(PrayerNoteCellImpl, (prev, next) => {
  return prev.text === next.text && prev.locked === next.locked;
});
