import { createFileRoute } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { CaseScreen } from "../washington/courts/CaseScreen";

function CasePage() {
  const { id } = Route.useParams();
  return <InTerm>{(campaign) => <CaseScreen key={id} campaign={campaign} id={id} />}</InTerm>;
}

export const Route = createFileRoute("/washington/courts/case/$id")({
  component: CasePage,
});
