import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { actSearchOf, parseActConfig, type ActConfig } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { InTerm } from "../shell/InTerm";
import { countryReturnQuery, countryReturnSearch } from "../world/nation/country-search";
import { ActDesk } from "../world/nation/ActDesk";

function ActPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/world/nation/$id/act" });
  const origin = countryReturnSearch(search);
  const choose = (next: ActConfig) => void navigate({ search: { ...actSearchOf(next), ...countryReturnQuery(origin) }, replace: true });
  return <InTerm>{(campaign) => <ActDesk key={id.toUpperCase()} campaign={campaign} id={id.toUpperCase() as NationId} config={parseActConfig(search)} onConfig={choose} origin={origin} />}</InTerm>;
}

export const Route = createFileRoute("/world/nation/$id/act")({
  validateSearch: (search: Record<string, unknown>): Record<string, string | number> => ({ ...actSearchOf(parseActConfig(search)), ...countryReturnQuery(countryReturnSearch(search)) }),
  component: ActPage,
});
