"use client";

import { post } from "@/lib/api";
import { dollars, shortDate } from "@/lib/format";
import type { OpenItem, Overview as OverviewData } from "@/lib/types";
import YearClock from "./YearClock";
import ImportTransactions from "./ImportTransactions";

type Props = {
  workspaceId: string;
  data: OverviewData;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  goTo: (tab: string) => void;
};

function findItem<K extends OpenItem["kind"]>(items: OpenItem[], kind: K) {
  return items.find((item) => item.kind === kind) as Extract<OpenItem, { kind: K }> | undefined;
}

export default function Overview({ workspaceId, data, refresh, notify, goTo }: Props) {
  const question = findItem(data.open_items, "question");
  const w9 = findItem(data.open_items, "missing_w9");
  const room = data.california_equipment.room_cents;

  async function toggleW9(undo: boolean) {
    if (!w9) return;
    await post(`/workspaces/${workspaceId}/contractors/${w9.contractor_id}/request-w9${undo ? "?undo=true" : ""}`);
    notify(undo ? "W-9 request removed." : `W-9 request noted for ${w9.name}. It's in the packet.`);
    await refresh();
  }

  // Contractors within $500 of the 1099 line, closest first.
  const nearLine = data.contractors.contractors
    .filter((c) => c.near_line)
    .sort((a, b) => a.cents_to_line - b.cents_to_line);
  const overLine = data.contractors.forms_needed;
  const equipment = data.california_equipment;

  const team = data.meals.rows.find((row) => row.category === "team_meal_office");
  const client = data.meals.rows.find((row) => row.category === "client_meal");
  const us = data.research.rows.find((row) => row.where === "us");
  const offshore = data.research.rows.find((row) => row.where === "offshore");

  // Upcoming dates: the rule deadlines, plus a planned purchase if one is in the packet.
  const comingUp = data.deadlines.map((d) => ({ date: d.date, label: deadlineLabel(d.rule_id) }));
  for (const saved of data.packet_purchases) {
    comingUp.push({ date: saved.input.in_use_by, label: "planned purchase in use" });
  }
  comingUp.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="sheet">
      <h1 className="page-title">
        You can still change your {data.clock.tax_year} taxes. <span>{data.clock.days_left} days left.</span>
      </h1>

      {!data.is_demo && <ImportTransactions workspaceId={workspaceId} refresh={refresh} notify={notify} goTo={goTo} />}

      <div className="grid-2">
        <div>
          <YearClock
            daysInYear={data.clock.days_in_year}
            daysGone={data.clock.days_gone}
            daysLeft={data.clock.days_left}
            year={data.clock.tax_year}
          />
          <p className="small muted" style={{ maxWidth: "44ch" }}>
            Each tick is a day of the tax year. Light ticks are behind you, the blue one is today
            ({shortDate(data.as_of)}), the dark ones are what&apos;s left before Dec 31.
          </p>
        </div>

        <div>
          <p className="section-label"><span className="chip">Part I</span> Before Dec 31</p>
          <ol className="rows">
            {question && (
              <li>
                <span className="mark">Δ</span>
                <span className="grow">
                  {question.merchant}, <strong className="figure" style={{ fontSize: 16 }}>{dollars(question.amount_cents)}</strong>{" "}
                  on {shortDate(question.date)}: {question.question}
                </span>
                <button className="button small light" onClick={() => goTo("questions")}>Answer</button>
              </li>
            )}
            {w9 && (
              <li>
                <span className="mark">Δ</span>
                <span className="grow">
                  {w9.w9_requested ? (
                    <>W-9 requested from {w9.name}. It&apos;s in the packet.</>
                  ) : (
                    <>
                      Get a W-9 from {w9.name}. Paid <span className="figure" style={{ fontSize: 16 }}>{dollars(w9.paid_cents)}</span>{" "}
                      so far, {dollars(w9.cents_to_line)} from the {dollars(data.contractors.line_cents)} line for a 1099.
                    </>
                  )}
                </span>
                {w9.w9_requested ? (
                  <button className="linklike" onClick={() => toggleW9(true)}>Undo</button>
                ) : (
                  <button className="button small light" onClick={() => toggleW9(false)}>Mark W-9 requested</button>
                )}
              </li>
            )}
            <li>
              <span className="mark">Σ</span>
              <span className="grow">
                You can still write off <strong className="figure" style={{ fontSize: 16 }}>{dollars(room)}</strong> of
                equipment on your California return this year. After that, it&apos;s spread over later years.
              </span>
              <button className="button small" onClick={() => goTo("purchase")}>Check a purchase</button>
            </li>
          </ol>

          <p className="section-label" style={{ marginTop: 24 }}>Coming up</p>
          <ul className="rows">
            {comingUp.map((item) => (
              <li key={item.date + item.label}>
                <span className="figure" style={{ fontSize: 16, minWidth: 64 }}>{shortDate(item.date)}</span>
                <span className="grow">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <p className="section-label"><span className="chip">Part II</span> How close you are to each limit</p>
        <ul className="meters">
          <Meter
            label="California equipment write-off"
            note={`${dollars(equipment.used_cents)} of ${dollars(equipment.cap_cents)} used`}
            used={equipment.used_cents}
            limit={equipment.cap_cents}
            left={equipment.room_cents > 0 ? `${dollars(equipment.room_cents)} left` : "None left. More equipment is spread over later years"}
          />
          {nearLine.map((c) => (
            <Meter
              key={c.id}
              label={c.name}
              note={`paid ${dollars(c.paid_cents)} toward the ${dollars(data.contractors.line_cents)} 1099 line${c.w9_on_file ? "" : ", no W-9 yet"}`}
              used={c.paid_cents}
              limit={data.contractors.line_cents}
              left={`${dollars(c.cents_to_line)} left`}
              blue
            />
          ))}
        </ul>
        <p className="footer-note">
          Anyone within $500 of a line shows up here, so there&apos;s time to act.{" "}
          {nearLine.length === 0 && "No contractor is that close right now. "}
          {overLine > 0 && `${overLine} contractor${overLine === 1 ? " is" : "s are"} already over the 1099 line and need a form.`}
        </p>
      </div>

      <div style={{ marginTop: 40 }}>
        <p className="section-label"><span className="chip">Part III</span> Where you stand</p>
        <ul className="rows">
          <Line mark="Σ" label="California equipment room left" note={`of ${dollars(data.california_equipment.limit_cents)}`} value={dollars(room)} />
          <Line
            mark="Σ"
            label="1099 forms you need"
            note={data.contractors.forms_under_old_line !== null ? `${data.contractors.forms_under_old_line} under the old $600 line` : ""}
            value={String(data.contractors.forms_needed)}
          />
          {team && (
            <Line
              mark="T"
              label="Office team meals"
              note={`deductible: federal ${dollars(team.federal.deductible_cents)}, California ${dollars(team.california.deductible_cents)}`}
              value={dollars(team.spent_cents)}
            />
          )}
          {client && (
            <Line mark="T" label="Client meals deductible" note="50% on both returns" value={dollars(client.federal.deductible_cents)} />
          )}
          {us && <Line mark="T" label="US research, deducted this year" note="federal and California" value={dollars(us.spent_cents)} />}
          {offshore && (
            <Line
              mark="T"
              label="Offshore research"
              note={`federal: over ${offshore.federal.years ?? 15} years; California: deducted now`}
              value={dollars(offshore.spent_cents)}
            />
          )}
          <Line mark="T" label="Receipts filed" note="each linked to its transaction" value={String(data.receipts_filed)} />
        </ul>
        <p className="footer-note">Estimates from ruleset {data.ruleset_version}. Your accountant confirms the final numbers.</p>
      </div>
    </div>
  );
}

// One limit as a bar: how much is used against the line, and what's left.
function Meter({ label, note, used, limit, left, blue = false }: { label: string; note: string; used: number; limit: number; left: string; blue?: boolean }) {
  const share = limit > 0 ? Math.min(used / limit, 1) : 1;
  return (
    <li>
      <div className="meter-head">
        <span>
          {label} <span className="muted small">({note})</span>
        </span>
        <span className="figure">{left}</span>
      </div>
      <div className="meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)}>
        <div className={blue ? "meter-fill blue" : "meter-fill"} style={{ transform: `scaleX(${share.toFixed(3)})` }} />
      </div>
    </li>
  );
}

function Line({ mark, label, note, value }: { mark: string; label: string; note: string; value: string }) {
  return (
    <li>
      <span className="mark">{mark}</span>
      <span className="grow">
        {label} {note && <span className="muted small">({note})</span>}
      </span>
      <span className="figure">{value}</span>
    </li>
  );
}

function deadlineLabel(ruleId: string): string {
  if (ruleId === "placed_in_service_deadline") return "tax year ends; equipment must be in use";
  if (ruleId === "owners_q4_estimate") return "owners' Q4 estimated tax";
  if (ruleId === "fed_1099_nec_due") return "1099-NEC forms due";
  return ruleId;
}
