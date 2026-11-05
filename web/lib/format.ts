// Display helpers. Amounts arrive in whole cents and are only formatted here.

export function dollars(cents: number | null | undefined, showCents = false): string {
  if (cents === null || cents === undefined) return "—";
  const negative = cents < 0;
  const whole = Math.floor(Math.abs(cents) / 100);
  const rest = Math.abs(cents) % 100;
  let text = "$" + whole.toLocaleString("en-US");
  if (showCents || rest !== 0) {
    text += "." + String(rest).padStart(2, "0");
  }
  return negative ? "-" + text : text;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-11-19" -> "Nov 19". Dates are read as plain calendar days, no time zones.
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function longDate(iso: string): string {
  const [year] = iso.split("-");
  return `${shortDate(iso)}, ${year}`;
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
