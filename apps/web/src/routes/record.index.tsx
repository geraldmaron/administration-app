import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { RecordScreen } from "../record/RecordScreen";
import { recordSearch, type RecordPatch } from "../record/search";

/** The Record: every entry of the term, searchable, with the open entry beside the list. */
function Record() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/record/" });
  const update = (patch: RecordPatch) => void navigate({ search: (current) => recordSearch({ ...current, ...patch }), replace: true, resetScroll: false });
  return <InTerm>{(campaign) => <RecordScreen campaign={campaign} search={search} selectedId={search.entry} onSearch={update} />}</InTerm>;
}

export const Route = createFileRoute("/record/")({
  validateSearch: recordSearch,
  component: Record,
});
