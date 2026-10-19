import { createFileRoute } from "@tanstack/react-router";
import { selectScandals, type Campaign } from "@admin/engine";
import { EmptyState, buttonClass } from "@admin/ui-web";
import { ScandalScreen } from "../brief/ScandalScreen";
import { Door } from "../shell/Door";
import { InTerm } from "../shell/InTerm";
import { Screen } from "../shell/Screen";

function Story({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const scandal = selectScandals(campaign).find((story) => story.id === id);
  if (scandal) return <ScandalScreen campaign={campaign} scandal={scandal} />;
  return (
    <Screen title="No such story" eyebrow="A running story" screenClass="workspace" camera="us">
      <EmptyState icon="emptyRecord" title="This story is not on the board">
        It may have run its course. <Door href="/brief" className={buttonClass("secondary")}>Back to the Brief</Door>
      </EmptyState>
    </Screen>
  );
}

function ScandalPage() {
  const { id } = Route.useParams();
  return <InTerm>{(campaign) => <Story key={id} campaign={campaign} id={id} />}</InTerm>;
}

export const Route = createFileRoute("/brief/scandal/$id")({
  component: ScandalPage,
});
