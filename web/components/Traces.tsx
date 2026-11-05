"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/api";

type Trace = {
  id: string;
  skill: string;
  model: string;
  prompt_version: string;
  ruleset_version: string;
  ok: boolean;
  latency_ms: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_nanodollars?: number | null;
  used_template?: boolean;
  error?: string;
};

// Every AI call, as logged by the API: which skill, which model and prompt, time and cost.
export default function Traces({ workspaceId, version }: { workspaceId: string; version: number }) {
  const [traces, setTraces] = useState<Trace[] | null>(null);

  useEffect(() => {
    let stale = false;
    get<{ traces: Trace[] }>(`/workspaces/${workspaceId}/traces`)
      .then((result) => !stale && setTraces(result.traces))
      .catch(() => !stale && setTraces([]));
    return () => {
      stale = true;
    };
  }, [workspaceId, version]);

  return (
    <div className="panel" style={{ marginTop: 40 }}>
      <p style={{ margin: "0 0 8px" }}><strong>How it got here: every AI call in this workspace</strong></p>
      {traces && traces.length === 0 && (
        <p style={{ margin: 0 }}>
          No AI calls yet. The demo&apos;s receipts were sorted before the demo; upload one above to see a live run.
        </p>
      )}
      {traces && traces.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="worksheet" style={{ color: "var(--panel-text)" }}>
            <thead>
              <tr>
                <th>Skill</th>
                <th>Model · prompt</th>
                <th className="num">Time</th>
                <th className="num">Tokens in/out</th>
                <th className="num">Cost</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((trace) => (
                <tr key={trace.id}>
                  <td style={{ color: "#fff" }}>{trace.skill}</td>
                  <td>{trace.model} · {trace.prompt_version}</td>
                  <td className="num">{(trace.latency_ms / 1000).toFixed(1)}s</td>
                  <td className="num">{trace.ok ? `${trace.input_tokens}/${trace.output_tokens}` : "—"}</td>
                  <td className="num">{formatCost(trace.cost_nanodollars)}</td>
                  <td>{trace.ok ? (trace.used_template ? "ok, template used" : "ok") : `failed (${trace.error})`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small" style={{ margin: "8px 0 0" }}>Ruleset {traces?.[0]?.ruleset_version ?? "2026.1"}. Receipt text is never logged.</p>
    </div>
  );
}

function formatCost(nanodollars: number | null | undefined): string {
  if (nanodollars === null || nanodollars === undefined) return "—";
  return "$" + (nanodollars / 1e9).toFixed(4);
}
