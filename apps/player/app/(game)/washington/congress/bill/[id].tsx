import { useLocalSearchParams } from "expo-router";
import { billAndAct } from "@admin/player-core";
import { BillScreen } from "../../../../../src/congress/BillScreen";
import { Missing } from "../../../../../src/congress/Missing";
import { InTerm } from "../../../../../src/shell/InTerm";

export default function BillRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <InTerm>
      {(campaign) => {
        const found = typeof id === "string" ? billAndAct(campaign, id) : undefined;
        return found ? <BillScreen key={id} campaign={campaign} bill={found.bill} act={found.act} /> : <Missing eyebrow="Congress" title="Bill not found" line="We couldn't find this bill. Congress may not be working on it anymore." back="/washington/congress" backLabel="Congress" />;
      }}
    </InTerm>
  );
}
