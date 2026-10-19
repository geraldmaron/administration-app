import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { NationHome } from "../nation/state/NationHome";
import { nationSearch, type NationPatch } from "../nation/state/nation-search";
import { InTerm } from "../shell/InTerm";

function NationPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/nation/" });
  const update = (patch: NationPatch) => void navigate({ search: (current) => nationSearch({ ...current, ...patch }), replace: true, resetScroll: false });
  return <InTerm>{(campaign) => <NationHome campaign={campaign} search={search} onSearch={update} view={search.view ?? "opinion"} lens={search.lens ?? "approval"} onView={(view) => update({ view })} onLens={(lens) => update({ lens })} />}</InTerm>;
}

export const Route = createFileRoute("/nation/")({ validateSearch: nationSearch, component: NationPage });
