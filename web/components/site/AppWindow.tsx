"use client";

// A picture of the app's Overview in a browser window. It plays a short loop: the cursor
// walks to "Team", clicks, the answer saves, then everything resets.

import { useEffect, useState, useSyncExternalStore } from "react";
import YearRing from "./YearRing";
import { daysLeft, useNow } from "./useToday";

// Where the cursor sits at each step, measured from the middle of the Team button.
const CURSOR = ["translate(-300px, 230px)", "translate(0, 0)", "translate(0, 0) scale(.82)", "translate(30px, 40px)"];

function noSubscribe() {
  return () => {};
}

// The address bar shows wherever the site is really running (localhost now, the real
// address once it's deployed), so it never shows a made-up address.
function useHost() {
  return useSyncExternalStore(noSubscribe, () => window.location.host, () => "");
}

function useMealsLoop() {
  const [phase, setPhase] = useState(0);
  const [meals, setMeals] = useState(4180);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let frame = 0;

    const rollMeals = (from: number, to: number) => {
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / 900);
        setMeals(from + (to - from) * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    const run = () => {
      timers.push(setTimeout(() => setPhase(1), 1200));
      timers.push(setTimeout(() => setPhase(2), 2400));
      timers.push(setTimeout(() => { setPhase(3); rollMeals(4180, 4592); }, 2650));
      timers.push(setTimeout(() => { setPhase(0); setMeals(4180); }, 6400));
    };
    run();
    const loop = setInterval(run, 7400);
    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    };
  }, []);

  return { phase, meals };
}

const chip = { padding: "4px 10px", border: "1px solid #26292c", fontSize: 13 };
const row = { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #e3e5e6", fontSize: 14, lineHeight: "20px" };
const navItem = { padding: "7px 10px", color: "#4f555b" };

export default function AppWindow() {
  const host = useHost();
  const { phase, meals } = useMealsLoop();
  const now = useNow();
  const answered = phase >= 3;
  const stands = [
    { value: "$6,600", mark: "T", label: "California equipment room left" },
    { value: "4", mark: "Σ", label: "1099 forms to file" },
    { value: "$" + Math.round(meals).toLocaleString("en-US"), mark: answered ? "Σ" : "Δ", label: "Team meals, not deductible federally" },
    { value: now ? String(daysLeft(now)) : "", mark: "T", label: "Days left in the tax year" },
  ];

  return (
    <div style={{ position: "relative", width: 1080, height: 600 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: "#fdfdfc", border: "1px solid #d3d7da", boxShadow: "0 2px 4px rgba(38,41,44,.05), 0 40px 80px rgba(38,41,44,.18)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        <div style={{ height: 44, flex: "none", display: "flex", alignItems: "center", gap: 16, padding: "0 16px", background: "linear-gradient(180deg, #f3f4f3, #e9ebea)", borderBottom: "1px solid #d9dcde" }}>
          <div aria-hidden="true" style={{ display: "flex", gap: 7 }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: "#c9cdd0" }} />)}
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <span className="muted" style={{ minWidth: 320, textAlign: "center", padding: "4px 14px", borderRadius: 8, background: "#ffffff", border: "1px solid #dcdfe1", fontSize: 12 }}>
              {host ? `${host}/app` : "/app"}
            </span>
          </div>
          <span style={{ width: 50 }} />
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <nav aria-label="App" style={{ width: 190, flex: "none", padding: "20px 14px", borderRight: "1px solid #e3e5e6", background: "linear-gradient(180deg, #fafbfa, #f4f5f4)", display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
            <p style={{ margin: "0 0 16px 8px", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>TrimTax</p>
            <span style={{ padding: "7px 10px", borderRadius: 6, background: "#26292c", color: "#fdfdfc", fontWeight: 600 }}>Overview</span>
            <span style={navItem}>Check a purchase</span>
            <span style={navItem}>
              Questions <span style={{ marginLeft: 4, padding: "0 6px", borderRadius: 8, background: "#2c5ba0", color: "#ffffff", fontSize: 11 }}>{answered ? "0" : "1"}</span>
            </span>
            <span style={navItem}>Rules</span>
            <span style={navItem}>Accountant packet</span>
            <p className="muted" style={{ margin: "auto 0 0 8px", fontSize: 11, lineHeight: "15px" }}>Synthetic demo data</p>
          </nav>

          <div style={{ flex: 1, padding: "22px 28px", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "3px solid #26292c", borderBottom: "1px solid #26292c", padding: "8px 0" }}>
              <div>
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>Business</p>
                <p className="mono" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Tidewell Labs</p>
              </div>
              <p style={{ margin: 0, fontSize: 40, lineHeight: "40px", fontWeight: 800, color: "transparent", WebkitTextStroke: "1.2px #26292c" }}>2026</p>
            </div>

            <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
              <div style={{ width: 252, height: 252, flex: "none", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 420, height: 420, transform: "scale(.6)", transformOrigin: "0 0" }}>
                  <YearRing />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700 }}>
                  <span style={{ padding: "1px 6px", background: "#26292c", color: "#fdfdfc" }}>To do</span> Before Dec 31
                </p>
                <div style={row}>
                  <span style={{ flex: 1, transition: "color .4s ease", ...(answered ? { color: "#61666b", textDecoration: "line-through", textDecorationColor: "#2c5ba0", textDecorationThickness: 2 } : {}) }}>
                    Sweetgreen $412 on Nov 13: team or client?
                  </span>
                  <span style={{ position: "relative", padding: "4px 10px", fontSize: 13, transition: "background-color .3s ease, color .3s ease", ...(phase >= 2 ? { background: "#2c5ba0", color: "#ffffff", border: "1px solid #2c5ba0" } : { border: "1px solid #26292c" }) }}>
                    Team
                    <svg aria-hidden="true" width="22" height="26" viewBox="0 0 22 26"
                      style={{ position: "absolute", left: "50%", top: "50%", margin: "-2px 0 0 -2px", transition: "transform 1.1s cubic-bezier(.65,0,.35,1)", transform: CURSOR[phase], filter: "drop-shadow(0 3px 4px rgba(0,0,0,.25))", zIndex: 3 }}>
                      <path d="M2 2l16 10-7 1.5L8 22z" fill="#26292c" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={chip}>Client</span>
                </div>
                <div style={row}>
                  <span style={{ flex: 1 }}>Get a W-9 from Dana Reyes, <span className="mono" style={{ fontWeight: 700 }}>$150</span> from the line</span>
                  <span style={chip}>Request</span>
                </div>
                <div style={{ ...row, borderBottom: "1px solid #26292c" }}>
                  <span style={{ flex: 1 }}>$6,600 of California equipment room left</span>
                  <span style={{ padding: "4px 10px", background: "#26292c", color: "#fdfdfc", fontSize: 13 }}>Check a purchase</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 18, paddingTop: 4 }}>
              {stands.map((x) => (
                <div key={x.label} style={{ paddingTop: 10, borderTop: "1px solid #e3e5e6" }}>
                  <p className="mono" style={{ margin: 0, fontSize: 24, lineHeight: "28px", fontWeight: 700 }}>
                    {x.value}<sup style={{ fontFamily: "var(--sans)", fontSize: 11, color: "#2c5ba0", marginLeft: 3 }}>{x.mark}</sup>
                  </p>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 12, lineHeight: "16px" }}>{x.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div aria-hidden="true" style={{ position: "absolute", left: 420, bottom: 24, padding: "10px 14px", background: "#26292c", color: "#fdfdfc", fontSize: 13, boxShadow: "0 12px 28px rgba(38,41,44,.25)", transition: "opacity .4s ease, transform .5s cubic-bezier(.22,1,.36,1)", opacity: answered ? 1 : 0, transform: `translateY(${answered ? 0 : 12}px)` }}>
          Saved as a team meal. Nothing left to answer.
        </div>
      </div>
    </div>
  );
}
