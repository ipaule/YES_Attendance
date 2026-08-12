"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

interface Props {
  text: string;
  className?: string;
}

// Every explanation renders one sentence per line (split after ./!/?)
export function sentenceLines(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Small inline help affordance: tap-to-toggle (mobile) + hover-open (desktop) popover.
 * Built on Radix Popover so it portals out of any scrolling/clipped ancestor
 * (the attendance table's overflow-x-auto region, sticky columns, etc.) and
 * auto-flips/shifts to stay inside the viewport instead of getting cropped.
 */
export function HelpTip({ text, className = "" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <span
        className={`relative inline-flex items-center ${className}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            aria-label="도움말"
            aria-expanded={open}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-indigo-600"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            role="tooltip"
            side="top"
            align="center"
            sideOffset={6}
            collisionPadding={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-50 w-max max-w-[240px] rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs leading-snug text-white text-left shadow-lg whitespace-pre-line"
          >
            {sentenceLines(text)}
          </Popover.Content>
        </Popover.Portal>
      </span>
    </Popover.Root>
  );
}
