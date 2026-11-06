"use client";

// Part III, "What changed for 2026": three big figures that roll from the old value to
// the 2026 value when the page scrolls into view, with the old value struck through.

import { Holes, PartHead } from "./Paper";
import { useSeen } from "./useSeen";
import { money, useTween } from "./useTween";

const label = { margin: "0 0 10px", fontSize: 13, fontWeight: 700 };
const was = { margin: "0 0 4px", fontSize: 14, lineHeight: "20px" };
const big = { margin: 0, fontSize: 60, lineHeight: "64px", fontWeight: 700, background: "linear-gradient(180deg, #26292c 35%, #4a6fa8)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
const text = { margin: "12px 0 0", color: "#4f555b" };

function Old({ children, strikeDelay }: { children: React.ReactNode; strikeDelay?: string }) {
  return (
    <span className="mono" style={{ position: "relative", fontWeight: 700 }}>
      {children}
      <span aria-hidden="true" className="strike" style={strikeDelay ? { transitionDelay: strikeDelay } : undefined} />
    </span>
  );
}

export default function PartNumbers() {
  const [ref, seen] = useSeen();
  const line1099 = useTween(seen ? 2000 : 600, 1600);
  const caCap = useTween(seen ? 25000 : 0, 1600);
  const meals = useTween(seen ? 0 : 50, 1600);

  return (
    <div ref={ref} className={seen ? "page page-in" : "page"} style={{ position: "relative" }}>
      <div aria-hidden="true" className="under" />
      <section aria-labelledby="numbers-title" className="paper">
        <Holes />
        <PartHead part="Part III" name="What changed for 2026" page={4} nameId="numbers-title" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", padding: "0 32px" }}>
          <div className="reveal" style={{ "--d": ".1s", padding: "40px 28px 44px 0" } as React.CSSProperties}>
            <p className="mono muted" style={label}>Line 1a</p>
            <p className="muted" style={was}>2025: <Old>$600</Old></p>
            <p className="mono" style={big}>{money(line1099)}</p>
            <p style={text}>Paid to one contractor in 2026 before you file a federal 1099. California&apos;s own $600 contractor report may still apply.</p>
          </div>
          <div className="reveal" style={{ "--d": ".22s", padding: "40px 28px 44px", borderLeft: "1px solid #e3e5e6" } as React.CSSProperties}>
            <p className="mono muted" style={label}>Line 1b</p>
            <p className="muted" style={was}>Federal: <span className="mono" style={{ fontWeight: 700 }}>$2,560,000</span></p>
            <p className="mono" style={big}>{money(caCap)}</p>
            <p style={text}>California&apos;s cap on writing off equipment in year one. Federal has no practical cap.</p>
          </div>
          <div className="reveal" style={{ "--d": ".34s", padding: "40px 0 44px 28px", borderLeft: "1px solid #e3e5e6" } as React.CSSProperties}>
            <p className="mono muted" style={label}>Line 1c</p>
            <p className="muted" style={was}>2025: <Old strikeDelay=".9s">50%</Old></p>
            <p className="mono" style={big}>{Math.round(meals)}%</p>
            <p style={text}>Of office team meals you can deduct on your federal return starting in 2026. California still allows 100%.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
