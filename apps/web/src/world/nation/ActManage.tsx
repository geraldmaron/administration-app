import { useState } from "react";
import { buildLift, buildStandDown, place, type ActWorkspace } from "@admin/player-core";
import type { NationId } from "@admin/world";
import type { Campaign } from "@admin/engine";
import { CompareAuthorize, EmptyState, buttonClass } from "@admin/ui-web";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { Door } from "../../shell/Door";
import { Screen } from "../../shell/Screen";
import type { ActCommit } from "./use-act-commit";

/** Ending something already under way, read as its change from today. */
export function ManageDesk({ campaign, nation, name, id, underway, act }: { readonly campaign: Campaign; readonly nation: NationId; readonly name: string; readonly id: string; readonly underway: ActWorkspace["underway"]; readonly act: ActCommit }) {
  const row = underway.find((entry) => entry.id === id && entry.endable);
  const [selected, setSelected] = useState<string | undefined>("end");
  const isMeasure = row?.kind === "measure";
  const projection = useChoiceProjection(
    row ? campaign : undefined,
    actsChoice(row?.title ?? "", "leaving it in place", "Leaving it in place.", [{ id: "end", label: isMeasure ? "Lift it" : "Call it off", act: isMeasure ? { act: "lift", id } : { act: "stand-down", id } }]),
    selected,
  );
  if (!row) {
    return (
      <Screen title={`Nothing to end for ${name}`} eyebrow="Act on a government" screenClass="workspace" camera="keep">
        <EmptyState icon="emptyInbox" title="That is no longer under way">
          It ended, or it was never yours to end. <Door href={place.countryAct(nation)}>Back to the workspace</Door>
        </EmptyState>
      </Screen>
    );
  }
  const measure = row.kind === "measure";
  const verb = measure ? "Lift the measure" : "Call off the operation";
  const ending = measure ? "Lift it" : "Call it off";
  return (
    <Screen icon="dispatch" title={row.title} eyebrow="Act on a government" screenClass="workspace" camera="keep">
      <div className="act-desk">
        <CompareAuthorize
          title={ending}
          options={[
            { id: "end", label: ending, icon: "return" },
          ]}
          rows={[
            { label: "What happens", kind: "lead", cells: { end: <span>{measure ? "The measure comes off. Prices and trade move back, and the relationship eases a little." : "The operation is recalled before it executes. Its money and forces are released."}</span> } },
            { label: "Cost now", icon: "budget", cells: { end: <span>{measure ? "No money" : "Nothing is lost; the set-aside money returns."}</span> } },
          ]}
          selected={selected}
          onSelect={setSelected}
          verb={verb}
          tone="commit"
          review={measure ? `Lifting it on ${name}. It goes on your Record.` : `Calling off the operation against ${name}. It goes on your Record.`}
          baselineReview={`Until you end it: ${row.detail}`}
          busy={act.busy}
          onAuthorize={() => void act.take(() => (measure ? buildLift(campaign, id) : buildStandDown(campaign, id)), { tier: "confirm", title: measure ? `Lift the measure on ${name}` : `Call off the operation against ${name}`, verb })}
          docked
          {...(projection ? { projection } : {})}
        />
        {act.problem ? (
          <p className="decision__problem" role="alert">
            {act.problem}
          </p>
        ) : null}
        <Door href={place.country(nation)} className={buttonClass("ghost", "sm")}>
          Back to {name}
        </Door>
      </div>
    </Screen>
  );
}
