"use client";

// The year as a clock: one tick per day, light for days gone, dark for days left.
// "Today" is the visitor's real date. Ported from the design canvas.

import { daysGone, daysLeft, useNow } from "./useToday";

const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const PURCHASES = [61, 168, 251]; // equipment bought in March, June and September
const PLANNED = 343; // the laptops, in use by Dec 10
const CENTER = 210;

// Rounded to one decimal so the server and the browser draw exactly the same numbers.
function point(day: number, radius: number) {
  const angle = (day / 365) * 2 * Math.PI - Math.PI / 2;
  const round = (n: number) => Math.round(n * 10) / 10;
  return { x: round(CENTER + radius * Math.cos(angle)), y: round(CENTER + radius * Math.sin(angle)) };
}

export default function YearRing({ showPlanned = false }: { showPlanned?: boolean }) {
  const now = useNow();
  // Until the browser knows the date, every day is drawn as still to come.
  const today = now ? daysGone(now) : 0;
  const left = now ? daysLeft(now) : null;
  const todayText = now ? now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  const ticks = [];
  for (let day = 0; day < 365; day++) {
    const past = now !== null && day < today;
    const inner = point(day, 132);
    const outer = point(day, MONTH_STARTS.includes(day) ? 166 : 158);
    ticks.push(
      <line key={day} className="tick" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
        stroke={past ? "#c3c7cb" : "#26292c"} strokeWidth={past ? 1.2 : 2.2} strokeLinecap="round"
        style={{ animationDelay: `${day * 3}ms` }} />,
    );
  }

  const start = point(today, 192);
  const end = point(364.5, 192);
  const todayInner = point(today, 118);
  const todayOuter = point(today, 172);
  const todayLabel = point(today, 104);
  const marks = PURCHASES.map((day) => ({ ...point(day, 120), fill: "#26292c", stroke: "#26292c" }));
  if (showPlanned) marks.push({ ...point(PLANNED, 120), fill: "#f2f3f1", stroke: "#2c5ba0" });

  return (
    <div style={{ position: "relative", width: 420, height: 420 }}>
      <svg width="420" height="420" viewBox="0 0 420 420" role="img"
        aria-label={`2026 tax year: ${left === null ? "" : `${today} days gone, ${left} days left before the Dec 31 cutoff. `}Equipment bought in March, June and September.`}>
        {ticks}
        {"JFMAMJJASOND".split("").map((letter, i) => {
          const p = point(MONTH_STARTS[i] + 14, 180);
          return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#61666b">{letter}</text>;
        })}
        <line x1="210" y1={CENTER - 190} x2="210" y2={CENTER - 118} stroke="#26292c" strokeWidth="3" />
        <text x="218" y="26" textAnchor="start" fontSize="11" fontWeight="600" fill="#26292c">Dec 31 cutoff</text>
        {now && <path className="bracket" d={`M ${start.x} ${start.y} A 192 192 0 0 1 ${end.x} ${end.y}`} pathLength={1}
          fill="none" stroke="#2c5ba0" strokeWidth="2" strokeLinecap="round" />}
        {now && <line x1={todayInner.x} y1={todayInner.y} x2={todayOuter.x} y2={todayOuter.y} stroke="#2c5ba0" strokeWidth="3" strokeLinecap="round" />}
        {now && <text x={todayLabel.x} y={todayLabel.y} textAnchor="start" fontSize="12" fontWeight="600" fill="#2c5ba0">{todayText}</text>}
        {marks.map((m, i) => <circle key={i} cx={m.x} cy={m.y} r="4.5" fill={m.fill} stroke={m.stroke} strokeWidth="2" />)}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <p className="mono" style={{ margin: 0, fontSize: 88, lineHeight: "84px", fontWeight: 700, visibility: left === null ? "hidden" : "visible" }}>{left ?? "00"}</p>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 14, lineHeight: "20px" }}>{left === 1 ? "day" : "days"} left to act</p>
      </div>
    </div>
  );
}
