import { useLocalSearchParams } from "expo-router";
import { CONDITION_KINDS, type ConditionKind } from "@admin/engine";
import { StateId } from "@admin/world";
import { paramOf } from "../../../../../src/nation/params";
import { LocaleActDesk, PowerActDesk } from "../../../../../src/nation/state/LocaleDesk";
import { NoSuchState } from "../../../../../src/nation/state/StateScreen";
import { InNation } from "../../../../../src/nation/NationTrail";
import { InTerm } from "../../../../../src/shell/InTerm";

const isCondition = (value: unknown): value is ConditionKind => typeof value === "string" && (CONDITION_KINDS as readonly string[]).includes(value);

/** A state's act desk at its own address, as a country's is, so Back from the desk returns to the state. */
export default function StateActRoute() {
  const params = useLocalSearchParams<{ id: string; cause?: string; power?: string }>();
  const state = StateId.safeParse((paramOf(params.id) ?? "").toUpperCase());
  const cause = paramOf(params.cause);
  return (
    <InTerm>
      {(campaign) => (
        <InNation room="state" {...(state.success && campaign.states[state.data] ? { here: campaign.states[state.data]!.base.name } : {})}>
          {state.success && isCondition(cause) ? (
            <LocaleActDesk key={`${state.data}:${cause}`} campaign={campaign} state={state.data} cause={cause} />
          ) : state.success ? (
            <PowerActDesk key={`${state.data}:power`} campaign={campaign} state={state.data} />
          ) : (
            <NoSuchState />
          )}
        </InNation>
      )}
    </InTerm>
  );
}
