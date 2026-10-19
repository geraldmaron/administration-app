import { useLocalSearchParams } from "expo-router";
import { treatyScreenReading } from "@admin/player-core";
import { InTerm } from "../../../../src/shell/InTerm";
import { ReviewBoundary } from "../../../../src/review/PresidentialReview";
import { NoSuchTreaty, TreatyScreen } from "../../../../src/world/sets/TreatyScreen";
import { one } from "../../../../src/world/params";

export default function TreatyRoute() {
  const id = one(useLocalSearchParams(), "id") ?? "";
  return (
    <ReviewBoundary>
      <InTerm>
      {(campaign) => {
        const reading = treatyScreenReading(campaign, id);
        return reading ? <TreatyScreen key={id} campaign={campaign} reading={reading} /> : <NoSuchTreaty />;
      }}
    </InTerm>
    </ReviewBoundary>
  );
}
