"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  disabled = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const allSelected = options.length > 0 && options.every((o) => selected.includes(o.value));
  const triggerLabel = selected.length === 0 ? label : `${label} (${selected.length})`;

  if (disabled) {
    return (
      <button
        disabled
        className={`text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-300 bg-gray-50 flex items-center gap-1 ${className}`}
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`text-xs border rounded-lg px-2 py-1.5 flex items-center gap-1 whitespace-nowrap ${
          selected.length > 0
            ? "border-indigo-400 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            : "border-gray-300 text-gray-700 hover:border-gray-400"
        }`}
      >
        {triggerLabel}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[140px] max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => onChange(allSelected ? [] : options.map((o) => o.value))}
            className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-500 border-b border-gray-100"
          >
            {allSelected ? "선택 해제" : "전체 선택"}
          </button>
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
