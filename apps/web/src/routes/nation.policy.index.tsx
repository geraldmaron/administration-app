import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { isPolicyDomain } from "@admin/player-core";
import { PolicyScreen, isPolicyView, type PolicyView } from "../nation/policy/PolicyScreen";
import type { OrderCollectionSearch } from "../nation/policy/OrderPipeline";
import { InTerm } from "../shell/InTerm";

type PolicySearch = OrderCollectionSearch & { readonly domain?: string; readonly view?: PolicyView };

function PolicyPage() {
  const search = Route.useSearch();
  const { domain, view } = search;
  const navigate = useNavigate({ from: "/nation/policy/" });
  const selected = isPolicyDomain(domain) ? domain : "fiscal";
  const choose = (next: PolicyView) => void navigate({ search: (prior) => ({ ...prior, view: next === "proposals" ? undefined : next }), replace: true });
  return <InTerm>{(campaign) => <PolicyScreen key={selected} campaign={campaign} domain={selected} view={view ?? "proposals"} onView={choose} onDomain={(next) => void navigate({ search: (prior) => ({ ...prior, domain: next }), resetScroll: false })} orderSearch={search} onOrderSearch={(next) => void navigate({ search: (prior) => ({ ...prior, ...next }), replace: true, resetScroll: false })} />}</InTerm>;
}

export const Route = createFileRoute("/nation/policy/")({
  validateSearch: (search: Record<string, unknown>): PolicySearch => ({
    ...(search.orderScope === "issued" || search.orderScope === "catalogue" ? { orderScope: search.orderScope } : {}),
    ...(typeof search.orderStatus === "string" && ["desk", "shut", "rulemaking", "court", "standing", "undone"].includes(search.orderStatus) ? { orderStatus: search.orderStatus } : {}),
    ...(typeof search.orderQuery === "string" && search.orderQuery.length <= 200 ? { orderQuery: search.orderQuery } : {}),
    ...(typeof search.domain === "string" ? { domain: search.domain } : {}),
    ...(isPolicyView(search.view) && search.view !== "proposals" ? { view: search.view } : {}),
  }),
  component: PolicyPage,
});
