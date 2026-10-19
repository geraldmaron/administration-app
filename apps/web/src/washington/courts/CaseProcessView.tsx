import type { ReactNode } from "react";
import type { ProspectiveOrderAuthority } from "@admin/engine";
import type { CaseGoverning, CaseProcess, CaseStepId, CaseStepState } from "@admin/player-core";
import { HelpTip } from "@admin/ui-web";
import { weeksWords } from "./court-words";
import "./court-system.css";

const STEP_WORDS: Readonly<Record<CaseStepId, string>> = {
  filed: "Filed",
  interim: "Interim relief",
  district: "District merits",
  appeal: "Appeal",
  supreme: "Supreme Court",
  final: "Final disposition",
};

const STATE_WORDS: Readonly<Record<CaseStepState, string>> = {
  done: "recorded",
  now: "where it stands",
  possible: "possible, not scheduled",
  "not-reached": "not reached",
};

function governingWords(governing: CaseGoverning, subject: string): { readonly title: string; readonly detail: string; readonly tone: string } {
  switch (governing.kind) {
    case "final":
      return governing.dismissed
        ? { title: "Final: dismissed", detail: "The challenge ended at threshold. No court reached the merits.", tone: "final" }
        : { title: governing.upheld ? "Final: upheld" : "Final: set aside", detail: `The final disposition governs ${subject}. It does not change with later events.`, tone: "final" };
    case "circuit":
      return { title: governing.setAside ? "Circuit judgment governs: set aside" : "Circuit judgment governs: sustained", detail: "The three-judge panel's judgment replaces the district court's, and any stay of the district judgment with it.", tone: "judgment" };
    case "stay-granted":
      return { title: "A stay pauses the lower judgment", detail: "Temporary, while review is considered. It is not a ruling on the challenge.", tone: "stay" };
    case "lower-in-force":
      return { title: governing.setAside ? "Lower judgment in force: set aside" : "Lower judgment in force: sustained", detail: "It governs now. An appeal alone does not pause it.", tone: "judgment" };
    case "lower-stayed":
      return { title: "Lower judgment stayed pending appeal", detail: `It was ${governing.setAside ? "against" : "for"} ${subject}, but it does not take effect while the appeal continues.`, tone: "stay" };
    case "interim":
      return { title: "Interim relief in place", detail: "A preliminary order governs until the merits are decided.", tone: "stay" };
    case "none":
      return { title: "No court order yet", detail: `Nothing a court has done restrains ${subject} so far.`, tone: "none" };
  }
}

const OPERATIVE_WORDS: Readonly<Record<ProspectiveOrderAuthority, string>> = {
  ended: "Its authority has ended.",
  suspended: "Its future operation is suspended.",
  "not-yet-effective": "It has not yet taken effect.",
  operative: "It has authority to operate, subject to funding and implementation.",
};

type Props = {
  readonly process: CaseProcess;
  /** What is contested: the order's name or the matter's authority. */
  readonly contested: string;
  readonly ground: string;
  /** Your answer, drawn beside the step that waits on it. */
  readonly response?: ReactNode;
};

/**
 * A case's process drawn as the path it travels: what the record holds, where
 * it stands with the next date, and what is only possible. Beside it, what is
 * contested against what governs now, so a stay never reads as a remedy.
 */
export function CaseProcessView({ process, contested, ground, response }: Props) {
  const governing = governingWords(process.governing, process.operative ? "the order" : "the challenged action");
  return (
    <div className="court-system case-process">
      <section className="court-panel" aria-labelledby="case-process-title">
        <div className="court-panel__title">
          <h2 id="case-process-title">Where this case stands</h2>
          <HelpTip label="About the case path">
            Steps with dates are on the record. The highlighted step is where the case stands. The court may not reach later steps. A remand sends a case back to the district court.
          </HelpTip>
        </div>
        <ol className="case-path" aria-label="Case path">
          {process.steps.map((step) => (
            <li key={step.id} className="case-path__step" data-state={step.state} aria-current={step.state === "now" ? "step" : undefined}>
              <span className="case-path__mark" aria-hidden="true" />
              <span className="case-path__name">
                {STEP_WORDS[step.id]}
                {step.id === "district" && process.remanded ? " (remanded)" : ""}
                <span className="ui-visually-hidden">, {STATE_WORDS[step.state]}</span>
              </span>
              {step.moments.length > 0 ? (
                <ul className="case-path__moments">
                  {step.moments.map((moment) => <li key={moment.date + moment.text}><strong>{moment.date}</strong> {moment.text}</li>)}
                </ul>
              ) : (
                <span className="case-path__note">{step.state === "now" ? "No event recorded yet" : STATE_WORDS[step.state]}</span>
              )}
              {step.state === "now" && process.next ? <span className="case-path__next">Next on the court&rsquo;s calendar: {process.next.date}, {weeksWords(process.next.weeks)}</span> : null}
              {step.state === "now" && process.response ? <span className="case-path__due">Your answer due {process.response.date}, {weeksWords(process.response.weeks)}</span> : null}
            </li>
          ))}
        </ol>
        {response}
      </section>
      <section className="court-panel" aria-labelledby="case-authority-title">
        <div className="court-panel__title">
          <h2 id="case-authority-title">What is contested and what governs now</h2>
        </div>
        <div className="case-authority">
          <div className="case-authority__side">
            <span className="case-authority__label">Contested</span>
            <strong>{contested}</strong>
            <span>{ground}</span>
          </div>
          <div className="case-authority__side" data-tone={governing.tone}>
            <span className="case-authority__label">Governs now</span>
            <strong>{governing.title}</strong>
            <span>{governing.detail}</span>
            {process.operative ? <span className="case-authority__operative">The order: {OPERATIVE_WORDS[process.operative]}</span> : null}
          </div>
        </div>
        {process.stay ? (
          <p className="case-authority__stay" data-status={process.stay.status}>
            Stay application, requested {process.stay.requested}:{" "}
            {process.stay.status === "pending" ? "no decision recorded, and the court has set no date." : `${process.stay.status} ${process.stay.decided ?? ""}. A stay is temporary and decides nothing on the merits.`}
            {process.stay.superseded ? " A later judgment has since replaced the one it paused, so it no longer governs." : ""}
          </p>
        ) : null}
      </section>
    </div>
  );
}
