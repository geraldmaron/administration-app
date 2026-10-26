import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { BUDGET_SEND, appropriationStatus, budgetFloorWords, type AppropriationStatus, type BudgetDraftReading } from "@admin/player-core";
import { CompareChoices, type ChoiceRowView } from "@admin/ui/nation";
import { incomeShare } from "./Allocation";
import { lastsWords } from "./Draft";

/** What the floor would do with the draft, in one line. */
const floorWords = (reading: BudgetDraftReading): string => (reading.ok ? budgetFloorWords(reading.floor) : "Not submitted");

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

/**
 * Sending the drafted book to the Hill, read as its change from the book in
 * force. The verb opens the draft's sign-off in the Drafts tray, the one place
 * a draft is signed, so the budget and an executive order in flight together
 * are each signed on their own.
 */
export function Request({ campaign, reading, onSend }: { readonly campaign: Campaign; readonly reading: BudgetDraftReading; readonly onSend: () => void }) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const status = appropriationStatus(campaign);
  const locked = unavailable(reading);
  return (
    <CompareChoices
      title="Your decision"
      options={[{ id: BUDGET_SEND, label: "Send your budget", icon: "dispatch", ...(locked ? { unavailable: locked } : {}) }]}
      rows={compareRows(status, reading)}
      selected={selected}
      onSelect={setSelected}
      verb="Send budget to Congress"
      onAuthorize={onSend}
      {...(reading.ok ? { review: `Your budget is a draft until you sign it. Congress votes on each line you changed. ${floorWords(reading)}. The result goes in the Record.` } : {})}
      waiting={status.shutdown ? "Until a budget passes, the government stays shut down." : `Without a new budget, the money lasts through ${status.fundedThrough}, then the government shuts down.`}
    />
  );
}
