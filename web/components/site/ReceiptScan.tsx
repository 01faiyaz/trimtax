"use client";

// The Sweetgreen receipt being read: a scan line passes over each field, a wire carries it
// to "What the AI read", the category comes back as a question, then "What the code did"
// lights up. Steps 1 to 4 read one field each, 5 is the category, 6 hands off to the code.

import { useEffect, useState } from "react";

const FIELDS = [
  { tag: "Vendor", top: 18, height: 32, left: 40, right: 40 },
  { tag: "Date", top: 81, height: 26, left: 14, right: 14 },
  { tag: "Clue", top: 200, height: 44, left: 14, right: 14 },
  { tag: "Total", top: 310, height: 30, left: 14, right: 14 },
];
const VALUES = [
  ["Vendor", "Sweetgreen"],
  ["Date", "Nov 13, 2026"],
  ["Clue", "Delivered to the office"],
  ["Total", "$412.00"],
  ["Category", "Meals: team or client?"],
];
const RECEIPT = { left: 70, top: 28, width: 290 };
const CARD = { left: 520, firstRow: 78, rowHeight: 44 };
// The beam's bottom edge lines up with the bottom of the field it's reading.
const BEAM = [-40, 10, 67, 204, 300, 420, 420];

function useScanSteps() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timers.push(setTimeout(() => setStep(6), 0));
      return () => timers.forEach(clearTimeout);
    }
    const run = () => {
      [1, 2, 3, 4, 5, 6].forEach((s) => timers.push(setTimeout(() => setStep(s), 500 + (s - 1) * 850)));
      timers.push(setTimeout(() => setStep(0), 10200));
    };
    run();
    const loop = setInterval(run, 11000);
    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
    };
  }, []);
  return step;
}

const line = { position: "absolute" as const, left: 22, right: 22, margin: 0, display: "flex", justifyContent: "space-between" };
const codeLine = { margin: 0, fontSize: 14, lineHeight: "24px" };
const arrow = { color: "#8fb0e0", fontWeight: 700 };

export default function ReceiptScan() {
  const step = useScanSteps();

  return (
    <div role="group" aria-label="A receipt being read. The AI pulls out the vendor, date, total and a clue, then plain code checks the numbers and applies the rule."
      style={{ position: "relative", width: 1080, height: 520 }}>
      <div aria-hidden="true" style={{ position: "absolute", left: -40, top: -20, width: 520, height: 560, background: "radial-gradient(ellipse at center, rgba(44,91,160,.10), rgba(44,91,160,0) 62%)" }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#d9dde0 1px, transparent 1px)", backgroundSize: "22px 22px", WebkitMaskImage: "radial-gradient(ellipse at 30% 50%, #000 15%, transparent 65%)", maskImage: "radial-gradient(ellipse at 30% 50%, #000 15%, transparent 65%)" }} />

      <div aria-hidden="true" style={{ position: "absolute", left: RECEIPT.left, top: RECEIPT.top, width: RECEIPT.width, filter: "drop-shadow(0 2px 2px rgba(38,41,44,.06)) drop-shadow(0 22px 34px rgba(38,41,44,.14))" }}>
        <div className="mono" style={{ position: "relative", height: 460, background: "linear-gradient(180deg, #ffffff, #fbfbfa)", fontSize: 13, lineHeight: "18px", overflow: "hidden" }}>
          <p style={{ position: "absolute", left: 0, right: 0, top: 22, margin: 0, textAlign: "center", fontSize: 21, lineHeight: "24px", fontWeight: 700, letterSpacing: ".08em" }}>SWEETGREEN</p>
          <p className="muted" style={{ position: "absolute", left: 0, right: 0, top: 54, margin: 0, textAlign: "center", fontSize: 12 }}>Catering order #4471</p>
          <p style={{ ...line, top: 85 }}><span>11/13/2026</span><span>12:18 PM</span></p>
          <div style={{ position: "absolute", left: 22, right: 22, top: 118, borderTop: "1px dashed #b4b8bc" }} />
          <p style={{ ...line, top: 130 }}><span>22 x Harvest Bowl</span><span>319.00</span></p>
          <p style={{ ...line, top: 150 }}><span>Delivery fee</span><span>14.95</span></p>
          <p style={{ ...line, top: 170 }}><span>Service fee</span><span>39.75</span></p>
          <p style={{ position: "absolute", left: 22, right: 22, top: 204, margin: 0 }}>Deliver to:<br />Tidewell Labs, office 3F</p>
          <div style={{ position: "absolute", left: 22, right: 22, top: 256, borderTop: "1px dashed #b4b8bc" }} />
          <p style={{ ...line, top: 268 }}><span>Subtotal</span><span>373.70</span></p>
          <p style={{ ...line, top: 288 }}><span>Tax</span><span>38.30</span></p>
          <p style={{ ...line, top: 314, fontSize: 17, lineHeight: "22px", fontWeight: 700 }}><span>TOTAL</span><span>$412.00</span></p>
          <p className="muted" style={{ position: "absolute", left: 22, right: 22, top: 352, margin: 0 }}>VISA ending 4417</p>
          <p className="muted" style={{ position: "absolute", left: 0, right: 0, top: 384, margin: 0, textAlign: "center" }}>Thank you!</p>
          <div style={{ position: "absolute", left: 60, right: 60, top: 412, height: 28, background: "repeating-linear-gradient(90deg, #26292c 0 2px, transparent 2px 4px, #26292c 4px 5px, transparent 5px 8px, #26292c 8px 11px, transparent 11px 13px)" }} />

          {FIELDS.map((f, i) => {
            const on = step >= i + 1;
            return (
              <div key={f.tag} style={{ position: "absolute", left: f.left, right: f.right, top: f.top, height: f.height, border: "1.5px solid #2c5ba0", background: "rgba(44,91,160,.07)", borderRadius: "0 0 4px 4px", transition: "opacity .4s ease, transform .5s cubic-bezier(.22,1,.36,1)", opacity: on ? 1 : 0, transform: `scale(${on ? 1 : 1.06})` }}>
                <span style={{ position: "absolute", right: -1, top: -19, padding: "1px 6px", background: "#2c5ba0", color: "#ffffff", fontFamily: "var(--sans)", fontSize: 10, lineHeight: "16px", fontWeight: 700, borderRadius: "3px 3px 0 0" }}>{f.tag}</span>
              </div>
            );
          })}

          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 40, background: "linear-gradient(180deg, rgba(44,91,160,0), rgba(44,91,160,.16))", borderBottom: "2px solid #2c5ba0", boxShadow: "0 6px 14px rgba(44,91,160,.25)", transition: "transform .8s cubic-bezier(.22,1,.36,1), opacity .4s ease", transform: `translateY(${BEAM[step]}px)`, opacity: step >= 1 && step <= 4 ? 1 : 0 }} />
        </div>
        <div style={{ height: 12, background: "linear-gradient(135deg, #fbfbfa 6px, transparent 0) 0 0 / 12px 12px, linear-gradient(-135deg, #fbfbfa 6px, transparent 0) 0 0 / 12px 12px" }} />
      </div>

      <svg aria-hidden="true" width="1080" height="520" viewBox="0 0 1080 520" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
        {FIELDS.map((f, i) => {
          const x1 = RECEIPT.left + RECEIPT.width - f.right + 4;
          const y1 = RECEIPT.top + f.top + f.height / 2;
          const x2 = CARD.left;
          const y2 = CARD.firstRow + i * CARD.rowHeight + CARD.rowHeight / 2;
          const on = step >= i + 1;
          return (
            <g key={f.tag}>
              <path d={`M${x1} ${y1} C${x1 + 80} ${y1}, ${x2 - 80} ${y2}, ${x2} ${y2}`} pathLength={1} fill="none" stroke="#2c5ba0" strokeWidth="1.5" strokeDasharray="1"
                style={{ strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)" }} />
              <circle cx={x1} cy={y1} r="3.5" fill="#2c5ba0" style={{ opacity: on ? 1 : 0, transition: "opacity .3s ease" }} />
              <circle cx={x2} cy={y2} r="3.5" fill="#ffffff" stroke="#2c5ba0" strokeWidth="1.5" style={{ opacity: on ? 1 : 0, transition: "opacity .3s ease .4s" }} />
            </g>
          );
        })}
      </svg>

      <div style={{ position: "absolute", left: 520, top: 28, width: 500, height: 300, background: "linear-gradient(180deg, #ffffff, #fafbfa)", border: "1px solid #d6d9db", boxShadow: "0 1px 2px rgba(38,41,44,.04), 0 18px 36px rgba(38,41,44,.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e3e5e6" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>What the AI read</p>
          <span className="muted" style={{ fontSize: 12 }}>Claude, fixed list of categories</span>
        </div>
        {VALUES.map(([label, value], i) => {
          const on = step >= i + 1;
          const last = i === VALUES.length - 1;
          return (
            <div key={label} style={{ position: "absolute", left: 0, right: 0, top: 50 + i * CARD.rowHeight, height: CARD.rowHeight, display: "flex", alignItems: "center", gap: 12, padding: "0 20px", ...(last ? { background: on ? "#eef3fa" : "transparent", transition: "background-color .5s ease" } : { borderBottom: "1px solid #eef0f1" }) }}>
              <span className="muted" style={{ width: 84, flex: "none", fontSize: 13 }}>{label}</span>
              <span className="mono" style={{ flex: 1, fontSize: 16, fontWeight: 700, transition: "opacity .5s ease, transform .6s cubic-bezier(.22,1,.36,1)", opacity: on ? 1 : 0, transform: `translateX(${on ? 0 : -10}px)` }}>{value}</span>
              {last && <span style={{ padding: "2px 8px", border: "1px solid #2c5ba0", color: "#2c5ba0", fontSize: 12, fontWeight: 600, transition: "opacity .5s ease .2s", opacity: on ? 1 : 0 }}>Δ asks you</span>}
            </div>
          );
        })}
      </div>

      <div aria-hidden="true" className="muted" style={{ position: "absolute", left: 520, width: 500, top: 338, display: "flex", alignItems: "center", gap: 12, fontSize: 12, fontWeight: 600 }}>
        <span style={{ flex: 1, borderTop: "1px dashed #b4b8bc" }} /><span>The AI stops here. Plain code does the math.</span><span style={{ flex: 1, borderTop: "1px dashed #b4b8bc" }} />
      </div>

      <div style={{ position: "absolute", left: 520, top: 366, width: 500, padding: "14px 20px", background: "#26292c", color: "#fdfdfc", boxShadow: "0 18px 36px rgba(38,41,44,.22)", transition: "opacity .6s ease, transform .7s cubic-bezier(.22,1,.36,1)", opacity: step >= 6 ? 1 : 0.18, transform: `translateY(${step >= 6 ? 0 : 10}px)` }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#c9d6ea" }}>What the code did</p>
        <p style={codeLine}><span style={arrow}>✓</span> Number check: <span className="mono" style={{ fontWeight: 700 }}>$412.00</span> is printed on the receipt</p>
        <p style={codeLine}><span style={arrow}>→</span> Rule <span className="mono">meals.office</span> <span className="mono" style={arrow}>[[IRC 274(o)]]</span>: team 0% federal, 100% California; client 50%</p>
        <p style={codeLine}><span style={arrow}>→</span> Waiting on one answer, so nothing is counted yet</p>
      </div>
    </div>
  );
}
