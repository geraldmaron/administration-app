import { useState } from "react";
import { requestAppropriation, type Campaign } from "@admin/engine";
import { BUDGET_SEND, appropriationStatus, type AppropriationStatus, type BudgetDraftReading } from "@admin/player-core";
import { Column } from "@admin/ui";
import { CompareChoices, type ChoiceRowView } from "@admin/ui/nation";
import { ActDone, ActProblem } from "../ActDone";
import type { NationAct } from "../act";
import { incomeShare } from "./Allocation";
import { lastsWords } from "./Draft";

/** What the floor would do with the draft, in one line. */
function floorWords(reading: BudgetDraftReading): string {
  if (!reading.ok) return "Not submitted";
  const { floor } = reading;
  if (floor.accounts.length === 0) return "Nothing to vote on. Your draft matches the current budget";
  if (!floor.wouldEnact) return "Fails, and the government stays on last year's budget";
  if (floor.refused.length > 0) return `Passes, with ${floor.refused.length === 1 ? "1 line" : `${floor.refused.length} lines`} cut and kept at last year's amount`;
  return "Passes the House and the Senate";
}

function compareRows(status: AppropriationStatus, reading: BudgetDraftReading): readonly ChoiceRowView[] {
  const draft = reading.ok ? reading : undefined;
  const inForce = draft?.flow.inForce;
  const lapse = status.shutdown ? "The government stays shut down until a budget passes" : `${status.fundedThrough}, then the government shuts down unless a budget passes`;
  return [
    { id: "book", label: "Budget per year", icon: "budget", cells: { [BUDGET_SEND]: draft ? `${incomeShare(draft.totals.draft)}, from ${incomeShare(draft.totals.inForce)} today` : "Not available" } },
    { id: "lasts", label: "How long the money lasts", icon: "schedule", cells: { [BUDGET_SEND]: draft ? `${lastsWords(draft.flow.draft)}${inForce ? `, from ${lastsWords(inForce).charAt(0).toLowerCase()}${lastsWords(inForce).slice(1)} today` : ""}` : "Not available" } },
    { id: "floor", label: "Congress's vote", icon: "subjectChamber", cells: { [BUDGET_SEND]: floorWords(reading) } },
    { id: "funded", label: "Funded through", icon: "pending", cells: { [BUDGET_SEND]: draft?.floor.wouldEnact ? `${status.next.fundedThrough}, fiscal year ${status.next.fiscalYear}` : lapse } },
    { id: "cost", label: "What it costs now", icon: "budget", cells: { [BUDGET_SEND]: "Nothing charged" } },
  ];
}

function unavailable(reading: BudgetDraftReading): string | undefined {
  if (!reading.ok) return `Not available right now. ${reading.reason}`;
  if (reading.candidate.changed.length === 0) return "Not available right now. Change at least 1 line from the current budget so there's something to send.";
  return undefined;
}

/** Sending the drafted book to the Hill, read as its change from the book in force, then the receipt. */
export function Request({ campaign, reading, acts, onSent }: { readonly campaign: Campaign; readonly reading: BudgetDraftReading; readonly acts: NationAct; readonly onSent: () => void }) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const status = appropriationStatus(campaign);
  if (acts.done) {
    const after = appropriationStatus(acts.done.after);
    const funded = after.onPriorYear ? `${after.fundedThrough}, on last year's budget` : after.fundedThrough;
    return (
      <ActDone
        done={{ ...acts.done, lines: [...acts.done.lines, { label: "Funded through", value: funded }] }}
        backLabel="Write another budget"
        onBack={() => {
          setSelected(undefined);
          onSent();
          acts.dismiss();
        }}
      />
    );
  }
  const locked = unavailable(reading);
  const send = () => {
    if (!reading.ok) return;
    const lines = [
      { label: "Submitted", value: `${incomeShare(reading.totals.draft)} of national income a year` },
      { label: "Congress's vote", value: floorWords(reading) },
    ];
    void acts.run(
      () => {
        const result = requestAppropriation(campaign, reading.candidate);
        if (!result.ok) throw new Error(result.reason);
        return { packet: result.packet, title: reading.floor.wouldEnact ? "Budget sent and passed" : "Budget sent and turned down", lines, ...(reading.floor.wouldEnact ? {} : { outcome: "refused" as const }) };
      },
      { tier: "full", title: "Send your budget to Congress", verb: "Confirm and send", lines },
    );
  };
  return (
    <Column gap="sm">
      <CompareChoices
        title="Your decision"
        options={[
          { id: BUDGET_SEND, label: "Send your budget", icon: "dispatch", ...(locked ? { unavailable: locked } : {}) },
        ]}
        rows={compareRows(status, reading)}
        selected={selected}
        onSelect={setSelected}
        verb="Send budget to Congress"
        onAuthorize={send}
        {...(reading.ok ? { review: `Congress votes on each line you changed. ${floorWords(reading)}. The result goes in the Record.` } : {})}
        waiting={status.shutdown ? "Until a budget passes, the government stays shut down." : `Without a new budget, the money lasts through ${status.fundedThrough}, then the government shuts down.`}
        busy={acts.busy}
      />
      <ActProblem problem={acts.problem} />
    </Column>
  );
}
