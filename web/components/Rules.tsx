"use client";

import { useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import { dollars, longDate } from "@/lib/format";
import type { Comparison, Rule, RuleChange, WorkspaceRules } from "@/lib/types";
import RuleUpdateLog from "./RuleUpdateLog";
import TryRuleChange from "./TryRuleChange";

type Props = { workspaceId: string; refresh: () => Promise<void>; notify: (message: string) => void };

const FIELD_NAMES: Record<string, string> = {
  limit_cents: "Limit",
  phaseout_start_cents: "Starts shrinking after",
  threshold_cents: "Line",
  percent: "Deductible",
  unclear_band_cents: "Unclear range",
};

const TOPICS: [string, string][] = [
  ["equipment", "Equipment"],
  ["small_items", "Small items"],
  ["meals", "Meals"],
  ["contractors", "Contractors"],
  ["research", "Research"],
  ["profit", "Tax on profit"],
  ["deadlines", "Deadlines"],
];

export default function Rules({ workspaceId, refresh, notify }: Props) {
  const [year, setYear] = useState(2026);
  const [rules, setRules] = useState<WorkspaceRules | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState("");

  // This demo copy's rules: the real ruleset plus any change approved here.
  // `version` goes up after an approval or undo, which loads them again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    get<WorkspaceRules>(`/workspaces/${workspaceId}/rules/${year}`).then(setRules).catch((e: Error) => setError(e.message));
  }, [workspaceId, year, version]);

  useEffect(() => {
    get<Comparison>(`/workspaces/${workspaceId}/compare`).then(setComparison).catch((e: Error) => setError(e.message));
  }, [workspaceId, version]);

  async function afterChange() {
    setVersion((n) => n + 1);
    await refresh();
  }

  async function undoDemoChanges() {
    await post(`/workspaces/${workspaceId}/rule-changes/clear`);
    await afterChange();
    notify("Back to the real rules.");
  }

  const changedIds = new Set((comparison?.rule_changes ?? []).map((change) => change.rule_id));

  return (
    <div className="sheet">
      <h1 className="page-title">Rules</h1>
      <p className="lead">
        Every rule is stored with its source and the date it starts. A person approves each one before it&apos;s
        marked approved. Switch years to see what changed.
      </p>

      <div className="tabs" style={{ marginTop: 20 }} role="group" aria-label="Rule year">
        {[2025, 2026].map((y) => (
          <button key={y} className="tab" aria-current={year === y ? "page" : undefined} onClick={() => setYear(y)}>
            {y} rules
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      {rules && rules.demo_changes.length > 0 && (
        <p className="state open" style={{ display: "flex", gap: 16, alignItems: "center", padding: "10px 14px", marginTop: 16 }}>
          <span>
            This demo copy uses ruleset {rules.version}: the real rules plus {rules.demo_changes.length} change
            {rules.demo_changes.length === 1 ? "" : "s"} approved here. Every number on every screen uses it.
          </span>
          <button className="button small light" onClick={undoDemoChanges}>Undo</button>
        </p>
      )}

      {comparison && (
        <div className="grid-2">
          <div className="card">
            <p className="muted small">1099 forms needed, same contractors</p>
            <p className="figure-xl">
              {comparison.forms_needed.before} <span className="muted">→</span> <span className="changed">{comparison.forms_needed.after}</span>
            </p>
            <p className="small muted">2025 rules vs 2026 rules</p>
          </div>
          <div className="card">
            <p className="muted small">Office team meals, federal deduction</p>
            <p className="figure-xl">
              {dollars(comparison.team_meals_federal_deductible.before)} <span className="muted">→</span>{" "}
              <span className="changed">{dollars(comparison.team_meals_federal_deductible.after)}</span>
            </p>
            <p className="small muted">2025 rules vs 2026 rules</p>
          </div>
        </div>
      )}

      {rules &&
        TOPICS.map(([topic, title]) => {
          const inTopic = rules.rules.filter((rule) => rule.topic === topic);
          if (inTopic.length === 0) return null;
          return (
            <div key={topic} style={{ marginTop: 32 }}>
              <p className="section-label">{title}</p>
              <ul className="rows">
                {inTopic.map((rule) => (
                  <li key={rule.id}>
                    <span className="grow">
                      <strong>{jurisdictionLabel(rule.jurisdiction)}:</strong> {rule.plain_words}{" "}
                      <SourceLink rule={rule} />
                      <br />
                      <ApprovalLine rule={rule} />
                    </span>
                    <span className={"figure" + ((year === 2026 && changedIds.has(rule.id)) || rule.demo_change ? " changed" : "")}>{ruleValue(rule)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      {rules && (
        <p className="footer-note">
          Ruleset {rules.version}, federal and California.{year === 2026 && " Blue values changed from 2025."}
        </p>
      )}

      {comparison && (
        <div style={{ marginTop: 40 }}>
          <p className="section-label">What changed from 2025 to 2026</p>
          <ul className="rows">
            {comparison.rule_changes.map((change) => (
              <li key={change.rule_id + (change.field ?? "")}>
                <span className="grow">
                  {change.field && FIELD_NAMES[change.field] && <strong>{FIELD_NAMES[change.field]}: </strong>}
                  {change.plain_words} <SourceLink rule={{ source: change.source } as Rule} />
                </span>
                <span className="figure">
                  {changeValue(change, change.before)} → <span className="changed">{changeValue(change, change.after)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RuleUpdateLog year={year} />
      <TryRuleChange workspaceId={workspaceId} year={year} onChanged={afterChange} notify={notify} />
    </div>
  );
}

function SourceLink({ rule }: { rule: Pick<Rule, "source"> }) {
  if (!rule.source.url) return <span className="source">[[{rule.source.cite}]]</span>;
  return (
    <a className="source" href={rule.source.url} target="_blank" rel="noreferrer">
      [[{shortCite(rule.source.cite)}]]
    </a>
  );
}

function ApprovalLine({ rule }: { rule: Rule }) {
  if (rule.demo_change) {
    return (
      <span className="small muted">
        <strong>Changed in this demo</strong> by {rule.approved_by}: {rule.demo_change}. The sentence above describes the real rule.
      </span>
    );
  }
  if (rule.check_status === "needs_check") {
    return <span className="state open">Δ Open: still being checked</span>;
  }
  if (rule.approved_by && rule.approved_on) {
    return <span className="small muted">Approved by {rule.approved_by} on {longDate(rule.approved_on)}</span>;
  }
  return <span className="small muted">Not yet approved</span>;
}

function jurisdictionLabel(jurisdiction: Rule["jurisdiction"]): string {
  if (jurisdiction === "federal") return "Federal";
  if (jurisdiction === "california") return "California";
  return "Both";
}

function shortCite(cite: string): string {
  // "IRC 274(o) (added by ...)" -> "IRC 274(o)"
  const cut = cite.search(/[(;,]\s|\s\(/);
  return cut > 0 ? cite.slice(0, cut) : cite;
}

export function ruleValue(rule: Rule): string {
  if ("percent" in rule) return rule.percent === null || rule.percent === undefined ? "Not decided" : `${rule.percent}%`;
  if (rule.limit_cents !== undefined) return dollars(rule.limit_cents);
  if (rule.threshold_cents !== undefined) return dollars(rule.threshold_cents);
  if (rule.per_item_limit_cents !== undefined) return dollars(rule.per_item_limit_cents);
  if (rule.rate_basis_points !== undefined) return `${rule.rate_basis_points / 100}%, at least ${dollars(rule.minimum_cents ?? 0)}`;
  if (rule.treatment === "deduct_now") return "Now";
  if (rule.treatment === "amortize") return `${rule.years} years`;
  if (rule.deadline) return longDate(String(rule.deadline));
  return "";
}

function changeValue(change: RuleChange, value: unknown): string {
  if (value === null || value === undefined) return "none";
  if (change.field === "percent") return `${value}%`;
  if (change.field?.endsWith("_cents") && typeof value === "number") return dollars(value);
  if (Array.isArray(value)) return value.map((v) => dollars(Number(v))).join("–");
  return String(value);
}
