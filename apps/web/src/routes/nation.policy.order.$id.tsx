import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OrderScreen } from "../nation/policy/OrderScreen";
import { InTerm } from "../shell/InTerm";

function OrderPage() {
  const { id } = Route.useParams();
  const { record } = Route.useSearch();
  const navigate = useNavigate({ from: "/nation/policy/order/$id" });
  return <InTerm>{(campaign) => <OrderScreen key={id} campaign={campaign} id={id} recordId={record} onCloseRecord={() => void navigate({ search: {}, replace: true, resetScroll: false })} />}</InTerm>;
}

export const Route = createFileRoute("/nation/policy/order/$id")({
  validateSearch: (search: Record<string, unknown>): { readonly record?: string } => typeof search.record === "string" && search.record.length > 0 && search.record.length <= 200 ? { record: search.record } : {},
  component: OrderPage,
});
