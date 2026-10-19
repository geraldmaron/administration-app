import { useState } from "react";
import { requestAppropriation, type BudgetDraftInput, type Campaign } from "@admin/engine";
import { BUDGET_SEND, appropriationStatus, type AppropriationStatus, type BudgetDraftReading } from "@admin/player-core";
import { CompareAuthorize, type CompareRow } from "@admin/ui-web";
import { useChoiceProjection } from "../../modeling/ChoiceProjection";
import { useSettled } from "../../modeling/useSettled";
import { ActReceipt } from "../economy/ActReceipt";
import type { Commission, Committed, NationCommit } from "../economy/commit";
import { incomeShare } from "./AllocationEditor";
import { lastsWords } from "./DraftProjection";

const SEND = BUDGET_SEND;

/** What the floor would do with the draft, in one line. */
function floorWords(reading: BudgetDraftReading): string {
  if (!reading.ok) return "Not submitted";
  const { floor } = reading;
  if (floor.accounts.length === 0) return "Nothing to vote: the draft is the book in force";
  if (!floor.wouldEnact) return "Fails: the government stays on last year's book";
  if (floor.refused.length > 0) return `Carries, with ${floor.refused.length === 1 ? "one line" : `${floor.refused.length} lines`} struck and left at last year's rate`;
  return "Carries in both chambers";
}

function compareRows(status: AppropriationStatus, reading: BudgetDraftReading): readonly CompareRow[] {
  const draft = reading.ok ? reading : undefined;
  const inForce = draft?.flow.inForce;
  const lapse = status.shutdown ? "The government is closed until a book passes" : `${status.fundedThrough}, then the government closes unless a book passes`;
  return [
    { label: "The book, a year", icon: "budget", cells: { [SEND]: draft ? `${incomeShare(draft.totals.draft)}, from ${incomeShare(draft.totals.inForce)} today` : "Not available" } },
    { label: "How long the authority lasts", icon: "schedule", cells: { [SEND]: draft ? `${lastsWords(draft.flow.draft)}${inForce ? `, from ${lastsWords(inForce).charAt(0).toLowerCase()}${lastsWords(inForce).slice(1)} today` : ""}` : "Not available" } },
    { label: "On the floor", icon: "subjectChamber", cells: { [SEND]: floorWords(reading) } },
    {
      label: "Funded through",
      icon: "pending",
      cells: { [SEND]: draft?.floor.wouldEnact ? `${status.next.fundedThrough}, fiscal ${status.next.fiscalYear}` : lapse },
    },
    { label: "What it costs now", icon: "budget", cells: { [SEND]: <span className="cell-none">Nothing charged</span> } },
  ];
}

function unavailable(reading: BudgetDraftReading): string | undefined {
  if (!reading.ok) return `Not available: ${reading.reason}`;
  if (reading.candidate.changed.length === 0) return "Not available: move at least one line from the book in force to have something to submit.";
  return undefined;
}

/** The request as the commit takes it: titled and lined from the projection, the packet built at press time on the same campaign. */
function requestCommission(campaign: Campaign, reading: Extract<BudgetDraftReading, { ok: true }>): Commission {
  return {
    title: reading.floor.wouldEnact ? "Appropriation requested and passed" : "Appropriation requested and refused",
    review: { tier: "full", title: "Submit the appropriation request", verb: "Confirm and submit", lines: [{ label: "Submitted", value: `${incomeShare(reading.totals.draft)} of national income a year` }, { label: "On the floor", value: floorWords(reading) }] },
    ...(reading.floor.wouldEnact ? {} : { outcome: "refused" as const }),
    lines: [
      { label: "Submitted", value: `${incomeShare(reading.totals.draft)} of national income a year` },
      { label: "On the floor", value: floorWords(reading) },
    ],
    packet: () => {
      const result = requestAppropriation(campaign, reading.candidate);
      if (!result.ok) throw new Error(result.reason);
      return result.packet;
    },
  };
}

/** The receipt, with where the money now runs to read off the campaign the request left. */
function RequestReceipt({ committed, onAgain }: { readonly committed: Committed; readonly onAgain: () => void }) {
  const after = appropriationStatus(committed.after);
  const funded = after.onPriorYear ? `${after.fundedThrough}, on last year's book` : after.fundedThrough;
  return <ActReceipt committed={{ ...committed, lines: [...committed.lines, { label: "Funded through", value: funded }] }} again="Draft another proposal" onAgain={onAgain} mapNote={null} />;
}

/** Sending the drafted book to the Hill, read as its change from the book in force, and the receipt. */
/** A drag settles before a projection starts on it: each run plays the whole draft through Congress and the weeks after. */
const DRAFT_SETTLE_MS = 700;

export function Request({ campaign, reading, draft, acts, onSent }: { readonly campaign: Campaign; readonly reading: BudgetDraftReading; readonly draft: BudgetDraftInput; readonly acts: NationCommit; readonly onSent: () => void }) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const settled = useSettled(draft, DRAFT_SETTLE_MS);
  const projectable = reading.ok && reading.candidate.changed.length > 0;
  const projection = useChoiceProjection(campaign, projectable ? { kind: "budget-draft", draft: settled } : undefined, selected);
  const status = appropriationStatus(campaign);
  if (acts.committed) {
    const again = () => {
      setSelected(undefined);
      onSent();
      acts.dismiss();
    };
    return <RequestReceipt committed={acts.committed} onAgain={again} />;
  }
  const locked = unavailable(reading);
  const send = () => {
    if (reading.ok) void acts.commit(requestCommission(campaign, reading));
  };
  return (
    <section className="budget-section" aria-label="Authorization">
      <CompareAuthorize
        title="Authorization"
        options={[{ id: SEND, label: "Submit your proposal", icon: "dispatch", ...(locked ? { unavailable: locked } : {}) }]}
        rows={compareRows(status, reading)}
        selected={selected}
        onSelect={setSelected}
        verb="Submit budget proposal"
        onAuthorize={send}
        review={reading.ok ? `Congress votes each changed line. ${floorWords(reading)}. The result goes on the Record.` : undefined}
        baselineReview={status.shutdown ? "Until a budget passes, the government stays closed." : `Without a new budget, the money runs through ${status.fundedThrough}, then the government closes.`}
        busy={acts.busy}
        docked
        {...(projection ? { projection, footnote: <p className="budget-note">The projection is for the draft as it stands; change a line and it runs again.</p> } : {})}
      />
      {acts.problem ? (
        <p className="budget-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </section>
  );
}
