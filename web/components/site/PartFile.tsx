"use client";

// Part IV, "Your tax file": a manila folder that opens onto five tabbed sheets. While it's
// closed, a new receipt drops in every few seconds. Every number rolls up from zero when a
// sheet opens, and moves when the reader answers, picks a price or switches years.

import { useEffect, useRef, useState } from "react";
import { Holes, PartHead } from "./Paper";
import { useSeen } from "./useSeen";
import { money, useTween } from "./useTween";

type Tab = "questions" | "buy" | "limits" | "rules" | "work";
type Answer = "team" | "client" | null;

const TABS: [Tab, string][] = [["questions", "Questions"], ["buy", "Before you buy"], ["limits", "Limits"], ["rules", "Rule changes"], ["work", "Show the work"]];
const FILING = [["Lyft", "$24.60"], ["Figma", "$45.00"], ["Costco", "$186.32"], ["AWS", "$412.77"], ["FedEx", "$31.15"], ["Notion", "$96.00"]];
const RECEIPTS = [["Apple", "$7,697"], ["Dell", "$3,960"], ["Herman Miller", "$4,120"], ["B&H Photo", "$2,623"]];

const sheetTitle = { margin: 0, fontSize: 22, lineHeight: "28px", fontWeight: 700 };
const sheetNote = { fontWeight: 500, color: "#61666b", fontSize: 16 };
const cite = { color: "#2c5ba0", fontSize: 13, fontWeight: 700 };
const outline = { minHeight: 44, padding: "0 16px", border: "1px solid #26292c", background: "transparent", color: "#26292c", fontSize: 15, cursor: "pointer" };

// A "label ........ value" line, like a printed form.
function Leader({ label, value, size = 20, as = "div" }: { label: React.ReactNode; value: string; size?: number; as?: "div" | "dl" }) {
  const dots = <span aria-hidden="true" style={{ flex: 1, borderBottom: "2px dotted #c9ccce", transform: "translateY(-5px)" }} />;
  if (as === "dl") {
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0" }}>
        <dt>{label}</dt>{dots}<dd className="mono" style={{ margin: 0, fontSize: size, fontWeight: 700 }}>{value}</dd>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <span>{label}</span>{dots}<span className="mono" style={{ fontSize: size, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// Drops a receipt into the closed folder every 3.4 seconds, up to 160 filed.
function useFiling(started: boolean, paused: boolean) {
  const [filed, setFiled] = useState(142);
  const [run, setRun] = useState(0);
  const pausedNow = useRef(paused);
  const filedNow = useRef(filed);
  useEffect(() => {
    pausedNow.current = paused;
    filedNow.current = filed;
  });

  useEffect(() => {
    if (!started) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const fileOne = () => {
      if (pausedNow.current || filedNow.current >= 160) return;
      setRun((n) => n + 1);
      timers.push(setTimeout(() => setFiled((n) => n + 1), 1150));
    };
    timers.push(setTimeout(fileOne, 700));
    const loop = setInterval(fileOne, 3400);
    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
    };
  }, [started]);

  return { filed, run };
}

export default function PartFile() {
  const [ref, seen] = useSeen();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("questions");
  const [opened, setOpened] = useState(0); // goes up each time a sheet opens, so its numbers roll in again
  const [fanned, setFanned] = useState(false);
  const [answer, setAnswer] = useState<Answer>(null);
  const [price, setPrice] = useState(2899);
  const [year, setYear] = useState(2026);
  const { filed, run } = useFiling(seen, open);
  const fanTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(fanTimer.current), []);

  const showSheet = (next: Tab) => {
    setTab(next);
    setOpen(true);
    setOpened((n) => n + 1);
    setFanned(false);
    clearTimeout(fanTimer.current);
    if (next === "work") fanTimer.current = setTimeout(() => setFanned(true), 650);
  };

  const toggleFile = () => {
    if (open) {
      setOpen(false);
      setFanned(false);
    } else {
      showSheet(tab);
    }
  };

  // The numbers on the sheets. They roll up from zero when a sheet opens.
  const total = price * 3;
  const caNow = price <= 2500 ? total : Math.min(total, 6600);
  const fed = useTween(total, 1200, opened);
  const ca = useTween(caNow, 1200, opened);
  const caLater = useTween(total - caNow, 1200, opened);
  const line1099 = useTween(year === 2025 ? 600 : 2000, 1200, opened);
  const forms = useTween(year === 2025 ? 13 : 4, 1200, opened);
  const mealsPct = useTween(year === 2025 ? 50 : 0, 1200, opened);
  const teamMeals = useTween(4180 + (answer === "team" ? 412 : 0), 1200, opened);
  const clientMeals = useTween(2960 + (answer === "client" ? 412 : 0), 1200, opened);
  const room = useTween(6600, 1200, opened);
  const used = useTween(18400, 1200, opened);
  const danaLeft = useTween(150, 1200, opened);
  const arjunLeft = useTween(300, 1200, opened);
  const filedShown = useTween(filed);

  const small = price <= 2500;
  const tabTitle = TABS.find(([key]) => key === tab)?.[1];
  const filing = FILING[run % FILING.length];

  return (
    <div id="file" ref={ref} className={seen ? "page page-in" : "page"} style={{ position: "relative", scrollMarginTop: 80 }}>
      <div aria-hidden="true" className="under" />
      <section aria-labelledby="file-title" className="paper" style={{ isolation: "isolate", overflow: "hidden" }}>
        <Holes />
        <div aria-hidden="true" className="blob" style={{ zIndex: -1, left: "50%", top: 260, width: 900, height: 640, marginLeft: -450, background: "radial-gradient(closest-side, rgba(226,212,170,.42), rgba(226,212,170,0))" }} />
        <div aria-hidden="true" className="blob" style={{ zIndex: -1, right: -200, top: 60, width: 600, height: 520, background: "radial-gradient(closest-side, rgba(44,91,160,.10), rgba(44,91,160,0))", animationDelay: "-11s" }} />
        <PartHead part="Part IV" name="Your tax file" page={5} />
        <div style={{ padding: "56px 32px 64px" }}>
          <h2 id="file-title" className="reveal" style={{ "--d": ".1s", margin: 0, fontSize: 42, lineHeight: "48px", fontWeight: 700, letterSpacing: "-0.03em", maxWidth: "26ch" } as React.CSSProperties}>
            Your 2026 tax file. <span className="muted" style={{ fontWeight: 600 }}>Kept up to date all year, not assembled in April.</span>
          </h2>

          <div className="reveal" style={{ "--d": ".25s", position: "relative", maxWidth: 940, margin: "44px auto 0" } as React.CSSProperties}>
            <div aria-hidden="true" style={{ position: "absolute", left: "5%", right: "5%", bottom: -26, height: 56, background: "radial-gradient(ellipse at center, rgba(38,41,44,.26), rgba(38,41,44,0) 70%)", filter: "blur(6px)" }} />
            <div style={{ position: "relative", height: 690, overflow: "hidden" }}>

              <div className="mono" style={{ position: "absolute", right: 40, top: 0, width: 160, height: 42, background: "linear-gradient(180deg, #efe4c8, #e4d5ac)", borderRadius: "9px 9px 0 0", boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#3d3627" }}>Tax year 2026</div>
              <div style={{ position: "absolute", left: 0, right: 0, top: 36, bottom: 0, background: "linear-gradient(180deg, #efe4c8 0%, #e6d8b2 45%, #dccb9b 100%)", borderRadius: 12, boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), inset 0 -20px 40px rgba(120,95,40,.10)", overflow: "hidden" }}>
                <Grain id="grain-back" />
              </div>

              <div aria-hidden="true">
                <div style={{ position: "absolute", left: 70, top: 50, width: 96, height: 120, background: "linear-gradient(180deg, #ffffff, #f6f7f6)", border: "1px solid #d6d9db", transform: "rotate(-6deg)", padding: "8px 10px", fontSize: 11, lineHeight: "14px", boxShadow: "0 4px 10px rgba(38,41,44,.08)" }}>
                  <strong>Uber</strong><br /><span className="mono">$38.20</span>
                </div>
                <div style={{ position: "absolute", left: 700, top: 56, width: 118, height: 110, background: "linear-gradient(180deg, #ffffff, #f6f7f6)", border: "1px solid #d6d9db", transform: "rotate(5deg)", padding: "8px 10px", fontSize: 11, lineHeight: "14px", boxShadow: "0 4px 10px rgba(38,41,44,.08)" }}>
                  <strong>Staples</strong><br /><span className="mono">$212.00</span>
                </div>
                <div style={{ position: "absolute", left: 30, right: 30, top: 104, height: 60, background: "repeating-linear-gradient(180deg, #fbfbf9 0 4px, #e2ded2 4px 5px)", boxShadow: "0 -1px 0 #e2ded2" }} />
              </div>

              <div key={run} className={run > 0 ? (run % 2 ? "file-a" : "file-b") : ""} aria-hidden="true" style={{ position: "absolute", left: 470, top: 6, width: 120, padding: "8px 10px", background: "linear-gradient(180deg, #ffffff, #f6f7f6)", border: "1px solid #c9ccce", boxShadow: "0 10px 22px rgba(38,41,44,.14)", fontSize: 11, lineHeight: "15px", opacity: 0 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{filing[0]}</p>
                <p className="mono" style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700 }}>{filing[1]}</p>
              </div>

              <div role="tablist" aria-label="Tax file sections" style={{ position: "absolute", left: 30, right: 30, top: 64, height: 40, display: "flex", zIndex: 1 }}>
                {TABS.map(([key, label], i) => {
                  const selected = open && tab === key;
                  return (
                    <button key={key} type="button" role="tab" aria-selected={selected} onClick={() => showSheet(key)} className="smooth"
                      style={{ position: "relative", flex: "1 1 0", marginRight: -8, minHeight: 40, padding: "0 14px", border: 0, borderRadius: "10px 10px 0 0", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", zIndex: selected ? 10 : 5 - i,
                        ...(selected
                          ? { background: "linear-gradient(180deg, #ffffff, #fdfdfc)", color: "#26292c", fontWeight: 700, transform: "translateY(0)", boxShadow: "0 -4px 12px rgba(90,70,30,.12)" }
                          : { background: "linear-gradient(180deg, #f0e5c9, #ddcd9f)", color: "#3d3627", fontWeight: 500, transform: "translateY(3px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), 3px 0 6px rgba(90,70,30,.14)" }) }}>
                      {label}
                      {key === "questions" && answer === null && (
                        <span style={{ marginLeft: 6, padding: "0 6px", borderRadius: 8, background: "#2c5ba0", color: "#ffffff", fontSize: 12, lineHeight: "18px" }}>1</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {open && (
                <div role="tabpanel" aria-label={tabTitle} style={{ position: "absolute", left: 30, right: 30, top: 104, bottom: 96, background: "linear-gradient(180deg, #fdfdfc, #f8f8f6)", boxShadow: "0 1px 0 #d8c79c, 0 14px 30px rgba(38,41,44,.12)", overflow: "hidden", zIndex: 2 }}>
                  <div aria-hidden="true" style={{ position: "absolute", left: 56, top: 0, bottom: 0, width: 1, background: "#cfdcea" }} />
                  <div key={opened} className={opened % 2 ? "sheet-a" : "sheet-b"} style={{ position: "absolute", inset: 0, padding: "28px 36px 28px 80px" }}>

                    {tab === "questions" && (
                      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
                        <p style={sheetTitle}>Questions <span style={sheetNote}>{answer === null ? "1 open" : "all answered"}</span></p>
                        <div style={{ padding: "16px 0", borderTop: "1px solid #e3e5e7", borderBottom: "1px solid #e3e5e7" }}>
                          <p style={{ margin: 0, fontSize: 17, lineHeight: "26px" }}>
                            Sweetgreen, <span className="mono" style={{ fontWeight: 700 }}>$412</span> on Nov 13. Was this lunch for your team at the office, or a client?
                          </p>
                          <p className="muted" style={{ margin: "4px 0 0", fontSize: 15 }}>
                            Team meals at the office: 0% federal, still 100% in California. Client meals: 50% on both. It depends on the facts. <span className="mono" style={{ ...cite, fontSize: undefined }}>[[IRC 274(o)]]</span>
                          </p>
                          {answer === null ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                              <button type="button" onClick={() => setAnswer("team")} style={outline}>Team at the office</button>
                              <button type="button" onClick={() => setAnswer("client")} style={outline}>A client</button>
                            </div>
                          ) : (
                            <p style={{ margin: "12px 0 0", color: "#2c5ba0", fontWeight: 600 }}>
                              Filed as {answer === "team" ? "a team meal: 0% federal, 100% California." : "a client meal, 50% deductible."}{" "}
                              <button type="button" onClick={() => setAnswer(null)} style={{ marginLeft: 8, minHeight: 32, border: 0, background: "transparent", color: "#2c5ba0", textDecoration: "underline", fontSize: 15, cursor: "pointer" }}>Undo</button>
                            </p>
                          )}
                        </div>
                        <Leader label="Team meals at the office, 0% federal" value={money(teamMeals)} />
                        <Leader label="Client meals, 50% deductible" value={money(clientMeals)} />
                        <p className="muted" style={{ margin: "auto 0 0", fontSize: 14 }}>Answered earlier: Uber, $38.20 on Nov 3 (client visit). Staples, $212 on Oct 28 (office supplies).</p>
                        {answer !== null && (
                          <div className="stamp mono" aria-hidden="true" style={{ position: "absolute", right: 8, top: 4, padding: "8px 16px", border: "3px double #2c5ba0", color: "#2c5ba0", fontSize: 26, fontWeight: 700, transform: "rotate(-8deg)", opacity: 0.9 }}>Answered</div>
                        )}
                      </div>
                    )}

                    {tab === "buy" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <p style={sheetTitle}>Before you buy <span style={sheetNote}>3 laptops, in use by Dec 10</span></p>
                        <fieldset style={{ margin: 0, padding: 0, border: 0, display: "flex", flexWrap: "wrap", gap: "8px 22px", alignItems: "center" }}>
                          <legend className="muted" style={{ float: "left", marginRight: 6 }}>Price each, tax and shipping included</legend>
                          {[2899, 2399].map((p) => (
                            <label key={p} className="mono" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, cursor: "pointer", fontSize: 20, fontWeight: 700 }}>
                              <input type="radio" name="laptop" checked={price === p} onChange={() => setPrice(p)} style={{ width: 18, height: 18, margin: 0, accentColor: "#2c5ba0" }} />
                              {money(p)}
                            </label>
                          ))}
                        </fieldset>
                        <div aria-hidden="true" style={{ position: "relative", height: 46 }}>
                          <div style={{ position: "absolute", left: 0, right: 0, top: 12, height: 2, background: "#d6d9db" }} />
                          <div className="smooth" style={{ position: "absolute", left: 0, right: 0, top: 11, height: 4, background: "#26292c", transformOrigin: "left center", transform: `scaleX(${(price / 3000).toFixed(3)})` }} />
                          <div style={{ position: "absolute", left: "83.3%", top: 2, width: 2, height: 24, background: "#26292c" }} />
                          <span style={{ position: "absolute", left: "83.3%", top: 26, transform: "translateX(-50%)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>$2,500 small-item line</span>
                          <div className="smooth" style={{ position: "absolute", left: 0, right: 0, top: 5, height: 16, transform: `translateX(${((price / 3000) * 100).toFixed(1)}%)` }}>
                            <div style={{ width: 16, height: 16, marginLeft: -8, borderRadius: "50%", background: "#fcfcfa", border: "3px solid #2c5ba0" }} />
                          </div>
                        </div>
                        <p style={{ margin: 0, color: "#2c5ba0", fontWeight: 600 }}>
                          {small ? "$101 under the line per laptop, so each one is written off right away." : "$399 over the line per laptop, so each one counts as equipment."}
                        </p>
                        <dl style={{ margin: 0 }}>
                          <Leader as="dl" label="Federal, written off this year" value={money(fed)} />
                          <Leader as="dl" label="California, written off this year" value={money(ca)} />
                          <Leader as="dl" label="California, spread over later years" value={money(caLater)} />
                        </dl>
                      </div>
                    )}

                    {tab === "limits" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        <p style={sheetTitle}>Limits <span style={sheetNote}>how much room is left</span></p>
                        {[
                          { name: "California equipment room", left: money(room), scale: 0.74, color: "#26292c", delay: ".1s" },
                          { name: "Dana Reyes, toward the 1099 line", left: money(danaLeft), scale: 0.925, color: "#2c5ba0", delay: ".2s" },
                          { name: "Arjun Patel, toward the 1099 line", left: money(arjunLeft), scale: 0.85, color: "#26292c", delay: ".3s" },
                        ].map((l) => (
                          <div key={l.name}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <span>{l.name}</span><span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{l.left} left</span>
                            </div>
                            <div aria-hidden="true" style={{ height: 8, marginTop: 8, background: "#e6e8ea" }}>
                              <div className="grow" style={{ height: 8, background: l.color, transformOrigin: "left center", transform: `scaleX(${l.scale})`, animationDelay: l.delay }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "#eef3fa", color: "#1d3f73", fontSize: 15, lineHeight: "22px" }}>
                          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 2 }}>
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                          </svg>
                          <span>You get a heads-up when anyone gets within $500 of a line, so there&apos;s time to act.</span>
                        </div>
                      </div>
                    )}

                    {tab === "rules" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <p style={sheetTitle}>Rule changes</p>
                          <div role="group" aria-label="Rules for tax year" style={{ display: "inline-flex", border: "1px solid #26292c" }}>
                            {[2025, 2026].map((y) => (
                              <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)} className="smooth"
                                style={{ minHeight: 40, padding: "0 14px", border: 0, fontSize: 15, cursor: "pointer", ...(year === y ? { background: "#26292c", color: "#fdfdfc", fontWeight: 600 } : { background: "transparent", color: "#26292c" }) }}>
                                {y} rules
                              </button>
                            ))}
                          </div>
                        </div>
                        <dl style={{ margin: 0 }}>
                          {[
                            { label: "1099 reporting line, federal", source: "OBBBA 70433", value: money(line1099) },
                            { label: "1099 forms you need to file", source: "Your contractors", value: String(Math.round(forms)) },
                            { label: "Office team meals deductible, federal", source: "IRC 274(o)", value: Math.round(mealsPct) + "%" },
                          ].map((row) => (
                            <div key={row.label} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "12px 0", borderBottom: "1px solid #e3e5e7" }}>
                              <dt>{row.label} <span className="mono" style={cite}>[[{row.source}]]</span></dt>
                              <span aria-hidden="true" style={{ flex: 1, borderBottom: "2px dotted #c9ccce", transform: "translateY(-5px)" }} />
                              <dd className="mono" style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Each rule is stored with its source and start date. A person approves every update before TrimTax uses it.</p>
                      </div>
                    )}

                    {tab === "work" && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px 40px" }}>
                        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 12 }}>
                          <p style={sheetTitle}>Show the work</p>
                          <p className="mono" style={{ margin: 0, fontSize: 44, lineHeight: "48px", fontWeight: 700 }}>
                            {money(room)}<sup style={{ fontFamily: "var(--sans)", fontSize: 14, color: "#2c5ba0", marginLeft: 4 }}>T</sup>
                          </p>
                          <p className="muted" style={{ margin: 0 }}>California equipment room left</p>
                          <ol style={{ margin: "4px 0 0", padding: 0, listStyle: "none", borderLeft: "2px solid #2c5ba0" }}>
                            <li style={{ padding: "6px 0 6px 14px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <span>California cap <span className="mono" style={cite}>[[CA Rev. &amp; Tax. 17255]]</span></span><span className="mono" style={{ fontWeight: 700 }}>$25,000</span>
                            </li>
                            <li style={{ padding: "6px 0 6px 14px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <span>Equipment in use <span className="mono" style={cite}>[[4 receipts]]</span></span><span className="mono" style={{ fontWeight: 700 }}>− {money(used)}</span>
                            </li>
                            <li style={{ padding: "6px 0 6px 14px", display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 700 }}>
                              <span>Room left</span><span className="mono">{money(room)}</span>
                            </li>
                          </ol>
                          <button type="button" onClick={() => setFanned(!fanned)} style={{ ...outline, alignSelf: "flex-start" }}>
                            {fanned ? "Stack the receipts" : "Fan out the 4 receipts"}
                          </button>
                        </div>
                        <div aria-hidden="true" style={{ flex: "0 0 300px", position: "relative", height: 330 }}>
                          {RECEIPTS.map(([vendor, amount], i) => (
                            <div key={vendor} className="fan" style={{ position: "absolute", left: 20, top: 20, width: 170, padding: "10px 12px", background: "#ffffff", border: "1px solid #d6d9db", boxShadow: "0 6px 16px rgba(38,41,44,.10)", fontSize: 12, lineHeight: "16px", transitionDelay: `${i * 60}ms`,
                              transform: fanned ? `translate(${i * 24}px, ${i * 62}px) rotate(${i * 3 - 5}deg)` : `translate(${i * 2}px, ${i * 3}px) rotate(${i % 2 ? 2 : -2}deg)` }}>
                              <p style={{ margin: 0, fontWeight: 700 }}>{vendor}</p>
                              <p className="mono" style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700 }}>{amount} <span style={{ fontFamily: "var(--sans)", color: "#2c5ba0", fontSize: 12 }}>T</span></p>
                              <div style={{ marginTop: 6, height: 5, background: "repeating-linear-gradient(90deg, #d6d9db 0 3px, transparent 3px 6px)" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="front" style={{ position: "absolute", left: 0, right: 0, top: 150, bottom: 0, transform: open ? "translateY(calc(100% - 72px))" : "translateY(0)", zIndex: 3 }}>
                <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: -18, height: 18, background: "linear-gradient(180deg, rgba(90,70,30,0), rgba(90,70,30,.16))" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #eee2c4 0%, #e6d7af 40%, #dac996 100%)", borderRadius: 12, boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), inset 0 -30px 60px rgba(120,95,40,.12)", overflow: "hidden", WebkitMaskImage: "radial-gradient(circle 40px at 50% 0, transparent 39px, #000 40px)", maskImage: "radial-gradient(circle 40px at 50% 0, transparent 39px, #000 40px)" }}>
                  <Grain id="grain-front" />
                  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
                    <span className="mono" style={{ fontWeight: 700, color: "#3d3627" }}>Tidewell Labs</span>
                    <button type="button" onClick={toggleFile} style={{ minHeight: 44, padding: "0 18px", border: 0, background: "linear-gradient(180deg, #33373b, #1f2225)", color: "#fdfdfc", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 14px rgba(38,41,44,.22)" }}>
                      {open ? "Close the file" : "Open the file"}
                    </button>
                  </div>
                  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%) rotate(-1deg)", width: 340, background: "linear-gradient(180deg, #ffffff, #f7f7f5)", border: "1px solid #d8c79c", padding: "22px 24px 20px", boxShadow: "0 8px 20px rgba(90,70,30,.14)" }}>
                    <svg aria-hidden="true" width="22" height="58" viewBox="0 0 22 58" fill="none" stroke="#8c9196" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 22, top: -22 }}>
                      <path d="M6 44V10a5 5 0 0 1 10 0v38a8 8 0 0 1-16 0V16" />
                    </svg>
                    <p className="muted" style={{ margin: "0 0 0 30px", fontSize: 13 }}>Tax file</p>
                    <p className="mono" style={{ margin: "6px 0 0", fontSize: 26, lineHeight: "30px", fontWeight: 700 }}>Tidewell Labs</p>
                    <p style={{ margin: "6px 0 0", fontSize: 15 }}>Tax year 2026, federal and California</p>
                    <p className="muted" style={{ margin: "14px 0 0", paddingTop: 12, borderTop: "1px solid #e3e5e7", fontSize: 14 }}>
                      <span className="mono" style={{ fontWeight: 700, color: "#26292c" }}>{Math.round(filedShown)}</span> receipts filed.{" "}
                      {answer === null ? "1 question open." : "No questions open."} 42 days left.
                    </p>
                  </div>
                  <div aria-hidden="true" className="mono" style={{ position: "absolute", right: 64, top: 104, padding: "5px 10px", border: "2px double #2c5ba0", color: "#2c5ba0", fontSize: 15, fontWeight: 700, transform: "rotate(6deg)", opacity: 0.7 }}>Updated today</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Paper grain over the manila.
function Grain({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.2, mixBlendMode: "multiply", pointerEvents: "none" }}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}
