"use client";

import { useEffect, useId, useState } from "react";
import { Info } from "lucide-react";

interface Props {
  text: string;
  className?: string;
}

/**
 * Small inline help affordance: tap-to-toggle (mobile) + hover-open (desktop) popover.
 * Closes on click-outside or Escape.
 */
export function HelpTip({ text, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(`[data-helptip="${id}"]`)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, id]);

  return (
    <span
      data-helptip={id}
      className={`relative inline-flex items-center group ${className}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="도움말"
        aria-expanded={open}
        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-indigo-600"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className={`absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-[220px]
          rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg
          transition-opacity
          ${open ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100"}`}
      >
        {text}
      </span>
    </span>
  );
}
