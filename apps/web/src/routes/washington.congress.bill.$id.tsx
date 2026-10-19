import { createFileRoute } from "@tanstack/react-router";
import type { Campaign } from "@admin/engine";
import { billAndAct } from "@admin/player-core";
import { EmptyState } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { InTerm } from "../shell/InTerm";
import { Screen } from "../shell/Screen";
import { BillScreen } from "../washington/congress/BillScreen";

function Bill({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const found = billAndAct(campaign, id);
  if (found) return <BillScreen campaign={campaign} bill={found.bill} act={found.act} />;
  return (
    <Screen title="No such bill" eyebrow="Congress" screenClass="workspace" camera="us">
      <EmptyState icon="emptyRecord" title="This bill is not before Congress or on the record">
        <Door href="/washington/congress">Back to Congress</Door>
      </EmptyState>
    </Screen>
  );
}

function BillPage() {
  const { id } = Route.useParams();
  return <InTerm>{(campaign) => <Bill key={id} campaign={campaign} id={id} />}</InTerm>;
}

export const Route = createFileRoute("/washington/congress/bill/$id")({
  component: BillPage,
});
