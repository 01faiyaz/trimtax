"use client";

import { useEffect, useState } from "react";
import { post } from "@/lib/api";
import { dollars, shortDate } from "@/lib/format";
import type { Overview, PurchaseInput, PurchaseResult } from "@/lib/types";

type Props = {
  workspaceId: string;
  overview: Overview;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  goTo: (tab: string) => void;
};

const PRESETS = [289900, 239900];

export default function Purchase({ workspaceId, overview, refresh, notify, goTo }: Props) {
  const [priceDollars, setPriceDollars] = useState("2899");
  const [quantity, setQuantity] = useState("3");
  const [inUseBy, setInUseBy] = useState(defaultInUseBy(overview.as_of));
  const [beforeTax, setBeforeTax] = useState(false);
  const [taxPercent, setTaxPercent] = useState("8.625");
  const [shippingDollars, setShippingDollars] = useState("0");
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState("");

  const input = buildInput();
  const inPacket = overview.packet_purchases.length > 0 && sameInput(overview.packet_purchases[0].input, input);

  function buildInput(): PurchaseInput | null {
    const price = Math.round(Number(priceDollars) * 100);
    const count = Number(quantity);
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(count) || count <= 0 || !inUseBy) return null;
    return {
      price_each_cents: price,
      quantity: count,
      in_use_by: inUseBy,
      sales_tax_percent: beforeTax ? taxPercent || "0" : "0",
      shipping_each_cents: beforeTax ? Math.round(Number(shippingDollars || "0") * 100) : 0,
      year: 2026,
    };
  }

  // Re-check every time an input changes.
  const inputKey = JSON.stringify(input);
  useEffect(() => {
    if (!input) return;
    let stale = false;
    post<PurchaseResult>(`/workspaces/${workspaceId}/check-purchase`, input)
      .then((answer) => {
        if (!stale) {
          setResult(answer);
          setError("");
        }
      })
      .catch((e: Error) => !stale && setError(e.message));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey, workspaceId]);

  async function addToPacket() {
    if (!input) return;
    await post(`/workspaces/${workspaceId}/packet/purchases`, input);
    notify("Added to the accountant packet. Nothing is recorded as bought.");
    await refresh();
  }

  async function removeFromPacket() {
    await post(`/workspaces/${workspaceId}/packet/purchases/clear`);
    notify("Removed from the packet.");
    await refresh();
  }

  return (
    <div className="sheet">
      <p className="section-label"><span className="chip">Part I</span> The purchase</p>
      <h1 className="page-title">
        What if you buy {quantity || "?"} {overview.is_demo ? "laptops" : "of these"}
        {inUseBy ? `, in use by ${shortDate(inUseBy)}` : ""}?
      </h1>

      <div className="grid-2">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <fieldset className="field">
            <legend>Price each{beforeTax ? ", before tax and shipping" : ", tax and shipping included"}</legend>
            <div>
              {PRESETS.map((cents) => (
                <label className="choice" key={cents}>
                  <input
                    type="radio"
                    name="preset"
                    checked={Math.round(Number(priceDollars) * 100) === cents}
                    onChange={() => setPriceDollars(String(cents / 100))}
                  />
                  {dollars(cents)}
                </label>
              ))}
            </div>
            <label className="small muted" htmlFor="price">Or type a price</label>
            <input id="price" type="number" min="0.01" step="0.01" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} />
          </fieldset>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div className="field">
              <label htmlFor="quantity">How many</label>
              <input id="quantity" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="inuse">In use by</label>
              <input id="inuse" type="date" value={inUseBy} onChange={(e) => setInUseBy(e.target.value)} />
            </div>
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}>
            <input type="checkbox" checked={beforeTax} onChange={(e) => setBeforeTax(e.target.checked)} style={{ width: 20, height: 20 }} />
            My price is before sales tax and shipping
          </label>
          {beforeTax && (
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div className="field">
                <label htmlFor="tax">Sales tax %</label>
                <input id="tax" type="text" inputMode="decimal" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ship">Shipping per item ($)</label>
                <input id="ship" type="number" min="0" step="0.01" value={shippingDollars} onChange={(e) => setShippingDollars(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div>
          {error && <p className="error">{error}</p>}
          {!input && <p className="muted">Enter a price, a quantity and a date.</p>}
          {input && result && <ResultView result={result} />}
        </div>
      </div>

      {input && result && (
        <div style={{ marginTop: 32 }}>
          <p className="section-label"><span className="chip">Part II</span> Worksheet</p>
          <Worksheet result={result} />
          <p className="footer-note">A preview. Nothing is recorded. All figures are estimates from ruleset {result.ruleset_version}.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            {inPacket ? (
              <>
                <span className="state confirmed" style={{ alignSelf: "center" }}>✓ In the packet</span>
                <button className="button light" onClick={() => goTo("packet")}>View packet</button>
                <button className="linklike" onClick={removeFromPacket}>Remove</button>
              </>
            ) : (
              <button className="button" onClick={addToPacket}>Add to accountant packet</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultView({ result }: { result: PurchaseResult }) {
  const small = result.small_item;
  let verdict: string;
  if (!result.in_use_in_time) {
    verdict = `Not in use by ${shortDate(result.deadline)}, so it counts for next year on both returns.`;
  } else if (small.qualifies) {
    verdict = `Each one is ${dollars(small.under_line_cents)} under the ${dollars(small.line_cents)} small-item line, so it's written off right away on both returns. California's equipment room stays at ${dollars(result.california_room_after_cents)}.`;
  } else if (!small.election_made) {
    verdict = "The company hasn't made the small-item election, so this counts as equipment.";
  } else {
    verdict = `Each one is ${dollars(small.over_line_cents)} over the ${dollars(small.line_cents)} small-item line, so it counts as equipment.`;
  }

  return (
    <div>
      <PriceLine price={result.price_each_cents} line={small.line_cents} />
      <p className="lead" style={{ marginTop: 0 }}>{verdict}</p>
      <div className="grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <p className="muted small">(a) Federal</p>
          <p className="figure-xl">{dollars(result.federal.this_year_cents)}</p>
          <p>written off this year</p>
        </div>
        <div className="card">
          <p className="muted small">(b) California</p>
          <p className="figure-xl">{dollars(result.california.this_year_cents)}</p>
          <p>
            {result.california.later_cents > 0
              ? `this year, and ${dollars(result.california.later_cents)} spread over later years`
              : "written off this year"}
          </p>
        </div>
      </div>
      {result.tax_on_profit?.with_purchase && (
        <p className="small muted" style={{ marginTop: 16 }}>
          California S corporation tax this year: {dollars(result.tax_on_profit.california_tax_cents)} →{" "}
          {dollars(result.tax_on_profit.with_purchase.california_tax_cents)}
          {result.tax_on_profit.with_purchase.change_cents < 0 && ` (${dollars(-result.tax_on_profit.with_purchase.change_cents)} less)`}.
          The owners&apos; federal tax changes too; that depends on their other income, so your accountant works it out.
        </p>
      )}
    </div>
  );
}

// The price of one item as a dot on a bar, with the small-item line marked, so you can
// see which side of the line it falls on. The verdict sentence says the same in words.
function PriceLine({ price, line }: { price: number; line: number }) {
  const max = Math.max(300000, line * 1.2, price * 1.1); // at least $3,000, like the design
  const at = (cents: number) => `${((Math.min(cents, max) / max) * 100).toFixed(1)}%`;
  return (
    <div className="price-line" aria-hidden="true">
      <div className="price-line-fill" style={{ width: at(price) }} />
      <div className="price-line-mark" style={{ left: at(line) }} />
      <span className="price-line-label" style={{ left: at(line) }}>{dollars(line)} small-item line</span>
      <div className="price-line-dot" style={{ left: at(price) }} />
    </div>
  );
}

function Worksheet({ result }: { result: PurchaseResult }) {
  const rows = [
    ["Price each (all-in)", dollars(result.price_each_cents, true), dollars(result.price_each_cents, true)],
    ["Total", dollars(result.total_cents, true), dollars(result.total_cents, true)],
    ["Small-item line", dollars(result.small_item.line_cents), dollars(result.small_item.line_cents)],
    ["Written off this year", dollars(result.federal.this_year_cents, true), dollars(result.california.this_year_cents, true)],
    ["Spread over later years", dollars(result.federal.later_cents, true), dollars(result.california.later_cents, true)],
    ["California equipment room after", "—", dollars(result.california_room_after_cents)],
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="worksheet">
        <thead>
          <tr>
            <th>Line</th>
            <th className="num">Federal</th>
            <th className="num">California</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, federal, california]) => (
            <tr key={label}>
              <td>{label}</td>
              <td className="num">{federal}</td>
              <td className="num">{california}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function defaultInUseBy(asOf: string): string {
  // The demo's story: in use by Dec 10.
  const year = asOf.slice(0, 4);
  return `${year}-12-10`;
}

function sameInput(a: PurchaseInput, b: PurchaseInput | null): boolean {
  if (!b) return false;
  return (
    a.price_each_cents === b.price_each_cents &&
    a.quantity === b.quantity &&
    a.in_use_by === b.in_use_by &&
    a.sales_tax_percent === b.sales_tax_percent &&
    a.shipping_each_cents === b.shipping_each_cents
  );
}
