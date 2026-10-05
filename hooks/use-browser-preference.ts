"use client";
import { useCallback, useSyncExternalStore } from "react";
const changeEvent = "anbu-preference-change";
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(changeEvent, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(changeEvent, notify);
  };
}
export function useBrowserPreference(
  key: string,
  fallback: string | null = null,
) {
  const read = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);
  const server = useCallback(() => fallback, [fallback]);
  const value = useSyncExternalStore(subscribe, read, server);
  const write = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(key, next);
        window.dispatchEvent(new Event(changeEvent));
      } catch {}
    },
    [key],
  );
  return [value, write] as const;
}
