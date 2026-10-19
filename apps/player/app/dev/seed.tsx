import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { makeCampaignSeed, sealFounding } from "@admin/engine";
import { foundingOptions, openingChoices } from "@admin/player-core";
import { worldDataset } from "@admin/world";
import { Column, Page, Text } from "@admin/ui";
import { useStoresIfReady } from "../../src/device/hooks";

const PREVIEW_LEADER = "Preview President";

/**
 * A development door: seals the founding screen's own default choices on the
 * real dataset and begins it, so a surface can be inspected with live engine
 * state without walking the founding. It is never linked from the game.
 */
export default function Seed() {
  const store = useStoresIfReady();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!store) return;
    const seed = makeCampaignSeed("universal-player-preview");
    const choices = openingChoices(foundingOptions(seed));
    const campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: PREVIEW_LEADER } });
    // Each visit replaces the previous preview rather than adding another, so repeated seeding never fills the device's slots.
    const replacePreviews = async () => {
      const { campaigns } = await store.saves.list();
      for (const entry of campaigns) if (entry.leader.endsWith(PREVIEW_LEADER)) await store.saves.delete(entry.id);
      await store.begin(campaign);
    };
    replacePreviews().then(
      () => setDone(true),
      (cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)),
    );
  }, [store]);
  if (done) return <Redirect href="/brief" />;
  return (
    <Page title="Seeding a preview administration" eyebrow="Development">
      <Column>
        <Text tone={error ? "danger" : "secondary"}>{error || "Sealing the default founding on the real dataset."}</Text>
      </Column>
    </Page>
  );
}
