"use client";

import { useSyncExternalStore } from "react";

// True on phone-sized screens, where the wide scenes switch to a stacked layout.
// The server always renders the wide layout; phones switch right after loading.
const QUERY = "(max-width: 700px)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

export function useNarrow() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
