"use client";

// Part VI, "How every number is linked": a graph of where the $6,600 California room comes
// from, then how it's built and how we test it. The code, rule and test shown in the graph
// are the real ones from api/engine/equipment.py, rules/2026.yaml and api/tests/test_equipment.py,
// and the test scores are the real ones from the README.

import { useState } from "react";
import Fit from "./Fit";
import { Holes, PartHead } from "./Paper";
import { useDrift } from "./useDrift";
import { useNarrow } from "./useNarrow";
import { useSeen } from "./useSeen";

type Node = {
  id: string; label: string; kind: string; x: number; y: number; r: number; fill?: string; stroke?: string;
  text?: string; code?: string; date?: string; item?: string;
};

const NODES: Node[] = [
  { id: "room", label: "$6,600 room left", kind: "Number", x: 360, y: 290, r: 16, fill: "#26292c", stroke: "#26292c",
    text: "Room left on your California equipment write-off. Worked out by the engine, never written by the AI.",
    code: 'california_room(txns, rules, co)\n# room_cents: 660000' },
  { id: "fn", label: "california_room()", kind: "Code", x: 230, y: 200, r: 10, fill: "#fdfdfc", stroke: "#26292c",
    text: "A few lines of plain Python, shortened here. Every number on screen comes from functions like this one.",
    code: 'rule = rules.rule("ca_section_179")\nbought = equipment_bought(txns)\ncap = section_179_cap(rule, bought)\nused = min(bought, cap)\nroom = cap - used' },
  { id: "cap", label: "CA equipment cap", kind: "Rule", x: 120, y: 120, r: 10, fill: "#fdfdfc", stroke: "#2c5ba0",
    text: "California caps the year-one equipment write-off at $25,000. It shrinks once purchases pass $200,000 and can't be more than business income.",
    code: "id: ca_section_179\njurisdiction: california\nlimit_cents: 2500000\nphaseout_start_cents: 20000000\nlimited_to_business_income: true" },
  { id: "source", label: "CA Rev. & Tax. 17255", kind: "Source", x: 170, y: 40, r: 7, fill: "#fdfdfc", stroke: "#61666b",
    text: "The California law the cap comes from. Every rule in TrimTax keeps a link to its source." },
  { id: "ruleset", label: "Ruleset 2026.1", kind: "Ruleset", x: 60, y: 240, r: 8, fill: "#fdfdfc", stroke: "#61666b",
    text: "Federal and California rules for tax year 2026. A person approves every update before TrimTax uses it." },
  { id: "test", label: "Hand-checked test", kind: "Test", x: 230, y: 420, r: 9, fill: "#e8f4ee", stroke: "#2f7d55",
    text: "Worked out by hand first, then checked on every change. It passes.",
    code: 'def test_california_room_is_6600():\n    room = california_room(...)\n    assert room["used_cents"] \\\n        == 1840000\n    assert room["room_cents"] \\\n        == 660000' },
  { id: "used", label: "Equipment in use", kind: "Total", x: 500, y: 200, r: 12, fill: "#26292c", stroke: "#26292c",
    text: "Four receipts for equipment put to use this year add up to $18,400. Every item is over the $2,500 small-item line, so each one counts as equipment." },
  { id: "packet", label: "Accountant packet", kind: "Output", x: 520, y: 430, r: 10, fill: "#fdfdfc", stroke: "#26292c",
    text: "The number goes into the packet for your accountant, with every link on this graph attached." },
  { id: "r1", label: "Apple $7,697", kind: "Receipt", x: 600, y: 70, r: 7, date: "Mar 3", item: "2 MacBook Pros at $3,848.50" },
  { id: "r2", label: "Dell $3,960", kind: "Receipt", x: 670, y: 160, r: 7, date: "Jun 18", item: "1 server" },
  { id: "r3", label: "Herman Miller $4,120", kind: "Receipt", x: 640, y: 290, r: 7, date: "Jun 18", item: "1 conference table" },
  { id: "r4", label: "B&H Photo $2,623", kind: "Receipt", x: 450, y: 70, r: 7, date: "Sep 9", item: "1 camera kit" },
];

const LINKS: [string, string][] = [
  ["fn", "room"], ["cap", "fn"], ["source", "cap"], ["ruleset", "cap"], ["used", "fn"],
  ["test", "fn"], ["room", "packet"],
  ["r1", "used"], ["r2", "used"], ["r3", "used"], ["r4", "used"],
];

const SKILLS = [
  ["extract_receipt", "reads fields, with the line it found them on"],
  ["classify_transaction", "fixed list of categories, can say unsure"],
  ["ask_clarifying_question", "one question, not a guess"],
  ["propose_rule_update", "a person approves it"],
];

const SCORES = [
  ["Clear purchases sorted right", "74 / 75", "17 / 17"],
  ["Unclear purchases handled right", "18 / 20", "8 / 10"],
  ["Hidden instructions ignored", "5 / 5", "2 / 2"],
  ["Dollar figures the AI made up", "0", "0"],
];

function GraphView({ stacked = false }: { stacked?: boolean }) {
  const [selected, setSelected] = useState("room");
  const t = useDrift(); // the nodes drift a little so the graph feels alive

  const at: Record<string, Node & { px: number; py: number }> = {};
  NODES.forEach((n, i) => {
    at[n.id] = { ...n, px: n.x + Math.sin(t * 0.6 + i * 1.7) * 5, py: n.y + Math.cos(t * 0.5 + i * 1.3) * 5 };
  });

  const linked = LINKS.filter(([a, b]) => a === selected || b === selected).map(([a, b]) => (a === selected ? b : a));
  const near = new Set([selected, ...linked]);
  const chosen = at[selected];
  const text = chosen.kind === "Receipt"
    ? `Read by the AI on ${chosen.date}: ${chosen.item}. Over $2,500 per item, and traced to the card transaction, so it counts toward equipment in use.`
    : chosen.text;

  // The graph itself. On phones it's scaled to fit and the panel goes underneath.
  const graph = (
    <div style={{ position: "relative", width: 720, height: 560 }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#e4e7e9 1px, transparent 1px), linear-gradient(90deg, #e4e7e9 1px, transparent 1px)", backgroundSize: "32px 32px", WebkitMaskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)", maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)" }} />
      <svg width="720" height="560" viewBox="0 0 720 560" role="img" aria-label="How the $6,600 California equipment room is linked to its rule, code, test and four receipts" style={{ position: "relative" }}>
        {LINKS.map(([a, b], i) => {
          const lit = a === selected || b === selected;
          return (
            <line key={a + b} className="edge" x1={at[a].px.toFixed(1)} y1={at[a].py.toFixed(1)} x2={at[b].px.toFixed(1)} y2={at[b].py.toFixed(1)} pathLength={1}
              stroke={lit ? "#2c5ba0" : "#b9bec2"} strokeWidth={lit ? 1.8 : 1} strokeOpacity={lit ? 1 : 0.7} style={{ animationDelay: `${(0.2 + i * 0.06).toFixed(2)}s` }} />
          );
        })}
        {NODES.map((n, i) => {
          const p = at[n.id];
          const receipt = n.kind === "Receipt";
          return (
            <g key={n.id} className="node-pop" onClick={() => setSelected(n.id)} opacity={near.has(n.id) ? 1 : 0.35} style={{ cursor: "pointer", animationDelay: `${(i * 0.04).toFixed(2)}s` }}>
              <circle cx={p.px.toFixed(1)} cy={p.py.toFixed(1)} r={n.r + 6} fill="none" stroke="#2c5ba0" strokeWidth="2" strokeOpacity={n.id === selected ? 1 : 0} />
              <circle cx={p.px.toFixed(1)} cy={p.py.toFixed(1)} r={n.r} fill={receipt ? "#e9dcb8" : n.fill} stroke={receipt ? "#b8a675" : n.stroke} strokeWidth="1.5" />
              <text x={p.px.toFixed(1)} y={(p.py + n.r + 16).toFixed(1)} textAnchor="middle" fontSize="12" fontWeight={n.id === selected ? 700 : 500} fill="#3f454b">{n.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );

  return (
    <div style={{ position: "relative", display: "flex", background: "#fdfdfc", lineHeight: "normal", ...(stacked ? { flexDirection: "column" } : { width: 1080, height: 560 }) }}>
      {stacked ? <Fit width={720} height={560}>{graph}</Fit> : graph}

      <aside aria-label="Selected item" aria-live="polite" style={{ ...(stacked ? { borderTop: "1px solid #e3e5e6" } : { width: 360, height: 560, borderLeft: "1px solid #e3e5e6" }), boxSizing: "border-box", padding: "28px 28px 24px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#61666b" }}>{chosen.kind}</p>
        <p style={{ margin: 0, fontSize: 22, lineHeight: "28px", fontWeight: 700 }}>{chosen.label}</p>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "23px", color: "#4f555b" }}>{text}</p>
        {chosen.code && (
          <pre style={{ margin: 0, padding: 14, background: "#14181d", color: "#e8eaec", fontFamily: "var(--mono)", fontSize: 12, lineHeight: "19px", overflowX: "auto", whiteSpace: "pre" }}>{chosen.code}</pre>
        )}
        <div style={{ marginTop: "auto" }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#61666b" }}>Linked to</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {linked.map((id) => (
              <button key={id} type="button" onClick={() => setSelected(id)} style={{ minHeight: 32, padding: "0 8px", border: 0, borderRadius: 4, background: "#eef3fa", color: "#2c5ba0", fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                [[{at[id].label}]]
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function PartBuilt() {
  const [ref, seen] = useSeen();
  const narrow = useNarrow();
  const reveal = (d: string) => ({ "--d": d } as React.CSSProperties);
  const row = { display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid #e3e5e6" };
  const score = { margin: 0, width: 78, flex: "none", textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700 } as const;

  return (
    <div id="built" ref={ref} className={seen ? "page page-in" : "page"} style={{ position: "relative", scrollMarginTop: 80 }}>
      <div aria-hidden="true" className="under" />
      <section aria-labelledby="built-title" className="paper">
        <Holes />
        <PartHead part="Part VI" name="How every number is linked" page={7} />
        <div className="page-body" style={{ paddingBottom: 56 }}>
          <h2 id="built-title" className="reveal page-title" style={{ ...reveal(".1s"), maxWidth: "28ch" }}>
            Every number links back to where it came from. <span className="muted" style={{ fontWeight: 600 }}>Click any dot.</span>
          </h2>
          <div className="reveal" style={{ ...reveal(".25s"), marginTop: 36, border: "1px solid #e3e5e6", overflow: "hidden" }}>
            {narrow ? seen && <GraphView stacked /> : <Fit width={1080} height={560}>{seen && <GraphView />}</Fit>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 32, marginTop: 40 }}>
            {[
              ["The AI reads and asks", "Claude reads receipts and sorts each purchase into a fixed list of categories. If the answer would change a number, it asks you one question."],
              ["Plain code does the math", "Limits and write-offs come from tested Python and versioned rule files, never from the AI."],
              ["You stay in charge", "Nothing is filed. Your accountant gets a packet with every open question and every link."],
            ].map(([title, body], i) => (
              <div key={title} className="reveal" style={reveal(`${0.4 + i * 0.12}s`)}>
                <p style={{ margin: 0, fontWeight: 700 }}>{title}</p>
                <p style={{ margin: "6px 0 0", color: "#4f555b" }}>{body}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 24, marginTop: 48 }}>
            <div className="reveal" style={{ ...reveal(".3s"), padding: "24px 26px", background: "#ffffff", border: "1px solid #d6d9db", boxShadow: "0 16px 34px rgba(38,41,44,.08)" }}>
              <p style={{ margin: 0, fontSize: 20, lineHeight: "28px", fontWeight: 700 }}>How we test it</p>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#61666b" }}>100 labeled purchases we tuned on, and a held-out set of 29 we never tuned on.</p>
              <div aria-hidden="true" style={{ display: "flex", height: 28, marginTop: 18, fontSize: 12, fontWeight: 700, lineHeight: "28px", color: "#ffffff" }}>
                <span style={{ flex: 75, paddingLeft: 10, background: "linear-gradient(180deg, #33373b, #26292c)" }}>75 clear</span>
                <span style={{ flex: 20, paddingLeft: 8, background: "linear-gradient(180deg, #3a69b0, #2c5ba0)" }}>20 unclear</span>
                <span style={{ flex: 5, background: "repeating-linear-gradient(135deg, #b08a45 0 4px, #d8bf86 4px 8px)" }} />
              </div>
              <p style={{ margin: "6px 0 0", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#61666b" }}>
                <span>Should be sorted right</span><span>Ask only if it changes a number</span><span>5 injection tries</span>
              </p>
              <dl style={{ margin: "16px 0 0", fontSize: 15 }}>
                <div style={{ ...row, borderTop: 0, fontSize: 12, fontWeight: 700, color: "#61666b" }}>
                  <dt style={{ flex: 1 }} /><dd style={{ ...score, fontFamily: "inherit" }}>Main</dd><dd style={{ ...score, fontFamily: "inherit" }}>Held-out</dd>
                </div>
                {SCORES.map(([label, main, fresh]) => (
                  <div key={label} style={row}>
                    <dt style={{ flex: 1 }}>{label}</dt><dd style={score}>{main}</dd><dd style={score}>{fresh}</dd>
                  </div>
                ))}
              </dl>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "#61666b" }}>Every result, misses included, is in the README.</p>
            </div>

            <div className="reveal" style={{ ...reveal(".42s"), padding: "24px 26px", background: "linear-gradient(160deg, #2b2f33, #1d2023)", color: "#fdfdfc", boxShadow: "0 24px 48px rgba(38,41,44,.22)" }}>
              <p style={{ margin: 0, fontSize: 20, lineHeight: "28px", fontWeight: 700 }}>One agent, four skills, every call traced</p>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#c9ced3" }}>Each call logs the model, prompt version, ruleset version, time and cost.</p>
              <ol style={{ margin: "18px 0 0", padding: 0, listStyle: "none", fontFamily: "var(--mono)", fontSize: 14, lineHeight: "20px" }}>
                {SKILLS.map(([name, what]) => (
                  <li key={name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid rgba(255,255,255,.12)" }}>
                    <span>{name}</span><span style={{ color: "#8fb0e0", textAlign: "right", fontFamily: "var(--sans)", fontSize: 13 }}>{what}</span>
                  </li>
                ))}
              </ol>
              <dl style={{ margin: "18px 0 0", display: "flex", gap: 32, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.12)" }}>
                <div><dt style={{ fontSize: 13, color: "#c9ced3" }}>Failed calls, main test run</dt><dd className="mono" style={{ margin: "2px 0 0", fontSize: 24, fontWeight: 700 }}>0 of 158</dd></div>
                <div><dt style={{ fontSize: 13, color: "#c9ced3" }}>Median cost per purchase</dt><dd className="mono" style={{ margin: "2px 0 0", fontSize: 24, fontWeight: 700 }}>$0.0035</dd></div>
              </dl>
            </div>
          </div>

          <p className="reveal" style={{ ...reveal(".5s"), margin: "40px 0 0", paddingTop: 24, borderTop: "1px solid #e3e5e6", fontSize: 14, lineHeight: "22px", color: "#61666b" }}>
            <strong style={{ color: "#26292c" }}>Not covered:</strong> your total tax bill, QBI, credits, choosing an entity type, states other than California, limits that apply to each owner personally, and filing anything.
          </p>
        </div>
      </section>
    </div>
  );
}
