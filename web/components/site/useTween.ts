"use client";

import { useEffect, useRef, useState } from "react";

// A number that eases toward `target` whenever the target changes, so figures roll
// instead of jumping. When `restart` changes, it starts again from `startFrom`.
export function useTween(target: number, duration = 750, restart: unknown = null, startFrom = 0) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const lastRestart = useRef(restart);

  useEffect(() => {
    let from = current.current;
    if (restart !== lastRestart.current) {
      lastRestart.current = restart;
      from = startFrom;
    }
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const value = from + (target - from) * (1 - Math.pow(1 - t, 3));
      current.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, restart, startFrom]);

  return shown;
}

export function money(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}
