import type { Campaign } from "@admin/engine";
import { Column } from "@admin/ui";
import { MapFrame, MapKey } from "@admin/ui/map";
import { MapNote } from "../../map/MapSlot";
import { useMapProps } from "../../map/use-map-props";
import { useRegionBounds } from "../../map/use-region-bounds";
import { useRegionDoor } from "../../map/use-region-door";

// The state page's drawing, loaded after the page paints: MapLibre framed on
// the state's own shape, its districts recolored when the lens reads them.

export type StateMapCanvasProps = {
  readonly campaign: Campaign;
  readonly state: string;
  /** A registry lens id. */
  readonly lens: string;
  readonly title: string;
  /** The region outlined: the state, or a district inside it. */
  readonly selected: string;
  readonly onFail: (reason: string) => void;
};

/** Room around the state's own box, so its coast and borders sit inside the frame and its neighbors show at the edge. */
const MARGIN = 0.12;

function padded([west, south, east, north]: readonly [number, number, number, number]): [number, number, number, number] {
  const across = (east - west) * MARGIN;
  const up = (north - south) * MARGIN;
  return [west - across, south - up, east + across, north + up];
}

function Framed({ campaign, lens, title, selected, onFail, bounds }: Omit<StateMapCanvasProps, "state"> & { readonly bounds: readonly [number, number, number, number] }) {
  // The shaded-relief raster is drawn for the whole country; blown up to one state it is a smear, so a state's map is flat color with its own borders.
  const { relief: _relief, ...map } = useMapProps(campaign, lens, { camera: padded(bounds) });
  const open = useRegionDoor();
  return (
    <Column gap="md">
      <MapFrame title={title} {...map} height={460} minHeight={300} selected={selected} onSelect={(key) => key !== selected && open(key)} onFail={onFail} hint="Pick a district or a neighboring state to open it." />
      <MapKey legend={map.legend} />
    </Column>
  );
}

export default function StateMapCanvas(props: StateMapCanvasProps) {
  const bounds = useRegionBounds(`state:${props.state}`);
  if (bounds.status === "loading") return <MapNote height={300} message="Loading the map." />;
  if (bounds.status === "failed") return <MapNote height={300} message={`The map didn't load. ${bounds.error}`} />;
  return <Framed {...props} bounds={bounds.bounds} />;
}
