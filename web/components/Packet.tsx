"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/api";
import { dollars, longDate, plural, shortDate } from "@/lib/format";
import type { Flagged, OpenItem, Overview, PurchaseInput, PurchaseResult } from "@/lib/types";

type PacketData = {
  note: string;
  company: string;
  as_of: string;
  ruleset_version: string;
  open_items: OpenItem[];
  flagged: Flagged[];
  purchases: { input: PurchaseInput; result: PurchaseResult }[];
  summary: Overview;
};

export default function Packet({ workspaceId }: { workspaceId: string }) {
  const [packet, setPacket] = useState<PacketData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<PacketData>(`/workspaces/${workspaceId}/packet`).then(setPacket).catch((e: Error) => setError(e.message));
  }, [workspaceId]);

  if (error) return <div className="sheet"><p className="error">{error}</p></div>;
  if (!packet) return <div className="sheet"><p className="muted">Loading the packet…</p></div>;

  const summary = packet.summary;

  return (
    <div className="sheet">
      <p className="section-label"><span className="chip">For your accountant</span></p>
      <h1 className="page-title">
        Accountant packet {summary.clock.tax_year} <span>{packet.company}</span>
      </h1>
      <p className="lead">
        Everything your accountant needs to check, with every number linked to its receipt and rule.
        <strong> {packet.note}</strong>
      </p>
      <p className="muted small">
        As of {longDate(packet.as_of)} · {summary.receipts_filed} receipts, each linked · ruleset {packet.ruleset_version}, sources cited ·{" "}
        {plural(packet.open_items.length, "open item")}
      </p>

      <div style={{ marginTop: 32 }}>
        <p className="section-label"><span className="chip">1</span> Open items</p>
        <ul className="rows">
          {packet.open_items.map((item, index) => (
            <li key={index}>
              <span className="mark">Δ</span>
              <span className="grow">{openItemText(item)}</span>
              <span className="state needs_answer">{openItemStatus(item)}</span>
            </li>
          ))}
          {packet.open_items.length === 0 && <li className="muted">Nothing open.</li>}
        </ul>
      </div>

      {packet.purchases.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <p className="section-label"><span className="chip">2</span> Planned purchase (not bought)</p>
          <ul className="rows">
            {packet.purchases.map((saved, index) => (
              <li key={index}>
                <span className="mark">Σ</span>
                <span className="grow">
                  {saved.input.quantity} at {dollars(saved.result.price_each_cents, true)} each, in use by {shortDate(saved.input.in_use_by)}.
                  Federal {dollars(saved.result.federal.this_year_cents)} this year; California {dollars(saved.result.california.this_year_cents)} this
                  year{saved.result.california.later_cents > 0 && `, ${dollars(saved.result.california.later_cents)} spread over later years`}.
                </span>
                <span className="state confirmed">Estimate</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <p className="section-label"><span className="chip">{packet.purchases.length > 0 ? 3 : 2}</span> Flagged, nothing counted</p>
        <ul className="rows">
          {packet.flagged.map((item, index) => (
            <li key={index}>
              <span className="mark">!</span>
              <span className="grow">
                {item.kind === "hidden_instruction"
                  ? `${item.merchant}${item.date ? `, ${shortDate(item.date)}` : ""}: hidden text told the AI to mark it 100% deductible. Ignored and logged.`
                  : `Photo${item.date ? ` from ${shortDate(item.date)}` : ""}: total unreadable, so no number is shown.`}
              </span>
              <span className="state cant_determine">Can&apos;t determine</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 32 }}>
        <p className="section-label"><span className="chip">{packet.purchases.length > 0 ? 4 : 3}</span> Where things stand</p>
        <ul className="rows">
          <li><span className="mark">Σ</span><span className="grow">California equipment room left</span><span className="figure">{dollars(summary.california_equipment.room_cents)}</span></li>
          <li><span className="mark">Σ</span><span className="grow">1099 forms needed (federal {dollars(summary.contractors.line_cents)} line)</span><span className="figure">{summary.contractors.forms_needed}</span></li>
          {summary.meals.rows.map((row) => (
            <li key={row.category}>
              <span className="mark">T</span>
              <span className="grow">{mealLabel(row.category)}: federal {dollars(row.federal.deductible_cents)}, California {dollars(row.california.deductible_cents)} deductible</span>
              <span className="figure">{dollars(row.spent_cents)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="legend">
        <span><strong className="mark">T</strong> traced to receipts</span>
        <span><strong className="mark">Σ</strong> added up from transactions</span>
        <span><strong className="mark">Δ</strong> waiting on your answer</span>
      </div>
      <p className="footer-note">Synthetic data. Estimates only. Your accountant confirms the final numbers. TrimTax never files anything.</p>
    </div>
  );
}

function openItemText(item: OpenItem): string {
  if (item.kind === "question") {
    return `${item.merchant}, ${dollars(item.amount_cents)} on ${shortDate(item.date)}: team meal or client meal?`;
  }
  if (item.kind === "missing_w9") {
    return `${item.name}: no W-9 on file. Paid ${dollars(item.paid_cents)}, ${dollars(item.cents_to_line)} from the 1099 line.`;
  }
  return `California contractor report (DE 542): the EDD still lists $600, but it only applies when a federal 1099 is required. ${plural(item.count, "contractor")} between $600 and $1,999 are unclear for 2026.`;
}

function openItemStatus(item: OpenItem): string {
  if (item.kind === "missing_w9") return item.w9_requested ? "W-9 requested" : "W-9 needed";
  if (item.kind === "de542_unclear") return "Ask your accountant";
  return "Waiting on your answer";
}

function mealLabel(category: string): string {
  if (category === "team_meal_office") return "Team meals at the office";
  if (category === "client_meal") return "Client meals";
  if (category === "client_entertainment") return "Client entertainment";
  return "Snacks and coffee";
}
