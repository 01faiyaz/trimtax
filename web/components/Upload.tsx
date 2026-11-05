"use client";

import { useState } from "react";
import { receiptImageUrl, uploadFile } from "@/lib/api";

type UploadResult = {
  summary: { state: "confirmed" | "needs_answer" | "cant_determine"; reason?: string; category?: string; question?: string };
  image: string;
  note: string;
};

type Props = { workspaceId: string; onDone: () => Promise<void> };

export default function Upload({ workspaceId, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  async function send(file: File) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const answer = await uploadFile<UploadResult>(`/workspaces/${workspaceId}/receipts`, file);
      setResult(answer);
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <p className="section-label">Add a receipt</p>
      <p className="small muted" style={{ marginTop: 0 }}>
        PNG, JPEG, WebP or PDF, up to 5 MB. The AI reads it; plain code decides what counts. Try one of your own.
      </p>
      <label className="button light" style={{ cursor: busy ? "default" : "pointer" }}>
        {busy ? "Reading…" : "Choose a file"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          disabled={busy}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) send(file);
            e.target.value = "";
          }}
        />
      </label>

      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      {result && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginTop: 16, flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receiptImageUrl(result.image)} alt="The receipt you uploaded" style={{ maxWidth: 160 }} className="receipt-img" />
          <div style={{ flex: "1 1 240px" }}>
            <span className={`state ${result.summary.state}`}>{stateLabel(result.summary.state)}</span>
            <p style={{ marginBottom: 0 }}>{explain(result)}</p>
            {result.note && <p className="small muted">{result.note}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function stateLabel(state: UploadResult["summary"]["state"]): string {
  if (state === "confirmed") return "Confirmed";
  if (state === "needs_answer") return "Needs one answer";
  return "Can't determine";
}

function explain(result: UploadResult): string {
  const summary = result.summary;
  if (summary.state === "confirmed") return "Read and sorted. The numbers on every tab now include it.";
  if (summary.state === "needs_answer") return "The AI wasn't sure, so it's asking you below. Nothing is counted until you answer.";
  if (summary.reason === "hidden_instruction") return "The receipt had text telling the AI what to do. It was treated as data, ignored and logged. Nothing counted.";
  if (summary.reason === "unreadable_total") return "No total could be read, so no number is shown.";
  return "The receipt couldn't be read this time, so no number is shown.";
}
