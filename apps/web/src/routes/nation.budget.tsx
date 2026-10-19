import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BudgetScreen, isBudgetView, type BudgetView } from "../nation/budget/BudgetScreen";
import { InTerm } from "../shell/InTerm";

type BudgetSearch = { readonly view?: BudgetView };

function BudgetPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate({ from: "/nation/budget" });
  const choose = (next: BudgetView) => void navigate({ search: next === "proposal" ? {} : { view: next }, replace: true });
  return <InTerm>{(campaign) => <BudgetScreen campaign={campaign} view={view ?? "proposal"} onView={choose} />}</InTerm>;
}

export const Route = createFileRoute("/nation/budget")({
  validateSearch: (search: Record<string, unknown>): BudgetSearch => (isBudgetView(search.view) && search.view !== "proposal" ? { view: search.view } : {}),
  component: BudgetPage,
});
