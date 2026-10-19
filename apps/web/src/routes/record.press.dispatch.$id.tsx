import { createFileRoute } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { Dispatch } from "../record/Dispatch";

function DispatchPage() {
  const { id } = Route.useParams();
  return <InTerm>{(campaign) => <Dispatch key={id} campaign={campaign} index={Number(id)} />}</InTerm>;
}

export const Route = createFileRoute("/record/press/dispatch/$id")({
  component: DispatchPage,
});
