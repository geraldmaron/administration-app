import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CONDITION_KINDS, type ConditionKind } from "@admin/engine";
import { CohortId, StateId } from "@admin/world";
import { LocaleActDesk, PowerActDesk } from "../nation/state/LocaleActDesk";
import { isStateLens, type StateLensId } from "../nation/state/lenses";
import { NoSuchState, StateScreen, isStateView, type StateView } from "../nation/state/StateScreen";
import { InTerm } from "../shell/InTerm";

type StateSearch = { readonly cohort?: CohortId; readonly district?: string; readonly lens?: StateLensId; readonly act?: ConditionKind; readonly power?: true; readonly view?: StateView };

const isCondition = (value: unknown): value is ConditionKind => typeof value === "string" && (CONDITION_KINDS as readonly string[]).includes(value);

function StatePage() {
  const { id } = Route.useParams();
  const { district, lens, act, power, view, cohort } = Route.useSearch();
  const navigate = useNavigate({ from: "/nation/state/$id" });
  const state = StateId.safeParse(id.toUpperCase());
  const choose = (next: StateLensId) => void navigate({ search: (prior) => ({ ...prior, lens: next === "approval" ? undefined : next }), replace: true });
  const chooseView = (next: StateView) => void navigate({ search: (prior) => ({ ...prior, view: next === "overview" ? undefined : next }), replace: true });
  return (
    <InTerm>
      {(campaign) =>
        state.success && act ? (
          <LocaleActDesk key={`${state.data}:${act}`} campaign={campaign} state={state.data} cause={act} />
        ) : state.success && power ? (
          <PowerActDesk key={`${state.data}:power`} campaign={campaign} state={state.data} />
        ) : state.success ? (
          <StateScreen cohort={cohort} campaign={campaign} id={state.data} {...(district ? { district } : {})} lens={lens ?? "approval"} onLens={choose} view={view ?? (cohort ? "people" : "overview")} onView={chooseView} />
        ) : (
          <NoSuchState />
        )
      }
    </InTerm>
  );
}

export const Route = createFileRoute("/nation/state/$id")({
  validateSearch: (search: Record<string, unknown>): StateSearch => ({
    ...(CohortId.safeParse(search.cohort).success ? { cohort: CohortId.parse(search.cohort) } : {}),
    ...(typeof search.district === "string" && search.district ? { district: search.district.toUpperCase() } : {}),
    ...(isStateLens(search.lens) && search.lens !== "approval" ? { lens: search.lens } : {}),
    ...(isCondition(search.act) ? { act: search.act } : {}),
    ...(search.power === true || search.power === 1 || search.power === "1" ? { power: true as const } : {}),
    ...(isStateView(search.view) && search.view !== "overview" ? { view: search.view } : {}),
  }),
  component: StatePage,
});
