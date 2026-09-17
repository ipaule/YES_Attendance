import { useCallback, useSyncExternalStore } from "react";

// Drop-in replacement for useState that mirrors the value to sessionStorage
// under `key`, so navigating away (e.g. into a profile) and back restores
// exactly what was set — filters no longer silently clear on return. Same
// [value, setValue] shape as useState, so every existing `useState(...)`
// filter declaration becomes `useStickyState(key, ...)` with no other call
// site touched.
//
// Built on useSyncExternalStore (React's blessed way to read an external
// browser API like sessionStorage) rather than a useEffect that calls
// setState — the latter is flagged by this project's react-hooks/refs-style
// compiler rules (react-hooks/set-state-in-effect) and, worse, would cause a
// real hydration mismatch on a hard refresh: getServerSnapshot below is what
// makes SSR and the first client render agree instead.
//
// A per-key cache is required: useSyncExternalStore compares snapshots with
// Object.is, so getSnapshot must return the SAME reference when the
// underlying sessionStorage string hasn't changed, or every render would
// look like a change and loop.
const cache = new Map<string, { raw: string | null; value: unknown }>();
const listeners = new Map<string, Set<() => void>>();

function readRaw(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null; // private mode / blocked storage
  }
}

function getSnapshot<T>(key: string, initial: T): T {
  const raw = readRaw(key);
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T = initial;
  if (raw !== null) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = initial;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function writeValue<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write failures (private mode / quota)
  }
  notify(key);
}

export function useStickyState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(onStoreChange);
      return () => set!.delete(onStoreChange);
    },
    [key]
  );

  const value = useSyncExternalStore(
    subscribe,
    () => getSnapshot(key, initial),
    () => initial // server snapshot — SSR and the first client render agree
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(getSnapshot(key, initial)) : next;
      writeValue(key, resolved);
    },
    [key, initial]
  );

  return [value, setValue];
}
