import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import type { Campaign } from "@admin/engine";
import { warScreenReading } from "@admin/player-core";
import { InTerm } from "../../../../src/shell/InTerm";
import { ReviewBoundary } from "../../../../src/review/PresidentialReview";
import { NoSuchWar, WarScreen } from "../../../../src/world/war/WarScreen";
import { one } from "../../../../src/world/params";

/** A war's reading weighs every government's willingness to join, so it is read once per campaign, not per render. */
function War({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const reading = useMemo(() => warScreenReading(campaign, id), [campaign, id]);
  return reading ? <WarScreen campaign={campaign} reading={reading} /> : <NoSuchWar />;
}

export default function WarRoute() {
  const id = one(useLocalSearchParams(), "id") ?? "";
  return <ReviewBoundary>
      <InTerm>{(campaign) => <War key={id} campaign={campaign} id={id} />}</InTerm>
    </ReviewBoundary>;
}
