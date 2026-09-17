"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson, HttpError } from "@/lib/http";
import { useStickyState } from "@/hooks/useStickyState";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function useHistorySearch<T>(key: string, searchUrl: string) {
  // Sticky so navigating into a result and back (or a refresh) keeps the
  // query — same rule as every other list's filter. `query` (the debounced,
  // fetch-triggering value) is intentionally plain state: it re-derives from
  // `input` a moment after mount instead of being persisted itself.
  const [input, setInput] = useStickyState(`${key}-query`, "");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const searching = query.length >= MIN_QUERY_LENGTH;

  const { data, isLoading, error } = useQuery({
    queryKey: [key, query],
    queryFn: () => fetchJson<{ results: T[] }>(`${searchUrl}${encodeURIComponent(query)}`),
    enabled: searching,
  });

  return {
    input,
    setInput,
    query,
    results: data?.results ?? [],
    isLoading,
    error: error as HttpError | null,
    searching,
  };
}
