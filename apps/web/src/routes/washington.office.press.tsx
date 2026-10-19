import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { PressScreen } from "../washington/press/PressScreen";
import { pressSearch, pressViewForSection } from "../washington/press/press-search";

function PressPage() {
  const search = Route.useSearch();
  const section = useRouterState({ select: (state) => state.location.hash });
  const context = { ...search, view: search.view ?? pressViewForSection(section) };
  const navigate = useNavigate({ from: "/washington/office/press" });
  return <InTerm>{(campaign) => <PressScreen campaign={campaign} search={context} onSearch={(next) => void navigate({ search: next, hash: "", resetScroll: false })} />}</InTerm>;
}

export const Route = createFileRoute("/washington/office/press")({
  validateSearch: pressSearch,
  component: PressPage,
});
