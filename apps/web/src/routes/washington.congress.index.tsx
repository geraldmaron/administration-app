import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { CongressScreen } from "../washington/congress/CongressScreen";
import type { CongressView } from "../washington/congress/views";
import { parseCongressSearch, type CongressSearch } from "../washington/congress/search";


function CongressPage() {
  const search = Route.useSearch();
  const { view } = search;
  const navigate = useNavigate({ from: "/washington/congress/" });
  const onView = (next: CongressView) => void navigate({ search: { ...search, view: next }, resetScroll: false });
  return <InTerm>{(campaign) => <CongressScreen campaign={campaign} view={view ?? "overview"} onView={onView} search={search} onSearch={async (next: CongressSearch) => { await navigate({ search: next, replace: true, resetScroll: false }); }} />}</InTerm>;
}

export const Route = createFileRoute("/washington/congress/")({
  validateSearch: parseCongressSearch,
  component: CongressPage,
});
