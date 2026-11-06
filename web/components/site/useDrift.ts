"use client";

import { useEffect, useState } from "react";

// Seconds since mount, updated about 30 times a second, for things that drift slowly.
// Stays at 0 for visitors who turn on reduced motion.
export function useDrift() {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const started = performance.now();
    let last = 0;
    let frame = 0;
    const step = (now: number) => {
      if (now - last > 33) {
        last = now;
        setT((now - started) / 1000);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);
  return t;
}
