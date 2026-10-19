import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { ExecutiveScreen } from "../washington/executive/ExecutiveScreen";
import { executiveSearch } from "../washington/executive/cabinet-view";
import "../washington/executive/washington.css";

/** Washington: the executive branch as a roster of offices and people. The scope and the filter live in the address, so Back and reload keep them. */
function Washington() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/washington/" });
  return <InTerm>{(campaign) => <ExecutiveScreen campaign={campaign} search={search} onSearch={(next) => void navigate({ search: next, resetScroll: false })} />}</InTerm>;
}

export const Route = createFileRoute("/washington/")({
  validateSearch: executiveSearch,
  component: Washington,
});
