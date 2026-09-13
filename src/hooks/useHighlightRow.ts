"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function useHighlightRow(readySignal?: unknown) {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");

  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`row-${highlight}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight, readySignal]);

  const isHighlighted = (id: string, name?: string): boolean =>
    !!highlight && (highlight === id || (!!name && highlight === `name:${name}`));

  return { highlight, isHighlighted };
}
