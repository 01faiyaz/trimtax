"use client";

import { useEffect, useState } from "react";

// The story site counts down to the real Dec 31, using the visitor's own clock.
// The app itself stays on the demo date (Nov 19), where it says so.
// Scenes that show Tidewell's numbers use the demo date too, so a Nov 13 receipt
// never shows up before Nov 13.

const YEAR = 2026;
export const DEMO_DATE = new Date(2026, 10, 19, 9, 41);
const DAY = 86_400_000;

// The current time, refreshed every `every` milliseconds. Null until the page is in the
// browser: the server can't know the visitor's date, so it leaves these numbers blank.
export function useNow(every = 60_000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const clock = setInterval(tick, every);
    return () => {
      clearTimeout(first);
      clearInterval(clock);
    };
  }, [every]);
  return now;
}

// Days already gone this year, not counting today. Jan 1 is 0, Nov 19 is 322.
export function daysGone(now: Date) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.min(365, Math.max(0, Math.round((today - Date.UTC(YEAR, 0, 1)) / DAY)));
}

// Days between today and Dec 31. Nov 19 gives 42, Dec 31 gives 0.
export function daysLeft(now: Date) {
  return Math.max(0, 364 - daysGone(now));
}

export function daysLeftText(now: Date) {
  const left = daysLeft(now);
  return left === 1 ? "1 day left" : `${left} days left`;
}

// Share of the year gone, to the second, as a percent.
export function percentGone(now: Date) {
  const gone = (now.getTime() - new Date(YEAR, 0, 1).getTime()) / (365 * DAY);
  return Math.min(100, Math.max(0, gone * 100));
}
