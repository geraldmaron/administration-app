import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EconomyScreen } from "../nation/economy/EconomyScreen";
import { marketSearch, type MarketPatch } from "../nation/economy/market-search";
import { InTerm } from "../shell/InTerm";

function EconomyPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/nation/economy" });
  const update = (patch: MarketPatch) => void navigate({ search: (current) => marketSearch({ ...current, ...patch }), replace: !("peers" in patch || "peerWindow" in patch), resetScroll: false });
  return <InTerm>{(campaign) => <EconomyScreen campaign={campaign} view={search.view ?? "overview"} onView={(view) => update({ view, measure: undefined, observation: undefined })} measure={search.measure} market={search} onMarket={update} />}</InTerm>;
}

export const Route = createFileRoute("/nation/economy")({ validateSearch: marketSearch, component: EconomyPage });
