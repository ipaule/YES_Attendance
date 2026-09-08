"use client";

import { useRef, useState } from "react";

/** Inclusive slice between indices a and b, regardless of order. */
export function rangeSlice(ids: string[], a: number, b: number): string[] {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return ids.slice(lo, hi + 1);
}

// Shared checkbox-selection + shift-click-range logic for 재적 / 미등록자 /
// 샬롬 / 샬롬 히스토리. `ids` is the currently visible list, in display order —
// selection derives from it every render, so a filter change or a delete
// silently drops stale ids with nothing to sync.
export function useRowSelection(ids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Read only inside toggle (an event handler), never during render.
  const anchorRef = useRef<number | null>(null);

  const toggle = (index: number, shiftKey: boolean) => {
    const id = ids[index];
    if (id === undefined) return;

    if (shiftKey && anchorRef.current !== null) {
      const range = rangeSlice(ids, anchorRef.current, index);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const rid of range) next.add(rid);
        return next;
      });
      anchorRef.current = index;
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    anchorRef.current = index;
  };

  const toggleAll = () => {
    setSelected((prev) => (ids.length > 0 && prev.size === ids.length ? new Set() : new Set(ids)));
  };

  const clear = () => setSelected(new Set());

  const selectedIds = ids.filter((id) => selected.has(id));
  const allSelected = ids.length > 0 && selectedIds.length === ids.length;

  const targetsFor = (id: string): string[] =>
    selected.has(id) && selectedIds.length > 1 ? selectedIds : [id];

  return {
    selected,
    selectedIds,
    isSelected: (id: string) => selected.has(id),
    toggle,
    toggleAll,
    clear,
    allSelected,
    targetsFor,
  };
}
