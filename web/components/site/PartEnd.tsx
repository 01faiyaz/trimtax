"use client";

// Part VII, "Sign here": everything in the year floating around one call to action, then
// the footer.

import Link from "next/link";
import { useState } from "react";
import { Holes, PartHead } from "./Paper";
import { useDrift } from "./useDrift";
import { useSeen } from "./useSeen";

const HUB = { x: 575, y: 262, rx: 330, ry: 120 };
const DOCS = [
  { id: "receipt", title: "Receipt", value: "$18.40", note: "Corner Coffee, filed", x: 150, y: 110 },
  { id: "laptops", title: "Before you buy", value: "3 × $2,899", note: "California room: $6,600", x: 420, y: 66 },
  { id: "lunch", title: "Question", value: "Sweetgreen $412", note: "Team or client?", x: 770, y: 62 },
  { id: "rules", title: "Rules", value: "2026.1", note: "Federal and California", x: 1010, y: 120 },
  { id: "w9", title: "W-9", value: "Dana Reyes", note: "$150 from the 1099 line", x: 130, y: 360, manila: true },
  { id: "nec", title: "1099-NEC draft", value: "4 contractors", note: "Due Feb 1", x: 360, y: 470 },
  { id: "packet", title: "Accountant packet", value: "3 open items", note: "Every source attached", x: 800, y: 470 },
  { id: "q4", title: "Owners' Q4 estimate", value: "Jan 15", note: "Deadline on the clock", x: 1030, y: 370 },
];
const PAIRS = [["w9", "nec"], ["rules", "nec"], ["rules", "q4"], ["receipt", "packet"]];

// Where a line from point p meets the edge of the oval around the headline.
function toHub(p: { x: number; y: number }) {
  const dx = p.x - HUB.x;
  const dy = p.y - HUB.y;
  const k = Math.min(1 / Math.sqrt((dx / HUB.rx) ** 2 + (dy / HUB.ry) ** 2), 1);
  return { x: HUB.x + dx * k, y: HUB.y + dy * k };
}

function EndScene() {
  const t = useDrift();
  const [hovered, setHovered] = useState<string | null>(null);

  const at: Record<string, { x: number; y: number }> = {};
  DOCS.forEach((d, i) => {
    at[d.id] = { x: d.x + Math.sin(t * 0.55 + i * 1.9) * 7, y: d.y + Math.cos(t * 0.45 + i * 1.3) * 7 };
  });

  const links = [
    ...DOCS.map((d, i) => {
      const end = toHub(at[d.id]);
      const lit = hovered === d.id;
      return { key: d.id, a: at[d.id], b: end, color: lit ? "#2c5ba0" : "#aab4bf", width: lit ? 1.8 : 1.1, delay: 0.2 + i * 0.08 };
    }),
    ...PAIRS.map(([a, b], i) => {
      const lit = hovered === a || hovered === b;
      return { key: a + b, a: at[a], b: at[b], color: lit ? "#2c5ba0" : "#c9cfd5", width: lit ? 1.6 : 1, delay: 0.9 + i * 0.1 };
    }),
  ];

  return (
    <div style={{ position: "relative", width: 1150, height: 540, overflow: "hidden", lineHeight: "normal", background: "radial-gradient(ellipse at 50% 48%, #f3f6fb 0%, #fdfdfc 60%)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#d9dde0 1px, transparent 1px)", backgroundSize: "22px 22px", WebkitMaskImage: "radial-gradient(ellipse at center, #000 20%, transparent 70%)", maskImage: "radial-gradient(ellipse at center, #000 20%, transparent 70%)" }} />

      <svg aria-hidden="true" width="1150" height="540" viewBox="0 0 1150 540" style={{ position: "absolute", inset: 0 }}>
        {links.map((l) => (
          <line key={l.key} className="link" x1={l.a.x.toFixed(1)} y1={l.a.y.toFixed(1)} x2={l.b.x.toFixed(1)} y2={l.b.y.toFixed(1)} stroke={l.color} strokeWidth={l.width} style={{ animationDelay: `0s, ${l.delay.toFixed(2)}s` }} />
        ))}
      </svg>

      {DOCS.map((d, i) => {
        const lit = hovered === d.id;
        return (
          <div key={d.id} className="card-in" onMouseEnter={() => setHovered(d.id)} onMouseLeave={() => setHovered(null)}
            style={{ position: "absolute", left: at[d.id].x.toFixed(1) + "px", top: at[d.id].y.toFixed(1) + "px", transform: "translate(-50%, -50%)", width: 150, padding: "10px 12px", boxSizing: "border-box",
              background: d.manila ? "linear-gradient(180deg, #ede2c4, #e3d4aa)" : "linear-gradient(180deg, #ffffff, #f8f9f8)",
              border: `1px solid ${lit ? "#2c5ba0" : d.manila ? "#d8c79c" : "#d6d9db"}`,
              boxShadow: lit ? "0 16px 32px rgba(38,41,44,.16)" : "0 10px 24px rgba(38,41,44,.09)",
              animationDelay: `${(i * 0.07).toFixed(2)}s` }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: "16px", fontWeight: 700 }}>{d.title}</p>
            <p className="mono" style={{ margin: "3px 0 0", fontSize: 14, lineHeight: "18px", fontWeight: 700 }}>{d.value}</p>
            <p className="muted" style={{ margin: "3px 0 0", fontSize: 11, lineHeight: "15px" }}>{d.note}</p>
          </div>
        );
      })}

      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 600, textAlign: "center" }}>
        <h2 style={{ margin: "0 auto", fontSize: 58, lineHeight: "60px", fontWeight: 700, letterSpacing: "-0.04em", maxWidth: "14ch" }}>42 days left. Make them count.</h2>
        <Link href="/app" style={{ display: "inline-flex", alignItems: "center", minHeight: 52, padding: "0 26px", marginTop: 28, background: "linear-gradient(180deg, #33373b, #1f2225)", color: "#fdfdfc", fontSize: 17, fontWeight: 600, textDecoration: "none", boxShadow: "0 10px 24px rgba(38,41,44,.22)" }}>
          Open the demo
        </Link>
      </div>
    </div>
  );
}

export default function PartEnd() {
  const [ref, seen] = useSeen();
  return (
    <>
      <div ref={ref} className={seen ? "page page-in" : "page"} style={{ position: "relative" }}>
        <div aria-hidden="true" className="under" />
        <section aria-label="Closing" className="paper" style={{ overflow: "hidden" }}>
          <Holes />
          <PartHead part="Part VII" name="Sign here" page={8} />
          <div style={{ display: "flex", justifyContent: "center", minHeight: 540, padding: "12px 0 20px" }}>
            {seen && <EndScene />}
          </div>
        </section>
      </div>

      <footer style={{ padding: "8px 0 0", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px 24px", fontSize: 13, lineHeight: "20px", color: "#61666b" }}>
        <span>TrimTax, by Taxaphobe. Built for the BBS × Ramp hackathon.</span>
        <span>Demo uses synthetic data. Estimates only, not tax advice.</span>
      </footer>
    </>
  );
}
