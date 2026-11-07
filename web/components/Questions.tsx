"use client";

import { useEffect, useState } from "react";
import { get, post, receiptImageUrl } from "@/lib/api";
import { dollars, longDate } from "@/lib/format";
import type { Flagged, Question } from "@/lib/types";
import Traces from "./Traces";
import Upload from "./Upload";

type Props = {
  workspaceId: string;
  flagged: Flagged[];
  refresh: () => Promise<void>;
  notify: (message: string) => void;
};

export default function Questions({ workspaceId, flagged, refresh, notify }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0); // bumped to reload after an answer

  useEffect(() => {
    let stale = false;
    get<{ questions: Question[] }>(`/workspaces/${workspaceId}/questions`)
      .then((result) => !stale && setQuestions(result.questions))
      .catch((e: Error) => !stale && setError(e.message));
    return () => {
      stale = true;
    };
  }, [workspaceId, version]);

  async function answer(question: Question, category: string, label: string) {
    await post(`/workspaces/${workspaceId}/questions/${question.transaction_id}/answer`, { category });
    notify(`Saved as: ${label.toLowerCase()}.`);
    setVersion((v) => v + 1);
    await refresh();
  }

  async function undo(question: Question) {
    await post(`/workspaces/${workspaceId}/questions/${question.transaction_id}/undo`);
    notify("Answer removed. Nothing is counted until you answer.");
    setVersion((v) => v + 1);
    await refresh();
  }

  const openCount = questions ? questions.filter((q) => q.status === "needs_answer").length : 0;

  return (
    <div className="sheet">
      <h1 className="page-title">
        Questions <span>{questions === null ? "" : openCount === 0 ? "all answered" : `${openCount} open`}</span>
      </h1>
      <p className="lead">When the AI isn&apos;t sure, it asks you one question instead of guessing. Nothing is counted until you answer.</p>
      {error && <p className="error">{error}</p>}

      <Upload
        workspaceId={workspaceId}
        onDone={async () => {
          setVersion((v) => v + 1);
          await refresh();
        }}
      />

      {questions?.map((question) => (
        <div className="grid-2" key={question.transaction_id}>
          {question.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="receipt-img" src={receiptImageUrl(question.image)} alt={`${question.merchant} receipt, ${dollars(question.amount_cents)}`} style={{ maxWidth: "min(380px, 100%)" }} />
          )}
          <div>
            <p className="muted small">{question.merchant}, {dollars(question.amount_cents, true)}, {longDate(question.date)}</p>
            <h2 style={{ fontSize: 22, lineHeight: "30px", margin: "6px 0 12px" }}>{question.question}</h2>
            {isTeamOrClientMeal(question) && (
            <p style={{ color: "var(--ink-soft)" }}>
              Team meals at the office are 0% deductible on the federal return in 2026, but California still allows 100%.
              Client meals are 50% on both. Whether it counts as a team meal depends on the facts.{" "}
              <a className="source" href="https://www.law.cornell.edu/uscode/text/26/274" target="_blank" rel="noreferrer">[[IRC 274(o)]]</a>
            </p>
            )}

            {question.status === "needs_answer" ? (
              <div style={{ display: "flex", flexDirection: question.options.length > 2 ? "row" : "column", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
                {question.options.map((option) => (
                  <div className="question-box" key={option.category}>
                    <button className="button" onClick={() => answer(question, option.category, option.label)}>
                      {option.label}
                    </button>
                    {option.outcome && (
                      <p className="small" style={{ margin: "8px 0 0" }}>
                        Deductible: federal <strong>{dollars(option.outcome.federal.deductible_cents)}</strong>, California{" "}
                        <strong>{dollars(option.outcome.california.deductible_cents)}</strong>
                        {option.outcome.california.check_status === "needs_check" && " (California rule not yet confirmed)"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="question-box">
                <span className="state confirmed">Answered</span>{" "}
                Filed as {labelFor(question)}.{" "}
                <button className="linklike" onClick={() => undo(question)}>Undo</button>
              </p>
            )}
          </div>
        </div>
      ))}

      {flagged.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <p className="section-label">Flagged, nothing counted</p>
          <div className="grid-2" style={{ marginTop: 12 }}>
            {flagged.map((item) => (
              <div className="card" key={item.kind + (item.date ?? "")}>
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="receipt-img" src={receiptImageUrl(item.image)} alt={`${item.merchant || "Receipt photo"}, flagged`} style={{ maxWidth: "min(300px, 100%)", marginBottom: 16 }} />
                )}
                {item.kind === "hidden_instruction" ? (
                  <>
                    <p><strong>{item.merchant}</strong>{item.date && `, ${longDate(item.date)}`}</p>
                    <p className="panel">
                      The receipt had hidden text telling the AI to mark it 100% deductible.{" "}
                      <strong>It was treated as data, ignored and logged.</strong>
                    </p>
                    <span className="state cant_determine">Ignored</span>
                  </>
                ) : (
                  <>
                    <p><strong>Photo{item.date && ` from ${longDate(item.date)}`}, total unreadable</strong></p>
                    <p>No amount could be read, so no number is shown. It goes to your accountant.</p>
                    <span className="state cant_determine">Can&apos;t determine</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Traces workspaceId={workspaceId} version={version} />
    </div>
  );
}

function labelFor(question: Question): string {
  const match = question.options.find((option) => option.category === question.category);
  return match ? match.label.toLowerCase() : question.category;
}


// The meals note below is written for one choice: team meal at the office or client meal.
function isTeamOrClientMeal(question: Question) {
  const categories = question.options.map((option) => option.category);
  return categories.includes("team_meal_office") && categories.includes("client_meal");
}
