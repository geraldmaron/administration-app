import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Campaign } from "@admin/engine";
import { warScreenReading } from "@admin/player-core";
import { InTerm } from "../shell/InTerm";
import { NoSuchWar, WarScreen } from "../world/war/WarScreen";

/** A war's reading weighs every government's willingness to join, so it is read once per campaign, not per render. */
function War({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const reading = useMemo(() => warScreenReading(campaign, id), [campaign, id]);
  return reading ? <WarScreen campaign={campaign} reading={reading} /> : <NoSuchWar />;
}

function WarPage() {
  const { id } = Route.useParams();
  return <InTerm>{(campaign) => <War key={id} campaign={campaign} id={id} />}</InTerm>;
}

export const Route = createFileRoute("/world/war/$id")({
  component: WarPage,
});
