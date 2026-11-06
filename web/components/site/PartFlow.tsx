"use client";

// Part I, "From tap to tax file". A phone asks whether a $18.40 coffee was for the
// business. Business: the receipt flies into the tax file. Personal: it drops out.
// It plays by itself until the reader taps the phone. The phone prompt is a concept.

import { useCallback, useEffect, useRef, useState } from "react";
import Fit from "./Fit";
import { Holes, PartHead } from "./Paper";
import { useSeen } from "./useSeen";
import { useTween } from "./useTween";

type Flow = "ask" | "business" | "personal";

function usePhoneFlow(started: boolean) {
  const [flow, setFlow] = useState<Flow>("ask");
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);
  const [demo, setDemo] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const play = useCallback((choice: Flow) => {
    clearTimers();
    setFlow(choice);
    setStep(0);
    setDone(false);
    setRun((n) => n + 1);
    const steps = choice === "business" ? [450, 900, 1350] : [350];
    steps.forEach((ms, i) => timers.current.push(setTimeout(() => setStep(i + 1), ms)));
    timers.current.push(setTimeout(() => setDone(true), choice === "business" ? 1750 : 1000));
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setFlow("ask");
    setStep(0);
    setDone(false);
  }, []);

  // The demo: business, then personal, then business again, every 5.2 seconds.
  useEffect(() => {
    if (!started || !demo) return;
    let next: Flow = "business";
    const loopTimers: ReturnType<typeof setTimeout>[] = [];
    const playNext = () => {
      play(next);
      next = next === "business" ? "personal" : "business";
    };
    loopTimers.push(setTimeout(playNext, 900));
    const loop = setInterval(() => {
      reset();
      loopTimers.push(setTimeout(playNext, 700));
    }, 5200);
    return () => {
      clearInterval(loop);
      loopTimers.forEach(clearTimeout);
    };
  }, [started, demo, play, reset]);

  useEffect(() => clearTimers, []);

  const choose = (choice: Flow | "again") => {
    setDemo(false);
    if (choice === "again") reset();
    else play(choice);
  };

  return { flow, step, done, run, demo, choose };
}

const phoneButton = { minHeight: 44, borderRadius: 10, fontSize: 15, cursor: "pointer" };

export default function PartFlow() {
  const [ref, seen] = useSeen();
  const { flow, step, done, run, demo, choose } = usePhoneFlow(seen);
  const business = flow === "business";
  const personal = flow === "personal";
  const added = useTween(business && done ? 9.2 : 0);

  const nodeText = business
    ? [["AI reads the receipt", "Coffee for two, client meeting"], ["Rule applied", "Business meal, 50%"], ["Filed", "Meals tab, receipt attached"]]
    : [[personal ? "Marked personal" : "AI reads the receipt", personal ? "Not a business expense" : "Waiting for your answer"],
      ["Rule applied", personal ? "Not needed" : "Waiting"], ["Filed", personal ? "Not needed" : "Waiting"]];

  let result = "Tap Business or Personal on the phone.";
  if (business && !done) result = "Filing…";
  if (business && done) result = "Filed. $9.20 more you can deduct, with the receipt attached.";
  if (personal && done) result = "Kept out. Personal spending never touches your business taxes.";

  let receiptClass = "";
  if (business) receiptClass = run % 2 ? "fly-a" : "fly-b";
  if (personal) receiptClass = "drop";

  return (
    <div id="how" ref={ref} className={seen ? "page page-in" : "page"} style={{ position: "relative", scrollMarginTop: 80 }}>
      <div aria-hidden="true" className="under" />
      <section aria-labelledby="flow-title" className="paper">
        <Holes />
        <PartHead part="Part I" name="From tap to tax file" page={2} />
        <div style={{ padding: "56px 32px 64px" }}>
          <h2 id="flow-title" className="reveal" style={{ "--d": ".1s", margin: 0, fontSize: 42, lineHeight: "48px", fontWeight: 700, letterSpacing: "-0.03em", maxWidth: "26ch" } as React.CSSProperties}>
            From tap to tax file. <span className="muted" style={{ fontWeight: 600 }}>Every purchase is filed the moment it happens.</span>
          </h2>

          <div className="reveal" style={{ "--d": ".25s", marginTop: 44 } as React.CSSProperties}>
            <Fit width={1088} height={540}>
              <div style={{ position: "relative", height: 540 }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 240, height: 480, borderRadius: 36, background: "linear-gradient(145deg, #3a3e43, #1c1f22)", padding: 10, zIndex: 2, boxShadow: "0 30px 60px rgba(38,41,44,.25), inset 0 1px 0 rgba(255,255,255,.12)" }}>
                  <div style={{ height: "100%", borderRadius: 28, background: "linear-gradient(180deg, #ffffff, #f1f3f2)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ width: 70, height: 20, borderRadius: 10, background: "#26292c", margin: "10px auto 0" }} />
                    <div style={{ padding: "26px 18px 0", textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e3ebf6", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2c5ba0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                      </div>
                      <p className="muted" style={{ margin: "12px 0 0", fontSize: 13 }}>Paid with company card</p>
                      <p className="mono" style={{ margin: "2px 0 0", fontSize: 30, lineHeight: "36px", fontWeight: 700 }}>$18.40</p>
                      <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>Corner Coffee, 8:42 AM</p>
                    </div>
                    <div style={{ marginTop: "auto", background: "#ffffff", borderTop: "1px solid #d6d9db", borderRadius: "20px 20px 0 0", padding: "16px 16px 22px" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>TrimTax</p>
                      {flow === "ask" ? (
                        <>
                          <p style={{ margin: "4px 0 12px", fontSize: 15, lineHeight: "21px", fontWeight: 600 }}>Was this for the business?</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <button type="button" onClick={() => choose("business")} style={{ ...phoneButton, border: 0, background: "#2c5ba0", color: "#ffffff", fontWeight: 600 }}>Business</button>
                            <button type="button" onClick={() => choose("personal")} style={{ ...phoneButton, border: "1px solid #c9ccce", background: "#ffffff", color: "#26292c" }}>Personal</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p style={{ margin: "4px 0 12px", fontSize: 15, lineHeight: "21px", fontWeight: 600 }}>
                            {business ? "Got it: business. Filing it now." : "Got it: personal. Nothing to file."}
                          </p>
                          <button type="button" onClick={() => choose("again")} style={{ ...phoneButton, width: "100%", border: "1px solid #c9ccce", background: "#ffffff", color: "#26292c" }}>Try again</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="muted" style={{ position: "absolute", left: 0, top: 492, width: 240, margin: 0, textAlign: "center", fontSize: 13, lineHeight: "18px" }}>
                  {demo ? "Playing a demo. Tap the phone to try it yourself." : ""}
                </p>

                <div style={{ position: "absolute", left: 290, right: 200, top: 232, height: 2 }}>
                  <div className={business && !done ? "wire wire-on" : "wire"} style={{ position: "absolute", inset: 0 }} />
                  {nodeText.map(([label, text], i) => {
                    const reached = flow !== "ask" && step > i;
                    return (
                      <div key={i} className="smooth" style={{ position: "absolute", left: `${16.7 + i * 33.3}%`, top: -118, width: 150, marginLeft: -75, padding: 12, border: `1px solid ${reached ? "#2c5ba0" : "#d6d9db"}`, background: reached ? "#ffffff" : "#fdfdfc", transform: `translateY(${reached ? -6 : 0}px)`, opacity: personal && i > 0 ? 0.45 : 1, boxShadow: reached ? "0 12px 24px rgba(44,91,160,.14)" : "none" }}>
                        <p style={{ margin: 0, fontSize: 12, lineHeight: "16px", fontWeight: 700, color: reached ? "#2c5ba0" : "#61666b" }}>{label}</p>
                        <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: "19px" }}>{text}</p>
                      </div>
                    );
                  })}
                  <div className="muted" style={{ position: "absolute", left: -40, top: 118, width: 150, height: 56, border: "1px dashed #b4b8bc", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6, fontSize: 12 }}>
                    Personal, not tracked
                  </div>
                  <div className={business ? "carrier carrier-go" : "carrier"}>
                    <div key={run} className={receiptClass} style={{ position: "absolute", left: -54, top: -34, width: 108, padding: "8px 10px", background: "#ffffff", border: "1px solid #c9ccce", boxShadow: "0 8px 20px rgba(38,41,44,.12)", fontSize: 11, lineHeight: "15px", opacity: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>Corner Coffee</p>
                      <p className="mono" style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700 }}>$18.40</p>
                      <div aria-hidden="true" style={{ marginTop: 4, height: 6, background: "repeating-linear-gradient(90deg, #d6d9db 0 3px, transparent 3px 6px)" }} />
                    </div>
                  </div>
                </div>

                <div className={business && done ? (run % 2 ? "bump-a" : "bump-b") : ""} style={{ position: "absolute", right: 0, top: 150, width: 230, height: 170 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, width: 92, height: 22, background: "linear-gradient(180deg, #efe4c8, #e2d3a9)", borderRadius: "6px 6px 0 0" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: 18, bottom: 0, background: "linear-gradient(180deg, #efe4c8, #dccb9b)", borderRadius: "0 6px 6px 6px", boxShadow: "0 16px 32px rgba(38,41,44,.16), inset 0 1px 0 rgba(255,255,255,.6)" }} />
                  <div style={{ position: "absolute", left: 14, right: 14, top: 34, bottom: 16, background: "#ffffff", border: "1px solid #dccb9b", padding: 14 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>Tax file: meals</p>
                    <p className="mono" style={{ margin: "6px 0 0", fontSize: 28, lineHeight: "32px", fontWeight: 700, color: added > 0 ? "#2c5ba0" : "#b4b8bc" }}>+${added.toFixed(2)}</p>
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: 12, lineHeight: "16px" }}>deductible, receipt attached</p>
                  </div>
                </div>

                <p style={{ position: "absolute", left: 290, right: 0, bottom: 0, margin: 0, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px 32px" }}>
                  <span style={{ fontSize: 18, lineHeight: "28px", fontWeight: 600, color: done ? "#2c5ba0" : "#61666b" }}>{result}</span>
                  <span className="muted" style={{ fontSize: 13, lineHeight: "20px", maxWidth: "40ch" }}>Concept: the phone prompt is where TrimTax is headed. The demo starts from card and receipt data.</span>
                </p>
            </div>
            </Fit>
          </div>
        </div>
      </section>
    </div>
  );
}
