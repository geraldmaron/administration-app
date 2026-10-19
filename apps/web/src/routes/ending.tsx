import { createFileRoute } from "@tanstack/react-router";
import { Ending } from "../record/Ending";
import { InTerm } from "../shell/InTerm";

function EndingPage() {
  return <InTerm>{(campaign) => <Ending campaign={campaign} />}</InTerm>;
}

export const Route = createFileRoute("/ending")({
  component: EndingPage,
});
