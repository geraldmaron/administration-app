import { useMemo, useState } from "react";
import { Theme, View, useMedia } from "@tamagui/core";
import { Segmented } from "../forms";
import { Pressable } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import { mapKeyAction } from "./keys";
import { MapCanvas } from "./MapCanvas";
import { MapKey, MapList } from "./MapKey";
import { boundsAspect, fillsOf, MAP_COLORS } from "./style";
import type { MapRow, MapViewProps } from "./types";

type ViewMode = "map" | "list";

/** No frame is drawn shorter than this, so a region stays large enough to choose with a finger. */
const MIN_HEIGHT = 240;
type KeyEvent = { readonly key: string; readonly shiftKey?: boolean; preventDefault(): void };

const VIEW_OPTIONS = [
  { value: "map" as const, label: "Map", icon: "mapPin" as const },
  { value: "list" as const, label: "List", icon: "graph" as const },
];

function ControlButton({ label, glyph, onPress }: { readonly label: string; readonly glyph: string; readonly onPress: () => void }) {
  return (
    <Pressable aria-label={label} onPress={onPress} width={36} height={36} alignItems="center" justifyContent="center" backgroundColor={{ default: "surfaceRaised", hover: "surfaceHover", press: "backgroundPress" }} borderWidth={1} borderColor="borderColor">
      <Text variant="title" aria-hidden>
        {glyph}
      </Text>
    </Pressable>
  );
}

/** Zoom and frame, for the hand that cannot pinch or the reader without a wheel. */
function MapControls({ onZoom, onReframe }: { readonly onZoom: (by: 1 | -1) => void; readonly onReframe: () => void }) {
  return (
    <Column position="absolute" top={10} right={10} gap="xs">
      <ControlButton label="Zoom in" glyph="+" onPress={() => onZoom(1)} />
      <ControlButton label="Zoom out" glyph="−" onPress={() => onZoom(-1)} />
      <ControlButton label="Reset the view" glyph="⤢" onPress={onReframe} />
    </Column>
  );
}

/** What the region under the pointer or the keyboard reads, said aloud as it changes. */
function MapReadout({ label, value, hint }: { readonly label?: string; readonly value?: string; readonly hint: string }) {
  return (
    <View position="absolute" left={10} bottom={10} maxWidth="80%" paddingVertical="xs" paddingHorizontal="sm" borderRadius="control" backgroundColor="surface" borderWidth={1} borderColor="borderColor" opacity={0.94} aria-live="polite">
      {label ? (
        <Text variant="label" numberOfLines={2}>
          {label}
          <Text variant="caption" tone="secondary">
            {`  ${value ?? ""}`}
          </Text>
        </Text>
      ) : (
        <Text variant="caption" tone="secondary">
          {hint}
        </Text>
      )}
    </View>
  );
}

interface Reading {
  readonly label: string;
  readonly value: string;
}

function useReadings(rows: readonly MapRow[], paint: MapViewProps["paint"]): ReadonlyMap<string, Reading> {
  return useMemo(() => new Map<string, Reading>([...(paint ?? []), ...rows].map((entry) => [entry.regionKey, { label: entry.label, value: entry.value }])), [rows, paint]);
}

function MapHead({ title, note, aside, mode, onMode }: Pick<MapViewProps, "title" | "note" | "aside"> & { readonly mode: ViewMode; readonly onMode: (mode: ViewMode) => void }) {
  return (
    <Row gap="md" between wrap top>
      <Column gap="xs" flexShrink={1} minWidth={200}>
        <Text variant="title" role="heading" aria-level={2}>
          {title}
        </Text>
        {note ? (
          <Text variant="body" tone="secondary">
            {note}
          </Text>
        ) : null}
      </Column>
      <Row gap="md" wrap top flexShrink={1} maxWidth="100%">
        {aside}
        <Segmented label="Show as" options={VIEW_OPTIONS} value={mode} onChange={onMode} />
      </Row>
    </Row>
  );
}

/** The keyboard's place on the map, and the zoom and framing the controls and keys ask for. */
function useMapKeys(order: readonly string[], onSelect: (regionKey: string, additive?: boolean) => void) {
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const [reframe, setReframe] = useState(0);
  const [zoom, setZoom] = useState<{ step: number; by: number }>({ step: 0, by: 1 });
  const zoomBy = (by: 1 | -1) => setZoom((was) => ({ step: was.step + 1, by }));
  const onKeyDown = (event: KeyEvent) => {
    const action = mapKeyAction(event.key, order, focused);
    if (!action) return;
    event.preventDefault();
    if (action.kind === "focus") setFocused(action.regionKey);
    else if (action.kind === "open") onSelect(action.regionKey, event.shiftKey === true);
    else if (action.kind === "zoom") zoomBy(action.by);
    else if (action.kind === "reframe") setReframe((was) => was + 1);
    else setFocused(undefined);
  };
  return { focused, setFocused, reframe, setReframe, zoom, zoomBy, onKeyDown };
}

export type MapFrameProps = Pick<MapViewProps, "title" | "rows" | "paint" | "legend" | "camera" | "selected" | "chosen" | "onSelect" | "relief" | "regions" | "error" | "pins"> & {
  readonly rowNoun?: string;
  readonly height: number;
  /** The shortest the frame may draw; a stage that must stay large on a phone raises it. */
  readonly minHeight?: number;
  /** Told once when the drawing cannot run here, so the screen can lead with its list. */
  readonly onFail?: (reason: string) => void;
  /** What the readout says before anything is pointed at, when picking does something other than open. */
  readonly hint?: string;
};

/**
 * The drawn map in its dark frame: the canvas, the zoom controls, the readout,
 * and the keyboard's walk through the rows. A screen that lays out its own
 * heading and key around the map (a stage) uses this directly.
 */
export function MapFrame({ title, rows, paint, legend, camera, selected, chosen, onSelect, rowNoun = "region", height, minHeight = MIN_HEIGHT, relief, regions, error, pins, onFail, hint: told }: MapFrameProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const fail = (reason: string) => {
    setFailed(reason);
    onFail?.(reason);
  };
  const fills = useMemo(() => fillsOf(rows, paint), [rows, paint]);
  const readings = useReadings(rows, paint);
  const order = useMemo(() => rows.map((row) => row.regionKey), [rows]);
  const { focused, setFocused, reframe, setReframe, zoom, zoomBy, onKeyDown } = useMapKeys(order, onSelect);
  const shown = readings.get(hovered ?? focused ?? selected ?? "");
  const outlined = focused ?? hovered ?? undefined;
  // The frame hugs the geography it shows, up to the screen's height for it, so a phone does not frame a narrow country in a tall box of sea.
  const drawn = frameWidth === null ? height : Math.min(height, Math.max(minHeight, Math.round((frameWidth / boundsAspect(camera)) * 1.06)));
  const problem = failed ?? error;
  const hint = told ?? (rows.length > 0 ? `${rows.length} ${rows.length === 1 ? rowNoun : `${rowNoun}s`} on the map. Pick one to open it.` : "There's nothing on this map yet.");
  return (
    <Theme name="dark">
      <View
        position="relative"
        height={drawn}
        borderRadius="card"
        overflow="hidden"
        backgroundColor={MAP_COLORS.sea as never}
        borderWidth={1}
        borderColor="borderColor"
        tabIndex={0}
        role="group"
        aria-roledescription="map"
        aria-label={`${title}. ${legend.title}. Use the arrow keys to move from one ${rowNoun} to the next, highest first. Press Enter to open one, and plus or minus to zoom.`}
        outlineColor="outlineColor"
        outlineStyle="solid"
        outlineWidth={{ default: 0, "focus-visible": 2 }}
        onKeyDown={onKeyDown}
        onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
        onBlur={() => setFocused(undefined)}
      >
        {frameWidth === null || failed ? null : <MapCanvas title={title} regions={regions} fills={fills} camera={camera} onSelect={onSelect} onHover={setHovered} reframe={reframe} zoom={zoom} onFail={fail} {...(pins ? { pins } : {})} {...(chosen ? { chosen } : {})} {...(selected ? { selected } : {})} {...(outlined ? { focused: outlined } : {})} {...(relief === undefined ? {} : { relief })} />}
        {failed ? null : <MapControls onZoom={zoomBy} onReframe={() => setReframe((was) => was + 1)} />}
        {problem ? <MapReadout label="The map didn't load." value={`${problem} The list shows the same numbers.`} hint="" /> : <MapReadout hint={regions ? hint : "Loading the map."} {...(shown ? shown : {})} />}
      </View>
    </Theme>
  );
}

/**
 * The one map of the game, drawn inside the page: a framed panel with its key,
 * the same rows as a ranked list on demand, and every region a door. The web
 * draws with MapLibre GL and a phone with MapLibre Native, behind this one
 * interface. One per screen.
 */
export function MapView({ title, note, aside, rows, legend, selected, onSelect, rowNoun = "region", height = 420, testID, ...frame }: MapViewProps) {
  const media = useMedia();
  const [mode, setMode] = useState<ViewMode>("map");
  // A device that cannot draw the map gets the same rows as a list, never an empty frame.
  const onFail = () => setMode("list");
  return (
    <Surface level="base" pad={media.phone ? "md" : "lg"} role="region" aria-label={title} testID={testID}>
      <Column gap="md">
        <MapHead title={title} note={note} aside={aside} mode={mode} onMode={setMode} />
        {mode === "map" ? (
          <MapFrame title={title} rows={rows} legend={legend} onSelect={onSelect} rowNoun={rowNoun} height={height} onFail={onFail} {...frame} {...(selected ? { selected } : {})} />
        ) : (
          <MapList rows={rows} title={legend.title} rowNoun={rowNoun} onSelect={onSelect} {...(selected ? { selected } : {})} />
        )}
        <MapKey legend={legend} />
      </Column>
    </Surface>
  );
}
