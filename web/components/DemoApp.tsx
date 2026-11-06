"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { NotFound, get, newDemoWorkspace, post, saveWorkspaceId, savedOwnWorkspaceId, savedWorkspaceId } from "@/lib/api";
import { shortDate } from "@/lib/format";
import type { Overview as OverviewData } from "@/lib/types";
import Overview from "./Overview";
import Packet from "./Packet";
import Purchase from "./Purchase";
import Questions from "./Questions";
import Rules from "./Rules";
import StartFresh from "./StartFresh";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "purchase", label: "Check a purchase" },
  { id: "questions", label: "Questions" },
  { id: "rules", label: "Rules" },
  { id: "packet", label: "Accountant packet" },
];

// The open tab lives in the URL hash (#questions), so links and the back button work.
function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function tabFromHash(): string {
  const name = window.location.hash.replace("#", "");
  return TABS.some((tab) => tab.id === name) ? name : "overview";
}

export default function DemoApp() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const tab = useSyncExternalStore(subscribeToHash, tabFromHash, () => "overview");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false); // showing the "Start fresh" form

  const loadOverview = useCallback(async (id: string) => {
    const data = await get<OverviewData>(`/workspaces/${id}/overview`);
    setOverview(data);
  }, []);

  // Find this visitor's workspace, or make a fresh copy of the demo.
  useEffect(() => {
    async function start() {
      let id = savedWorkspaceId();
      try {
        if (!id) id = await newDemoWorkspace();
        await loadOverview(id);
      } catch (e) {
        if (e instanceof NotFound) {
          id = await newDemoWorkspace();
          await loadOverview(id);
        } else {
          setError("Can't reach the TrimTax server right now. " + (e as Error).message);
          return;
        }
      }
      setWorkspaceId(id);
    }
    start();
  }, [loadOverview]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const refresh = useCallback(async () => {
    if (workspaceId) await loadOverview(workspaceId);
  }, [workspaceId, loadOverview]);

  function goTo(id: string) {
    // Only the hash changes, which the tab reads; no page navigation happens.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("#" + id);
    window.scrollTo({ top: 0 });
  }

  // Switch between the demo and your own company.
  async function openWorkspace(id: string, message: string) {
    try {
      await loadOverview(id);
    } catch {
      setToast("That tax file isn't available anymore.");
      return;
    }
    saveWorkspaceId(id);
    setWorkspaceId(id);
    setStarting(false);
    goTo("overview");
    setToast(message);
  }

  async function backToDemo() {
    await openWorkspace(await newDemoWorkspace(), "Back in the demo.");
  }

  async function resetDemo() {
    if (!workspaceId) return;
    await post(`/workspaces/${workspaceId}/reset`);
    await refresh();
    goTo("overview");
    setToast("Demo reset to Nov 19.");
  }

  // Your own company, if you made one. Read once the page is in the browser.
  const ownId = workspaceId ? savedOwnWorkspaceId() : null;

  const openQuestions = overview ? overview.open_items.filter((item) => item.kind === "question").length : 0;

  return (
    <>
      <header className="app-header">
        <div className="brand">
          TrimTax
          <small>{overview ? `${overview.company}, ${overview.clock.tax_year}` : "Loading…"}</small>
        </div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className="tab" aria-current={tab === t.id ? "page" : undefined} onClick={() => goTo(t.id)}>
              {t.label}
              {t.id === "questions" && openQuestions > 0 && <span className="badge">{openQuestions}</span>}
            </button>
          ))}
        </nav>
        <div className="header-right">
          {overview?.is_demo && <span className="demo-date">Demo date: {shortDate(overview.as_of)}</span>}
          {overview?.is_demo && <span className="small muted">Synthetic demo data</span>}
          {overview?.is_demo && (
            <button className="linklike" onClick={resetDemo}>Reset demo</button>
          )}
          {overview?.is_demo && !starting && !ownId && (
            <button className="linklike" onClick={() => setStarting(true)}>Start fresh with your company</button>
          )}
          {overview?.is_demo && ownId && (
            <button className="linklike" onClick={() => openWorkspace(ownId, "Back to your company.")}>Your company</button>
          )}
          {overview && !overview.is_demo && <button className="linklike" onClick={backToDemo}>Back to the demo</button>}
          <Link href="/" className="small">Back to the site</Link>
        </div>
      </header>

      <main className="desk">
        {error && <p className="error">{error}</p>}
        {!error && (!overview || !workspaceId) && <p className="muted">Opening your tax file…</p>}
        {starting && (
          <StartFresh onDone={(id) => openWorkspace(id, "Your tax file is ready. Add your transactions to fill it in.")} onCancel={() => setStarting(false)} />
        )}
        {!starting && overview && workspaceId && (
          <>
            {tab === "overview" && (
              <Overview workspaceId={workspaceId} data={overview} refresh={refresh} notify={setToast} goTo={goTo} />
            )}
            {tab === "purchase" && (
              <Purchase workspaceId={workspaceId} overview={overview} refresh={refresh} notify={setToast} goTo={goTo} />
            )}
            {tab === "questions" && (
              <Questions workspaceId={workspaceId} flagged={overview.flagged} refresh={refresh} notify={setToast} />
            )}
            {tab === "rules" && <Rules workspaceId={workspaceId} refresh={refresh} notify={setToast} />}
            {tab === "packet" && <Packet workspaceId={workspaceId} />}
            <p className="footer-note" style={{ textAlign: "center", marginTop: 24 }}>
              Federal and California only. Estimates from ruleset {overview.ruleset_version}. Not covered: your total tax bill,
              credits, states other than California, limits that apply to each owner personally, and filing anything.
            </p>
          </>
        )}
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
