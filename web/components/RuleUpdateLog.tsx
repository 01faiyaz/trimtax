"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/api";
import { longDate } from "@/lib/format";
import type { RuleUpdate } from "@/lib/types";

// The rule update log: what the AI proposed from official text, and what a person decided.
export default function RuleUpdateLog({ year }: { year: number }) {
  const [updates, setUpdates] = useState<RuleUpdate[] | null>(null);

  useEffect(() => {
    get<RuleUpdate[]>(`/rules/${year}/updates`).then(setUpdates).catch(() => setUpdates([]));
  }, [year]);

  if (!updates) return null;

  return (
    <div style={{ marginTop: 40 }}>
      <p className="section-label">Update log</p>
      <p className="small muted" style={{ maxWidth: "62ch" }}>
        The AI reads the official text and proposes a change, quoting the sentence it relied on. Plain code checks
        that the sentence is really there. Nothing changes until a person approves it.
      </p>
      <ul className="rows">
        {updates.map((update) => (
          <li key={update.id} style={{ flexWrap: "wrap" }}>
            <span className="grow" style={{ flex: "1 1 360px" }}>
              {update.plain_words}
              <span className="figure" style={{ display: "block", marginTop: 4 }}>
                {update.from_text} → <span className="changed">{update.to_text}</span>
              </span>
              <span className="small muted" style={{ display: "block", marginTop: 4 }}>
                &ldquo;{update.quote}&rdquo;{" "}
                <a className="source" href={update.source.url} target="_blank" rel="noreferrer">[[{update.source.cite}]]</a>
              </span>
            </span>
            <span className="small muted" style={{ flex: "0 1 260px", textAlign: "right" }}>{decision(update)}</span>
          </li>
        ))}
        {updates.length === 0 && <li className="muted">No updates yet.</li>}
      </ul>
    </div>
  );
}

function decision(update: RuleUpdate): string {
  const proposed = `Proposed by the AI on ${longDate(update.proposed_on)}`;
  if (update.status === "approved" && update.decided_by && update.decided_on) {
    const where = update.outcome === "changed" ? ` Now in ruleset ${update.ruleset_version}.` : "";
    return `${proposed}, approved by ${update.decided_by} on ${longDate(update.decided_on)}.${where}`;
  }
  if (update.status === "rejected" && update.decided_by && update.decided_on) {
    return `${proposed}, rejected by ${update.decided_by} on ${longDate(update.decided_on)}.`;
  }
  return `${proposed}. Waiting for a person to approve it.`;
}
