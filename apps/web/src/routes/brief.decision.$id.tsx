import { createFileRoute } from "@tanstack/react-router";
import { Decision, type DecisionView } from "../decision/Decision";
import { InTerm } from "../shell/InTerm";

type DecisionSearch = { readonly view?: DecisionView };

function DecisionPage() {
  const { id } = Route.useParams();
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <InTerm>
      {(campaign) => (
        <Decision key={id} campaign={campaign} id={id} view={view ?? "advisers"} onView={(next) => void navigate({ search: next === "advisers" ? {} : { view: next }, replace: true })} />
      )}
    </InTerm>
  );
}

export const Route = createFileRoute("/brief/decision/$id")({
  validateSearch: (search: Record<string, unknown>): DecisionSearch => (search.view === "background" ? { view: "background" } : {}),
  component: DecisionPage,
});
