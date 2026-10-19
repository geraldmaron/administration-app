import { useId, useState } from "react";
import { glossaryEntry } from "@admin/player-core";
import { Button } from "@admin/ui-web";
import { usePreferences } from "../app/hooks";

/** The id the walkthrough is put away under in the device's preferences. */
export const FIRST_RUN = "first-decision";

type Step = { readonly title: string; readonly body: string; readonly term?: string };

const STEPS: readonly Step[] = [
  {
    title: "The briefing shows what waiting costs",
    body: "Every decision opens on who is asking, what happened and where. Beside it sit the deadline, what happens if you leave it, and what is not yet known, so the cost of doing nothing is in view before you choose.",
    term: "put-off",
  },
  {
    title: "Compare, then authorize",
    body: "Every answer sits beside leaving the matter unanswered, on the same rows. Green, amber and red say whether a line helps or hurts you. Estimates are marked as staff estimates. Select an answer card to compare. Nothing happens until you press the button that carries out your choice.",
  },
  {
    title: "Everything has a place in the menu",
    body: "The menu groups the government by what you are doing: the Brief, Government, Domestic, World, Press and the Record. A whole row or card opens what it names, and the address keeps the view you were on, so Back returns you there.",
  },
  {
    title: "Maps where place matters",
    body: "The World, the states, emergencies, wars and commands show the map beside their file. On a phone, switch between Details and Map at the top of the sheet. Every place on the map is also in a list.",
    term: "approval-rating",
  },
];

/**
 * The first-run walkthrough, on the first decision a President opens: four
 * short steps on the briefing, the comparison, the menu and the maps, each with
 * its glossary term where one applies. Dismissed once, it stays away; turned off, no guidance
 * shows on this device until it is turned back on in settings.
 */
export function FirstRun() {
  const { preferences, update } = usePreferences();
  const titleId = useId();
  const [step, setStep] = useState(0);
  const dismissed = preferences.dismissedBriefs?.includes(FIRST_RUN) ?? false;
  if (preferences.hideGuidance === true || dismissed) return null;
  const current = STEPS[step]!;
  const term = current.term ? glossaryEntry(current.term) : undefined;
  const putAway = () => update({ dismissedBriefs: [...(preferences.dismissedBriefs ?? []), FIRST_RUN] });
  const last = step === STEPS.length - 1;
  return (
    <aside className="first-run" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <p className="first-run__count">
        First decision · {step + 1} of {STEPS.length}
      </p>
      <h2 id={titleId} className="first-run__title">
        {current.title}
      </h2>
      <p className="first-run__body">{current.body}</p>
      {term ? (
        <p className="first-run__term">
          <strong>{term.term}.</strong> {term.definition}
        </p>
      ) : null}
      <div className="first-run__acts">
        {step > 0 ? (
          <Button size="sm" kind="ghost" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : null}
        <Button size="sm" kind="primary" onClick={() => (last ? putAway() : setStep(step + 1))}>
          {last ? "Done" : "Next"}
        </Button>
        <Button size="sm" kind="ghost" onClick={putAway}>
          Skip
        </Button>
        <Button size="sm" kind="ghost" onClick={() => update({ hideGuidance: true })}>
          Turn off guidance
        </Button>
      </div>
    </aside>
  );
}
