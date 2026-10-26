import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { Column, Key, Row } from "@admin/ui";
import { MapFrame, MapKey, PinKey, type MapPin } from "@admin/ui/map";
import { pinsFor } from "../../map/pins";
import { useMapProps } from "../../map/use-map-props";

// The Emergency screen's drawing, loaded after the page paints: every state
// colored by its most serious problem, pinned where one waits on a
// declaration or one is in force.

export type EmergencyMapProps = {
  readonly campaign: Campaign;
  /** The state of the problem the response below is for, outlined. */
  readonly selected?: string;
  readonly marks: ReadonlyMap<string, MapPin["kind"]>;
  /** A state picked on the map; the screen opens its most serious problem. */
  readonly onState: (state: string) => void;
  readonly onFail: (reason: string) => void;
};

export default function EmergencyMap({ campaign, selected, marks, onState, onFail }: EmergencyMapProps) {
  const map = useMapProps(campaign, "conditions", { camera: "us" });
  const pins = useMemo(() => pinsFor(map.regions, marks), [map.regions, marks]);
  return (
    <Column gap="md">
      <MapFrame
        title="Problems at home by state"
        {...map}
        pins={pins}
        height={380}
        minHeight={300}
        {...(selected ? { selected: `state:${selected}` } : {})}
        onSelect={(key) => {
          if (key.startsWith("state:")) onState(key.slice(6));
        }}
        onFail={onFail}
        hint="Each shaded state has a problem going on."
      />
      <Row gap="lg" wrap top>
        <MapKey legend={map.legend} />
        <PinKey />
        {selected ? <Key label="Outline on the map" entries={[{ id: "picked", kind: "ring", label: "The state whose problem is picked", ink: "color" }]} /> : null}
      </Row>
    </Column>
  );
}
