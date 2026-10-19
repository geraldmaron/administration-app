import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Campaign } from "@admin/engine";
import { resolveLens } from "@admin/player-core";
import { Column, Page, Select, Text } from "@admin/ui";
import { MapView } from "@admin/ui/map";
import { InTerm } from "../../../src/shell/InTerm";
import { lensCatalog } from "../../../src/map/lens-catalog";
import { useMapPalette } from "../../../src/map/use-lens";
import { useMapProps } from "../../../src/map/use-map-props";
import { useRegionDoor } from "../../../src/map/use-region-door";

/** A development door: every lens in the registry on the one map, for the seeded campaign. It is never linked from the game. */
function DevMap({ campaign }: { readonly campaign: Campaign }) {
  const params = useLocalSearchParams<{ lens?: string }>();
  const router = useRouter();
  const palette = useMapPalette();
  const catalog = useMemo(() => lensCatalog(campaign), [campaign]);
  const lens = params.lens && catalog.includes(params.lens) ? params.lens : (catalog[0] ?? "approval");
  const options = useMemo(() => catalog.map((id) => ({ value: id, label: `${resolveLens(id, campaign, palette).name} (${id})` })), [catalog, campaign, palette]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const open = useRegionDoor(setSelected);
  const map = useMapProps(campaign, lens);
  const choose = (regionKey: string) => {
    setSelected(regionKey);
    open(regionKey);
  };
  return (
    <Page eyebrow="Development" icon="world" title="The map" lede={`${catalog.length} lenses over this campaign, drawn on the one map.`}>
      <Column gap="lg">
        <MapView
          title="Every lens"
          note="Each reading is a lens in player-core's registry. The map, its key and its list all read the same rows."
          {...map}
          {...(selected ? { selected } : {})}
          onSelect={choose}
          aside={<Select label="Lens" options={options} value={lens} onChange={(id) => router.setParams({ lens: id })} testID="dev-map-lens" />}
          testID="dev-map"
        />
        <Text variant="caption" tone="tertiary">
          {selected ? `Chosen: ${selected}` : "Choose a region on the map or in its list."}
        </Text>
      </Column>
    </Page>
  );
}

export default function DevMapRoute() {
  return <InTerm>{(campaign) => <DevMap campaign={campaign} />}</InTerm>;
}
