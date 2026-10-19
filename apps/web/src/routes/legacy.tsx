import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Legacy } from "../record/Legacy";
import { legacySearch } from "../record/legacy-search";
import { InTerm } from "../shell/InTerm";

function LegacyPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/legacy" });
  return <InTerm>{(campaign) => <Legacy campaign={campaign} search={search} onView={(view) => void navigate({ search: legacySearch({ view }), replace: true, resetScroll: false })} />}</InTerm>;
}

export const Route = createFileRoute("/legacy")({
  validateSearch: legacySearch,
  component: LegacyPage,
});
