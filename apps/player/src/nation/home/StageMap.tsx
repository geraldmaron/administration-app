import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { Column, Key, Row } from "@admin/ui";
import { MapFrame, MapKey, PinKey, type MapPin } from "@admin/ui/map";
import { pinsFor } from "../../map/pins";
import { useMapProps } from "../../map/use-map-props";
import { STAGE_LENS_NAMES, STAGE_MAP_LENS, type StageLensId } from "./stage-lens";

// The Nation stage's drawing, loaded after the page's readings and list have
// painted: everything here pulls in MapLibre and the geometry.

export type StageMapProps = {
  readonly campaign: Campaign;
  readonly lens: StageLensId;
  /** The chosen states' ids, every one outlined on the map. */
  readonly chosen: readonly string[];
  /** `additive` when the press adds to the set rather than replacing it. */
  readonly onSelect: (state: string, additive: boolean) => void;
  /** Every press adds to the set, for a hand with no shift key. */
  readonly several: boolean;
  /** The states that need the President, by region ref. */
  readonly marks: ReadonlyMap<string, MapPin["kind"]>;
  readonly height: number;
  readonly minHeight: number;
  readonly onFail: (reason: string) => void;
};

export default function StageMap({ campaign, lens, chosen, onSelect, several, marks, height, minHeight, onFail }: StageMapProps) {
  const map = useMapProps(campaign, STAGE_MAP_LENS[lens], { camera: "us" });
  const pins = useMemo(() => pinsFor(map.regions, marks), [map.regions, marks]);
  const choose = (regionKey: string, additive?: boolean) => {
    if (regionKey.startsWith("state:")) onSelect(regionKey.slice(6), several || additive === true);
  };
  const keys = useMemo(() => chosen.map((id) => `state:${id}`), [chosen]);
  return (
    <Column gap="md">
      <MapFrame
        title={`The states by ${STAGE_LENS_NAMES[lens].toLowerCase()}`}
        {...map}
        pins={pins}
        height={height}
        minHeight={minHeight}
        onSelect={choose}
        onFail={onFail}
        hint={several ? "Pick states to add them, or pick one again to take it out." : "Pick a state to manage it here."}
        chosen={keys}
      />
      <Row gap="lg" wrap top>
        <MapKey legend={map.legend} />
        <PinKey />
        {chosen.length > 0 ? <Key label="Outline on the map" entries={[{ id: "chosen", kind: "ring", label: "A state you chose", ink: "color" }]} /> : null}
      </Row>
    </Column>
  );
}
