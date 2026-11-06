"use client";

// "Start fresh": a short profile for your own company. After this the tax file is empty,
// and you add transactions from a CSV or upload receipts.

import { useState } from "react";
import { startFresh } from "@/lib/api";

type Props = {
  onDone: (workspaceId: string) => void;
  onCancel: () => void;
};

export default function StartFresh({ onDone, onCancel }: Props) {
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [election, setElection] = useState(true);
  const [audited, setAudited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const incomeDollars = Number(income.replace(/[$,\s]/g, ""));
  const ready = name.trim() !== "" && income.trim() !== "" && Number.isFinite(incomeDollars) && incomeDollars >= 0;

  async function create() {
    setBusy(true);
    setError("");
    try {
      const id = await startFresh({
        name: name.trim(),
        expected_net_income_cents: Math.round(incomeDollars * 100),
        small_item_election: election,
        has_audited_financials: audited,
      });
      onDone(id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="sheet" style={{ maxWidth: 720 }}>
      <h1 className="page-title">Start fresh with your company.</h1>
      <p className="muted" style={{ maxWidth: "62ch" }}>
        TrimTax&apos;s rules are set up for a California S corporation, like the demo company. Your tax file starts empty
        and uses today&apos;s date. Next you&apos;ll add transactions from a CSV or upload receipts.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="fresh-name">Company name</label>
        <input id="fresh-name" type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="fresh-income">Expected 2026 business income, in dollars</label>
        <input id="fresh-income" type="text" inputMode="decimal" value={income} placeholder="120,000" onChange={(e) => setIncome(e.target.value)} />
        <span className="small muted">Profit before any big purchase you&apos;re still deciding on. California&apos;s equipment write-off can&apos;t be more than this.</span>
      </div>

      <fieldset className="field" style={{ marginTop: 16, border: 0, padding: 0 }}>
        <legend>The $2,500 small-item rule</legend>
        <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
          <input type="checkbox" checked={election} onChange={(e) => setElection(e.target.checked)} />
          We make the yearly election to write off items up to $2,500 right away
        </label>
        <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
          <input type="checkbox" checked={audited} onChange={(e) => setAudited(e.target.checked)} />
          We have audited financial statements (the line is $5,000 then)
        </label>
      </fieldset>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="button" disabled={!ready || busy} onClick={create}>
          {busy ? "Creating…" : "Create my tax file"}
        </button>
        <button className="button light" disabled={busy} onClick={onCancel}>Back to the demo</button>
      </div>
    </div>
  );
}
