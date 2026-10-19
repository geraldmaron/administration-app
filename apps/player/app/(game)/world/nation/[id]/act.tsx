import { router, useLocalSearchParams } from "expo-router";
import { actSearchOf, parseActConfig, type ActConfig } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { InTerm } from "../../../../../src/shell/InTerm";
import { ReviewBoundary } from "../../../../../src/review/PresidentialReview";
import { ActWorkspace } from "../../../../../src/world/act/ActWorkspace";
import { countryReturnQuery, countryReturnSearch, flatQuery, one } from "../../../../../src/world/params";

/** Every key the act address may carry, so a choice that drops a term clears it from the address too. */
const ACT_KEYS = ["goal", "option", "count", "sector", "rate", "goods", "statute", "support", "partners", "strikeObjective", "civilianProtection", "regimeAct", "manage", "compare", "then", "returnView", "returnSector"] as const;

export default function ActRoute() {
  const query = useLocalSearchParams();
  const id = (one(query, "id") ?? "").toUpperCase() as NationId;
  const search = flatQuery(query);
  const origin = countryReturnSearch(search);
  const choose = (next: ActConfig) => {
    const params: Record<string, string | number> = { ...actSearchOf(next), ...countryReturnQuery(origin) };
    router.setParams(Object.fromEntries(ACT_KEYS.map((key) => [key, params[key] === undefined ? undefined : String(params[key])])) as never);
  };
  return <ReviewBoundary>
      <InTerm>{(campaign) => <ActWorkspace key={id} campaign={campaign} id={id} config={parseActConfig(search)} onConfig={choose} origin={origin} />}</InTerm>
    </ReviewBoundary>;
}
