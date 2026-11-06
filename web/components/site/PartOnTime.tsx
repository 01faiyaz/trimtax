"use client";

// Part V, "On time": a phone getting heads-ups, the December dates that matter, and the
// packet that ends up with the accountant.

import { useEffect, useState } from "react";
import Fit from "./Fit";
import { Holes, PartHead } from "./Paper";
import { useNarrow } from "./useNarrow";
import { useSeen } from "./useSeen";

const mono = { fontFamily: "var(--mono)" };
const ease = "cubic-bezier(.22,1,.36,1)";

const NOTES = [
  ["Mon", "$6,600 of California room left", "Buying equipment? Check it first."],
  ["Today", "Sweetgreen $412: team or client?", "One tap to answer."],
  ["now", "Dana Reyes is $150 from the 1099 line", "Get her W-9 before the next payment."],
];
const SHEETS = ["Open questions", "Equipment schedule", "1099-NEC drafts", "Rules and sources"];
const PACKET = [["Receipts, each linked", "142"], ["Open items", "3"], ["Ruleset, sources cited", "2026.1"], ["1099-NEC drafts", "4"]];

// Faint year clock on the lock screen. Rounded so the server and browser draw the same thing.
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const angle = (i / 72) * 2 * Math.PI;
  const long = i % 6 === 0;
  const inner = long ? 120 : 128;
  const at = (r: number) => [(115 + r * Math.cos(angle)).toFixed(1), (390 + r * Math.sin(angle)).toFixed(1)];
  const [x1, y1] = at(inner);
  const [x2, y2] = at(136);
  return { x1, y1, x2, y2, width: long ? 1.6 : 0.8 };
});

function Arrow() {
  return (
    <svg aria-hidden="true" width="60" height="40" viewBox="0 0 60 40" style={{ alignSelf: "center", marginTop: -20, flex: "none" }}>
      <path d="M4 20H50" stroke="#aab4bf" strokeWidth="1.5" strokeDasharray="4 5" />
      <path d="M44 13l8 7-8 7" fill="none" stroke="#aab4bf" strokeWidth="1.5" />
    </svg>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700 }}>
      <span style={{ ...mono, color: "#2c5ba0" }}>{n}</span> {children}
    </p>
  );
}

function OnTime({ stacked = false }: { stacked?: boolean }) {
  const [shown, setShown] = useState(0); // how many notifications are on the phone
  const [drawn, setDrawn] = useState(false); // the pen circle around Dec 31
  const [spread, setSpread] = useState(0); // 0 stacked, 1 fanned a little, 2 fanned wide on hover

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      later(0, () => {
        setShown(3);
        setDrawn(true);
        setSpread(1);
      });
      return () => timers.forEach(clearTimeout);
    }

    later(300, () => setDrawn(true));
    later(900, () => setSpread(1));

    // Notifications arrive one at a time, sit for a while, then clear and start again.
    const run = () => {
      [1, 2, 3].forEach((n) => later(400 + (n - 1) * 1300, () => setShown(n)));
      later(8200, () => setShown(0));
    };
    run();
    const loop = setInterval(run, 9000);
    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
    };
  }, []);

  const wide = spread === 2 ? 1.3 : spread;
  const sheetBox = { position: "absolute", left: 10, top: 10, width: 230, height: 320, padding: "16px 18px", boxSizing: "border-box", transformOrigin: "20% 100%", transition: `transform .8s ${ease}` } as const;

  return (
    <div style={{ position: "relative", display: "flex", lineHeight: "normal", fontVariantNumeric: "tabular-nums",
      ...(stacked ? { flexDirection: "column", alignItems: "center", gap: 40 } : { width: 1080, height: 560, justifyContent: "space-between" }) }}>

      <div style={{ width: 280, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ alignSelf: "flex-start" }}><Step n={1}>A heads-up before it&apos;s late</Step></div>
        <div aria-hidden="true" style={{ position: "relative", width: 250, height: 500, borderRadius: 38, background: "linear-gradient(145deg, #3a3e43, #1c1f22)", padding: 10, boxSizing: "border-box", boxShadow: "0 30px 60px rgba(38,41,44,.25), inset 0 1px 0 rgba(255,255,255,.12)" }}>
          <div style={{ position: "relative", height: "100%", borderRadius: 30, overflow: "hidden", background: "linear-gradient(180deg, #dfe6ef 0%, #eef0f0 55%, #f3eee0 100%)" }}>
            <svg width="230" height="480" viewBox="0 0 230 480" style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
              {TICKS.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#26292c" strokeWidth={t.width} />)}
            </svg>
            <div style={{ width: 70, height: 20, borderRadius: 10, background: "#1c1f22", margin: "10px auto 0" }} />
            <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#3d4247" }}>Thursday, November 19</p>
            <p style={{ margin: 0, textAlign: "center", fontSize: 60, lineHeight: "64px", fontWeight: 700, letterSpacing: "-0.03em" }}>9:41</p>
            <div style={{ position: "absolute", left: 10, right: 10, top: 150 }}>
              {NOTES.map(([when, title, body], i) => {
                const on = shown > i;
                return (
                  <div key={title} style={{ marginBottom: 8, padding: "10px 12px", borderRadius: 16, background: "rgba(255,255,255,.78)", WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)", boxShadow: "0 8px 20px rgba(38,41,44,.10)", transition: `opacity .45s ease, transform .6s ${ease}`, opacity: on ? 1 : 0, transform: on ? "none" : "translateY(-16px) scale(.96)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, lineHeight: "14px", color: "#61666b" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#26292c" }}>
                        <span style={{ width: 16, height: 16, borderRadius: 4, background: "#26292c", color: "#fdfdfc", fontSize: 9, lineHeight: "16px", textAlign: "center", fontWeight: 800 }}>T</span>TrimTax
                      </span>
                      <span>{when}</span>
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: "17px", fontWeight: 700 }}>{title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: "16px", color: "#4f555b" }}>{body}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ position: "absolute", left: "50%", bottom: 8, width: 110, height: 4, marginLeft: -55, borderRadius: 2, background: "#26292c", opacity: 0.6 }} />
          </div>
        </div>
      </div>

      {!stacked && <Arrow />}

      <div style={{ width: 320, maxWidth: "100%", display: "flex", flexDirection: "column" }}>
        <Step n={2}>The dates that decide it</Step>
        <div style={{ background: "linear-gradient(180deg, #ffffff, #fafbfa)", border: "1px solid #d6d9db", boxShadow: "0 1px 2px rgba(38,41,44,.04), 0 22px 44px rgba(38,41,44,.10)", padding: "18px 20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>December 2026</p>
            <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: "#2c5ba0" }}>42 days left</span>
          </div>
          <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(7, 40px)", marginTop: 12, fontSize: 11, fontWeight: 700, color: "#61666b", textAlign: "center" }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div style={{ position: "relative", width: 280, height: 200, marginTop: 6 }}>
            {/* December 1, 2026 is a Tuesday, so the month starts two cells in. */}
            {Array.from({ length: 31 }, (_, i) => {
              const n = i + 1;
              const cell = n + 1;
              const special = n === 10 || n === 31;
              return (
                <span key={n} style={{ position: "absolute", left: (cell % 7) * 40, top: Math.floor(cell / 7) * 40, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, ...(special ? { fontWeight: 700, color: "#26292c" } : { color: "#4f555b" }) }}>{n}</span>
              );
            })}
            <svg aria-hidden="true" width="280" height="200" viewBox="0 0 280 200" style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
              <path d="M162 172c4-12 30-14 37-3 6 10-2 21-18 22-14 1-24-6-22-15 1-5 8-9 15-10" pathLength={1} fill="none" stroke="#2c5ba0" strokeWidth="2" strokeLinecap="round" strokeDasharray="1" style={{ strokeDashoffset: drawn ? 0 : 1, transition: `stroke-dashoffset 1s ${ease} .5s` }} />
              <circle cx="180" cy="73" r="3" fill="#2c5ba0" style={{ transformBox: "fill-box", transformOrigin: "center", transition: `transform .5s ${ease} .3s`, transform: `scale(${drawn ? 1 : 0})` }} />
            </svg>
          </div>
          <dl style={{ margin: "14px 0 0", fontSize: 13, lineHeight: "18px" }}>
            <div style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid #e3e5e6" }}>
              <dt style={{ ...mono, width: 50, flex: "none", fontWeight: 700 }}>Dec 10</dt><dd style={{ margin: 0, color: "#4f555b" }}>Laptops in use, so they count for 2026</dd>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid #e3e5e6" }}>
              <dt style={{ ...mono, width: 50, flex: "none", fontWeight: 700, color: "#2c5ba0" }}>Dec 31</dt><dd style={{ margin: 0, color: "#4f555b" }}>Last day anything can change for 2026</dd>
            </div>
          </dl>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            <span style={{ padding: "4px 10px", background: "#f1f2f2", fontSize: 12 }}><strong style={mono}>Jan 15</strong> owners&apos; Q4 estimate</span>
            <span style={{ padding: "4px 10px", background: "#f1f2f2", fontSize: 12 }}><strong style={mono}>Feb 1</strong> 1099s due</span>
          </div>
        </div>
      </div>

      {!stacked && <Arrow />}

      <div style={{ width: 340, maxWidth: "100%", display: "flex", flexDirection: "column" }} onMouseEnter={() => setSpread(2)} onMouseLeave={() => setSpread(1)}>
        <Step n={3}>Handed to your accountant</Step>
        <div aria-hidden="true" style={{ position: "relative", height: 380 }}>
          {SHEETS.map((title, i) => {
            const k = SHEETS.length - i;
            return (
              <div key={title} style={{ ...sheetBox, background: "linear-gradient(180deg, #ffffff, #f7f7f5)", border: "1px solid #d6d9db", boxShadow: "0 8px 20px rgba(38,41,44,.10)", transitionDelay: `${i * 50}ms`, transform: `translateX(${k * 8 * wide}px) rotate(${[0, 2.5, 5, 7.5][k - 1] * wide}deg)` }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{title}</p>
                <div style={{ marginTop: 10, height: 6, width: "70%", background: "#e6e8ea" }} />
                <div style={{ marginTop: 8, height: 6, width: "85%", background: "#eef0f1" }} />
                <div style={{ marginTop: 8, height: 6, width: "60%", background: "#eef0f1" }} />
              </div>
            );
          })}
          <div style={{ ...sheetBox, background: "linear-gradient(180deg, #ffffff, #fbfbfa)", border: "1px solid #d6d9db", boxShadow: "0 2px 4px rgba(38,41,44,.05), 0 24px 44px rgba(38,41,44,.16)", transform: `rotate(${spread === 2 ? -4 : spread === 1 ? -2 : 0}deg)` }}>
            <div style={{ borderTop: "3px solid #26292c", borderBottom: "1px solid #26292c", padding: "6px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Accountant packet</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "transparent", WebkitTextStroke: "1px #26292c" }}>2026</span>
            </div>
            <p style={{ ...mono, margin: "10px 0 0", fontSize: 15, fontWeight: 700 }}>Tidewell Labs</p>
            <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", fontSize: 12, lineHeight: "17px" }}>
              {PACKET.map(([label, value]) => (
                <li key={label} style={{ padding: "6px 0", borderTop: "1px solid #e3e5e6", display: "flex", justifyContent: "space-between" }}>
                  <span>{label}</span><strong style={mono}>{value}</strong>
                </li>
              ))}
            </ul>
            <div style={{ ...mono, position: "absolute", right: 14, bottom: 16, padding: "4px 8px", border: "2px double #2c5ba0", color: "#2c5ba0", fontSize: 12, fontWeight: 700, transform: "rotate(-6deg)", opacity: 0.8 }}>For CPA review</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <span style={{ flex: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", minHeight: 40, padding: "0 16px", background: "linear-gradient(180deg, #33373b, #1f2225)", color: "#fdfdfc", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 18px rgba(38,41,44,.2)" }}>Export packet</span>
          <span style={{ fontSize: 12, lineHeight: "16px", color: "#61666b" }}>PDF and CSV. TrimTax never files for you.</span>
        </div>
      </div>

    </div>
  );
}

export default function PartOnTime() {
  const [ref, seen] = useSeen();
  const narrow = useNarrow();
  return (
    <div id="ontime" ref={ref} className={seen ? "page page-in" : "page"} style={{ position: "relative", scrollMarginTop: 80 }}>
      <div aria-hidden="true" className="under" />
      <section aria-labelledby="ontime-title" className="paper">
        <Holes />
        <PartHead part="Part V" name="On time" page={6} />
        <div className="page-body">
          <h2 id="ontime-title" className="reveal page-title" style={{ "--d": ".1s", maxWidth: "26ch" } as React.CSSProperties}>
            It watches the calendar for you. <span className="muted" style={{ fontWeight: 600 }}>A nudge before each line, a packet at the end.</span>
          </h2>
          <div className="reveal" style={{ "--d": ".25s", marginTop: 44 } as React.CSSProperties}>
            {narrow ? seen && <OnTime stacked /> : <Fit width={1080} height={560}>{seen && <OnTime />}</Fit>}
          </div>
        </div>
      </section>
    </div>
  );
}
