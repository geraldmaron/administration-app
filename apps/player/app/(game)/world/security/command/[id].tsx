import { router, useLocalSearchParams } from "expo-router";
import { InTerm } from "../../../../../src/shell/InTerm";
import { ReviewBoundary } from "../../../../../src/review/PresidentialReview";
import { CommandScreen } from "../../../../../src/security/CommandScreen";
import { commandSearch } from "../../../../../src/security/params";
import { flatQuery, one } from "../../../../../src/world/params";

export default function CommandRoute() {
  const query = useLocalSearchParams();
  const id = one(query, "id") ?? "";
  const { action } = commandSearch(flatQuery(query));
  return <ReviewBoundary>
      <InTerm>{(campaign) => <CommandScreen key={id} campaign={campaign} id={id} action={action} onAction={(next) => router.setParams({ action: next } as never)} />}</InTerm>
    </ReviewBoundary>;
}
