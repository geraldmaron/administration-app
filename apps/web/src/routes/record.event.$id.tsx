import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { RecordScreen } from "../record/RecordScreen";
import { recordSearch, type RecordPatch } from "../record/search";

/** One entry of the Record, opened in its place beside the list; the address is the deep link every receipt points to. */
function EventPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/record/event/$id" });
  const update = (patch: RecordPatch) => void navigate({ to: "/record", search: recordSearch({ ...search, entry: id, ...patch }) });
  return <InTerm>{(campaign) => <RecordScreen campaign={campaign} search={search} selectedId={id} onSearch={update} />}</InTerm>;
}

export const Route = createFileRoute("/record/event/$id")({
  validateSearch: recordSearch,
  component: EventPage,
});
