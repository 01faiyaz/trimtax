"use client";

import { useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import type { DemoProposal, ProposalResult } from "@/lib/types";

type Props = {
  workspaceId: string;
  year: number;
  onChanged: () => Promise<void>;
  notify: (message: string) => void;
};

const SAMPLE = `Sample passage, made up for trying this out (not real law):
For taxable years beginning in 2026, the aggregate cost of property that may be expensed shall not exceed $30,000 for California purposes.`;

// Paste official text, see what the AI proposes, and approve a change for this demo copy only.
export default function TryRuleChange({ workspaceId, year, onChanged, notify }: Props) {
  const [text, setText] = useState("");
  const [cite, setCite] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProposalResult | null>(null);
  const [proposals, setProposals] = useState<DemoProposal[]>([]);

  useEffect(() => {
    get<DemoProposal[]>(`/workspaces/${workspaceId}/rule-proposals`).then(setProposals).catch(() => setProposals([]));
  }, [workspaceId, result]);

  async function ask() {
    setBusy(true);
    setError("");
    try {
      setResult(await post<ProposalResult>(`/workspaces/${workspaceId}/rule-proposals`, { text, cite, year }));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function decide(proposal: DemoProposal, action: "approve" | "reject") {
    setError("");
    try {
      await post(`/workspaces/${workspaceId}/rule-proposals/${proposal.id}/${action}`, { name });
      setProposals(await get<DemoProposal[]>(`/workspaces/${workspaceId}/rule-proposals`));
      if (action === "approve") {
        await onChanged();
        notify("Approved for this demo copy. The numbers on every screen now use it.");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <p className="section-label">Try a rule change</p>
      <p className="small muted" style={{ maxWidth: "62ch" }}>
        Paste a passage of official text, like a new IRS notice. The AI proposes changes and quotes the sentence it
        relied on, and plain code checks the quote is really in your text. If you approve one, only your copy of the
        demo changes. The real rules never do.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="rule-text">Official text</label>
        <textarea id="rule-text" value={text} maxLength={8000} onChange={(e) => setText(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
        <div className="field">
          <label htmlFor="rule-cite">Where it&apos;s from (optional)</label>
          <input id="rule-cite" type="text" value={cite} maxLength={200} onChange={(e) => setCite(e.target.value)} />
        </div>
        <button className="button" disabled={busy || text.trim().length < 20} onClick={ask}>
          {busy ? "Reading…" : "Ask the AI"}
        </button>
        <button className="button light" disabled={busy} onClick={() => { setText(SAMPLE); setCite("Sample, not real law"); }}>
          Use a sample passage
        </button>
      </div>

      {result && <ResultNotes result={result} />}

      {proposals.length > 0 && (
        <>
          <div className="field" style={{ marginTop: 24 }}>
            <label htmlFor="rule-name">Your name, for the approval</label>
            <input id="rule-name" type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </div>
          <ul className="rows">
            {proposals.map((proposal) => (
              <li key={proposal.id} style={{ flexWrap: "wrap" }}>
                <span className="grow" style={{ flex: "1 1 360px" }}>
                  {proposal.plain_words}
                  <span className="figure" style={{ display: "block", marginTop: 4 }}>
                    {proposal.from_text} → <span className="changed">{proposal.to_text}</span>
                  </span>
                  <span className="small muted" style={{ display: "block", marginTop: 4 }}>
                    &ldquo;{proposal.quote}&rdquo; ({proposal.source.cite})
                  </span>
                </span>
                {proposal.status === "proposed" ? (
                  <span style={{ display: "flex", gap: 8 }}>
                    <button className="button small" disabled={!name.trim()} onClick={() => decide(proposal, "approve")}>Approve</button>
                    <button className="button small light" disabled={!name.trim()} onClick={() => decide(proposal, "reject")}>Reject</button>
                  </span>
                ) : (
                  <span className="small muted">{decisionText(proposal)}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ResultNotes({ result }: { result: ProposalResult }) {
  return (
    <div className="small" style={{ marginTop: 16 }}>
      {result.failed && <p className="error">The AI call failed, so nothing was proposed. Try again.</p>}
      {result.instructions_found && (
        <p className="state open" style={{ display: "inline-block" }}>The text has something that looks like instructions to an AI. It was read as data only.</p>
      )}
      {!result.failed && result.proposals.length === 0 && result.rejected.length === 0 && (
        <p className="muted">No changes proposed. {result.note}</p>
      )}
      {result.rejected.map((rejected, index) => (
        <p key={index} className="muted">
          Not proposed: {rejected.figure} for {rejected.rule_id}, because {rejected.why}.
        </p>
      ))}
    </div>
  );
}

function decisionText(proposal: DemoProposal): string {
  if (proposal.status === "approved") {
    return proposal.outcome === "already_matches"
      ? `Approved by ${proposal.decided_by}. The rules already said this.`
      : `Approved by ${proposal.decided_by} for this demo copy.`;
  }
  if (proposal.status === "rejected") return `Rejected by ${proposal.decided_by}.`;
  return "Undone.";
}
