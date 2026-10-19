import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { commandSearch } from "../world/security/command-search";
import { CommandScreen } from "../world/security/CommandScreen";

function CommandPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/world/security/command/$id" });
  return <InTerm>{(campaign) => <CommandScreen key={id} campaign={campaign} id={id} action={search.action} onAction={(action) => void navigate({ search: { ...(action ? { action } : {}) }, replace: !action, resetScroll: false })} />}</InTerm>;
}

export const Route = createFileRoute("/world/security/command/$id")({
  validateSearch: commandSearch,
  component: CommandPage,
});
