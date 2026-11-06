"use client";

// The header, the cover page and the tilted product shot under it.

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppWindow from "./AppWindow";
import Fit from "./Fit";
import { Holes } from "./Paper";
import { useSeen } from "./useSeen";
import YearRing from "./YearRing";

// The ribbon is drawn in the browser only: it's decoration, and its trigonometry can differ
// in the last decimal between the server and the browser.
const Ribbon = dynamic(() => import("./Ribbon"), { ssr: false });

const navLink = { color: "#26292c", textDecoration: "none" };

export function SiteHeader() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(236,238,237,.82)", WebkitBackdropFilter: "saturate(180%) blur(14px)", backdropFilter: "saturate(180%) blur(14px)", borderBottom: "1px solid rgba(38,41,44,.07)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px 32px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 36px" }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>TrimTax</p>
          <nav aria-label="Main" style={{ display: "flex", flexWrap: "wrap", gap: "4px 24px", fontSize: 15 }}>
            <a href="#how" style={navLink}>How it works</a>
            <a href="#ai" style={navLink}>The AI</a>
            <a href="#file" style={navLink}>Your tax file</a>
            <a href="#built" style={navLink}>How it&apos;s built</a>
          </nav>
        </div>
        <Link href="/app" style={{ display: "inline-flex", alignItems: "center", minHeight: 40, padding: "0 16px", background: "linear-gradient(180deg, #33373b, #1f2225)", color: "#fdfdfc", fontSize: 15, fontWeight: 600, textDecoration: "none", boxShadow: "0 4px 10px rgba(38,41,44,.18)" }}>
          Open the demo
        </Link>
      </div>
      <div aria-hidden="true" className="progress" />
    </header>
  );
}

// How much of tax year 2026 is gone, ticking forward each second. The demo's "today" is
// Nov 19: 322 full days gone, plus the hours since 9 AM.
function useYearGone() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(clock);
  }, []);
  const daysGone = 322 + (9 * 3600 + seconds) / 86400;
  return ((daysGone / 365) * 100).toFixed(6);
}

const button = { display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 22px", fontSize: 16, fontWeight: 600, textDecoration: "none" };

export function CoverPage() {
  const gone = useYearGone();

  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden="true" className="under" />
      <section aria-labelledby="hero" className="paper" style={{ isolation: "isolate", overflow: "hidden" }}>
        <div aria-hidden="true" className="blob" style={{ zIndex: -1, left: -160, bottom: -220, width: 620, height: 520, background: "radial-gradient(closest-side, rgba(226,212,170,.55), rgba(226,212,170,0))" }} />
        <div style={{ position: "absolute", left: 0, top: 0, zIndex: -1 }}>
          <Ribbon />
        </div>
        <Holes />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", margin: "28px 32px 0", borderTop: "4px solid #26292c", borderBottom: "1px solid #26292c", background: "rgba(253,253,252,.74)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}>
          <div style={{ flex: "1 1 220px", padding: "12px 20px 12px 0", borderRight: "1px solid #d6d9db" }}>
            <p style={{ margin: 0, fontSize: 26, lineHeight: "30px", fontWeight: 800, letterSpacing: "-0.02em" }}>TrimTax</p>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "18px" }}>A tax file that fills itself in all year</p>
          </div>
          <div style={{ flex: "2 1 300px", padding: "12px 20px", borderRight: "1px solid #d6d9db" }}>
            <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: "16px" }}>Business</p>
            <p className="mono" style={{ margin: "2px 0 0", fontSize: 19, lineHeight: "24px", fontWeight: 700 }}>Tidewell Labs</p>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 12, lineHeight: "16px" }}>Synthetic demo data. Federal and California, ruleset 2026.1</p>
          </div>
          <div style={{ flex: "0 1 220px", padding: "4px 0 4px 20px", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
            <p style={{ margin: 0, fontSize: 64, lineHeight: "64px", fontWeight: 800, color: "transparent", WebkitTextStroke: "1.5px #26292c", letterSpacing: "-0.02em" }}>2026</p>
            <p className="mono muted" style={{ margin: 0, fontSize: 12 }}>Page 1 of 8</p>
          </div>
        </div>

        <div style={{ padding: "0 32px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "24px 48px", minHeight: 600 }}>
          <div style={{ flex: "1 1 440px", padding: "48px 0 56px", position: "relative", zIndex: 1 }}>
            <p className="intro" style={{ margin: "0 0 24px", fontSize: 14, lineHeight: "20px", animationDelay: ".1s" }}>
              Tax year 2026 already gone:{" "}
              <span className="live mono" style={{ fontWeight: 700, color: "#2c5ba0", padding: "2px 6px", borderRadius: 4 }}>{gone}%</span>
            </p>
            <h1 id="hero" className="intro" style={{ margin: 0, fontSize: 64, lineHeight: "64px", fontWeight: 700, letterSpacing: "-0.04em", maxWidth: "13ch", animationDelay: ".2s" }}>
              See your taxes while you can{" "}
              <span style={{ background: "linear-gradient(90deg, #2c5ba0, #5f88cc 60%, #b08a45)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>still change them.</span>
            </h1>
            <p className="intro" style={{ margin: "24px 0 0", fontSize: 20, lineHeight: "31px", color: "#4f555b", maxWidth: "36ch", animationDelay: ".35s" }}>
              TrimTax files every purchase into your tax file as it happens, checks it against this year&apos;s rules, and tells you what to do before the year runs out.
            </p>
            <div className="intro" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32, animationDelay: ".5s" }}>
              <a href="#file" style={{ ...button, background: "#26292c", color: "#fdfdfc" }}>Open the tax file</a>
              <a href="#how" style={{ ...button, border: "1px solid #26292c", color: "#26292c" }}>See how it works</a>
            </div>
          </div>

          <div style={{ flex: "0 1 500px", position: "relative", height: 560, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="dial-in" style={{ position: "relative", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle at 50% 38%, #ffffff, #f8f9f8)", boxShadow: "0 0 0 1px #e6e8e9, 0 2px 4px rgba(38,41,44,.04), 0 40px 70px rgba(38,41,44,.16)" }}>
              <YearRing />
            </div>
            <div className="note-in" role="status" style={{ position: "absolute", right: -4, bottom: 36, width: 272, background: "#ffffff", border: "1px solid #d6d9db", padding: "12px 14px", display: "flex", gap: 10, boxShadow: "0 12px 32px rgba(38,41,44,.10)" }}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2c5ba0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 2 }}>
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <p style={{ margin: 0, fontSize: 14, lineHeight: "20px" }}>
                <strong>Dana Reyes is $150 from the 1099 line.</strong> <span className="muted">Get her W-9 before the next payment.</span>
              </p>
            </div>
          </div>
        </div>
        <div aria-hidden="true" style={{ height: 150 }} />
      </section>
    </div>
  );
}

// The app window tilted back under the cover. It stands up when it scrolls into view, or
// after the cover settles if nobody scrolls.
export function ProductShot() {
  const [ref, seen] = useSeen();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 2400);
    return () => clearTimeout(timer);
  }, []);
  const standing = seen || settled;

  return (
    <div ref={ref} style={{ position: "relative", zIndex: 2, marginTop: -190, display: "flex", justifyContent: "center" }}>
      <div aria-hidden="true" className="blob" style={{ left: "10%", top: "8%", width: "70%", height: "90%", background: "radial-gradient(closest-side, rgba(44,91,160,.16), rgba(44,91,160,0))", animationDuration: "26s" }} />
      <div className={standing ? "shot shot-in" : "shot"} style={{ position: "relative", width: "100%", maxWidth: 950 }}>
        <Fit width={1080} height={600} max={0.88}>
          <AppWindow />
        </Fit>
      </div>

      <div aria-hidden="true" className="bob" style={{ "--tilt": "-4deg", position: "absolute", left: 0, top: 300, width: 190, padding: "12px 14px", background: "linear-gradient(180deg, #ffffff, #f7f8f7)", border: "1px solid #d6d9db", boxShadow: "0 18px 36px rgba(38,41,44,.16)", fontSize: 12, lineHeight: "16px", animation: "site-bob 6s ease-in-out infinite" } as React.CSSProperties}>
        <p style={{ margin: 0, fontWeight: 700 }}>Sweetgreen</p>
        <p className="mono" style={{ margin: "2px 0 0", fontSize: 18, lineHeight: "22px", fontWeight: 700 }}>$412.00</p>
        <p style={{ margin: "6px 0 0", color: "#2c5ba0", fontWeight: 600 }}>Δ Team or client?</p>
        <div style={{ marginTop: 8, height: 5, background: "repeating-linear-gradient(90deg, #d6d9db 0 3px, transparent 3px 6px)" }} />
      </div>
      <div aria-hidden="true" className="bob" style={{ "--tilt": "3deg", position: "absolute", right: 0, top: 440, width: 220, padding: "12px 14px", background: "linear-gradient(180deg, #efe4c8, #e2d3a9)", border: "1px solid #d8c79c", boxShadow: "0 18px 36px rgba(90,70,30,.18)", fontSize: 12, lineHeight: "17px", animation: "site-bob 7s ease-in-out -2s infinite" } as React.CSSProperties}>
        <p style={{ margin: 0, fontWeight: 700, color: "#3d3627" }}>Show the work</p>
        <p className="mono" style={{ margin: "6px 0 0", fontSize: 13, color: "#3d3627" }}>$25,000 cap<br />− $18,400 in use</p>
        <p className="mono" style={{ margin: "4px 0 0", paddingTop: 4, borderTop: "1px solid rgba(61,54,39,.3)", fontSize: 17, fontWeight: 700, color: "#26292c" }}>
          = $6,600 left <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "#2c5ba0" }}>T</span>
        </p>
      </div>
    </div>
  );
}
