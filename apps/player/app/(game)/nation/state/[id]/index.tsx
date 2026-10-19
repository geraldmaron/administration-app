import { Redirect, useLocalSearchParams } from "expo-router";
import { place } from "@admin/player-core";
import { CohortId, StateId } from "@admin/world";
import { paramOf, setSearchParams } from "../../../../../src/nation/params";
import { NoSuchState, StateScreen, isStateLens, isStateView } from "../../../../../src/nation/state/StateScreen";
import { InNation } from "../../../../../src/nation/NationTrail";
import { InTerm } from "../../../../../src/shell/InTerm";

export default function StateRoute() {
  const params = useLocalSearchParams<{ id: string; cohort?: string; district?: string; lens?: string; act?: string; power?: string; view?: string }>();
  const state = StateId.safeParse((paramOf(params.id) ?? "").toUpperCase());
  const cohort = CohortId.safeParse(paramOf(params.cohort));
  const district = paramOf(params.district)?.toUpperCase();
  const lens = paramOf(params.lens);
  const view = paramOf(params.view);
  const act = paramOf(params.act);
  const power = paramOf(params.power);
  // Act desks moved to the state's own act address; links saved before that still land on the desk they named.
  if (state.success && act) return <Redirect href={place.stateAct(state.data, act) as never} />;
  if (state.success && (power === "1" || power === "true")) return <Redirect href={place.stateAct(state.data) as never} />;
  return (
    <InTerm>
      {(campaign) => (
        <InNation room="state" {...(state.success && campaign.states[state.data] ? { here: campaign.states[state.data]!.base.name } : {})}>
          {state.success ? (
            <StateScreen
              campaign={campaign}
              id={state.data}
              {...(cohort.success ? { cohort: cohort.data } : {})}
              {...(district ? { district } : {})}
              lens={isStateLens(lens) ? lens : "approval"}
              onLens={(next) => setSearchParams({ lens: next === "approval" ? undefined : next })}
              view={isStateView(view) ? view : cohort.success ? "people" : "overview"}
              onView={(next) => setSearchParams({ view: next === "overview" ? undefined : next, cohort: undefined })}
            />
          ) : (
            <NoSuchState />
          )}
        </InNation>
      )}
    </InTerm>
  );
}
