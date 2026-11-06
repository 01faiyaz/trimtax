"use client";

// Add a transactions CSV to a "Start fresh" company. Rows with a category count right away;
// rows without one show up on the Questions tab for you to pick.

import { useState } from "react";
import { uploadFile } from "@/lib/api";

type ImportResult = {
  added: number;
  needs_category: number;
  skipped: number;
  problems: { line: number; reason: string }[];
};

type Props = {
  workspaceId: string;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  goTo: (tab: string) => void;
};

// A small made-up file to try it with. One row has no category, so it becomes a question.
const SAMPLE = `date,merchant,amount,category,memo,payee
2026-01-05,GitHub,44.00,software,Team plan,
2026-02-12,Sweetgreen,412.00,,Lunch delivered to the office,
2026-03-03,Apple,3848.50,equipment,Laptop,
2026-04-18,Maya Lindqvist,1500.00,contractor,Design work,Maya Lindqvist
2026-05-07,United Airlines,612.40,travel,Client visit,
`;

const sampleLink = "data:text/csv;charset=utf-8," + encodeURIComponent(SAMPLE);

export default function ImportTransactions({ workspaceId, refresh, notify, goTo }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function importFile(file: File) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const imported = await uploadFile<ImportResult>(`/workspaces/${workspaceId}/transactions`, file);
      setResult(imported);
      notify(`Added ${imported.added} transaction${imported.added === 1 ? "" : "s"}.`);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="card" style={{ margin: "24px 0" }}>
      <p className="section-label">Add your transactions</p>
      <p className="small muted" style={{ maxWidth: "62ch" }}>
        A CSV with <code>date</code>, <code>merchant</code> and <code>amount</code> columns. Add <code>category</code> to
        sort rows yourself; rows without one wait for you on the Questions tab. Contractor payments need a{" "}
        <code>payee</code> to count toward 1099s. You can also upload receipts on the Questions tab.
      </p>

      {error && <p className="error">{error}</p>}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <label className="button" style={{ cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}>
          {busy ? "Importing…" : "Choose a CSV"}
          <input type="file" accept=".csv,text/csv" disabled={busy} style={{ display: "none" }}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) importFile(file); e.target.value = ""; }} />
        </label>
        <a className="small" href={sampleLink} download="sample-transactions.csv">Download a sample file</a>
      </div>

      {result && (
        <div className="small" style={{ marginTop: 16 }}>
          <p>
            Added {result.added}. Skipped {result.skipped}.
            {result.needs_category > 0 && (
              <>
                {" "}{result.needs_category} need a category.{" "}
                <button className="linklike" onClick={() => goTo("questions")}>Sort them on the Questions tab</button>
              </>
            )}
          </p>
          {result.problems.length > 0 && (
            <ul className="small muted" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {result.problems.map((p) => (
                <li key={`${p.line}-${p.reason}`}>Line {p.line}: {p.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
