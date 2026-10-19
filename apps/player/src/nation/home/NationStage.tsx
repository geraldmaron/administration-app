import { lazy, useEffect, useState, type ReactNode } from "react";
import type { Campaign, ConditionKind } from "@admin/engine";
import type { NationOverview } from "@admin/player-core";
import { Column, Icon, Pressable, Row, Stage, Sticky, Text, Theme, Toggle, View, useMedia, useThemeName } from "@admin/ui";
import type { MapPin } from "@admin/ui/map";
import { MapSlot } from "../../map/MapSlot";
import { SelectionPanel } from "./SelectionPanel";
import { STAGE_LENSES, STAGE_LENS_ABOUT, STAGE_LENS_ICONS, STAGE_LENS_NAMES, type StageLensId } from "./stage-lens";
import type { StateTableRow } from "./states-table";
import type { StateFocus } from "./search";

const StageMap = lazy(() => import("./StageMap"));

/** The stage puts the panel beside the map once the band is this wide; narrower, the panel follows under the map. */
const SIDE_BY_SIDE = 760;
const PANEL_WIDTH = 360;
const FAILED = "The map can't be drawn on this device. Every state is in the list below, with the same numbers.";

function LensSwitch({ lens, onLens }: { readonly lens: StageLensId; readonly onLens: (lens: StageLensId) => void }) {
  return (
    <Row gap="xs" wrap role="radiogroup" aria-label="Color the map by">
      {STAGE_LENSES.map((id) => {
        const on = id === lens;
        return (
          <Pressable key={id} role="radio" aria-checked={on} onPress={() => onLens(id)} flexDirection="row" alignItems="center" gap="xs" minHeight={36} paddingHorizontal="md" borderRadius="pill" borderWidth={1} borderColor={on ? "goldRule" : "borderColor"} backgroundColor={on ? { default: "goldFill", hover: "goldFill" } : { default: "surface", hover: "surfaceHover", press: "backgroundPress" }}>
            <Icon name={STAGE_LENS_ICONS[id]} size={16} tone={on ? "goldInk" : "colorSecondary"} weight={on ? "fill" : "duotone"} />
            <Text variant="label" tone={on ? "goldInk" : "primary"}>
              {STAGE_LENS_NAMES[id]}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

const PANEL_ID = "nation-panel-scroll";
const ON_WEB = typeof document !== "undefined";

/** Whether the docked panel has more below its fold, re-read as it scrolls and as its content changes. */
function useMoreBelow(enabled: boolean): boolean {
  const [more, setMore] = useState(false);
  useEffect(() => {
    const node = enabled && ON_WEB ? document.getElementById(PANEL_ID) : null;
    if (!node) return;
    const read = () => setMore(node.scrollTop + node.clientHeight < node.scrollHeight - 4);
    const watcher = new ResizeObserver(read);
    watcher.observe(node);
    if (node.firstElementChild) watcher.observe(node.firstElementChild);
    node.addEventListener("scroll", read, { passive: true });
    read();
    return () => {
      watcher.disconnect();
      node.removeEventListener("scroll", read);
    };
  }, [enabled]);
  return more;
}

/** The docked panel scrolls inside its own height, with a line under it while more is below, so a long act list never runs off the screen. */
function DockedPanel({ children }: { readonly children: ReactNode }) {
  const more = useMoreBelow(true);
  return (
    <Column gap="xs">
      <View id={PANEL_ID} borderRadius="card" {...(ON_WEB ? { style: { maxHeight: "calc(100vh - 200px)", overflowY: "auto", overscrollBehavior: "contain" } } : {})}>
        {children}
      </View>
      {more ? (
        <Row gap="xs" justifyContent="center" aria-hidden>
          <Icon name="chevron" size={12} tone="gold" />
          <Text variant="caption" tone="secondary">
            More below. Scroll the panel.
          </Text>
        </Row>
      ) : null}
    </Column>
  );
}

export type NationStageProps = {
  readonly campaign: Campaign;
  readonly overview: NationOverview;
  readonly rows: readonly StateTableRow[];
  readonly lens: StageLensId;
  readonly onLens: (lens: StageLensId) => void;
  /** Every chosen state, the one in focus last. */
  readonly chosen: readonly string[];
  readonly cause?: ConditionKind;
  readonly onChoose: (state: string, additive: boolean) => void;
  readonly onMany: (ids: readonly string[]) => void;
  readonly onCause: (cause: ConditionKind) => void;
  readonly onClear: () => void;
  readonly onFocus: (focus: StateFocus) => void;
  readonly marks: ReadonlyMap<string, MapPin["kind"]>;
};

/**
 * The country as a place: the map fills the band and the chosen state's
 * panel docks beside it (under it on a narrow screen). Choosing a state on the
 * map, in the list or in Needs your attention all land here.
 */
export function NationStage({ campaign, overview, rows, lens, onLens, chosen, cause, onChoose, onMany, onCause, onClear, onFocus, marks }: NationStageProps) {
  const [several, setSeveral] = useState(false);
  const media = useMedia();
  const page = useThemeName();
  const [width, setWidth] = useState(0);
  const beside = width >= SIDE_BY_SIDE;
  const height = media.phone ? 340 : beside ? 560 : 480;
  const minHeight = media.phone ? 300 : 440;
  const map = (
    <MapSlot height={minHeight} failed={FAILED}>
      {(onFail) => <StageMap campaign={campaign} lens={lens} chosen={chosen} several={several} onSelect={onChoose} marks={marks} height={height} minHeight={minHeight} onFail={onFail} />}
    </MapSlot>
  );
  // The panel keeps the page's own theme, so its acts and their review read like the rest of the page while the band stays dark.
  const panel = (
    <Theme name={page as never}>
      <SelectionPanel campaign={campaign} overview={overview} rows={rows} chosen={chosen} {...(cause ? { cause } : {})} onCause={onCause} onToggle={(id) => onChoose(id, true)} onMany={onMany} onClear={onClear} onFocus={onFocus} />
    </Theme>
  );
  return (
    <Stage id="nation-map" icon="mapPin" title="The states on the map" helper={STAGE_LENS_ABOUT[lens]} actions={<LensSwitch lens={lens} onLens={onLens} />}>
      <Row gap="sm" wrap>
        <Toggle label="Select several states" value={several} onChange={setSeveral} />
        <Text variant="caption" tone="secondary">
          {chosen.length > 1 ? `${chosen.length} states selected` : media.phone ? "Then tap each state you want" : "Or hold Shift as you pick"}
        </Text>
      </Row>
      <View flexDirection={beside ? "row" : "column"} alignItems="flex-start" gap="lg" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <Column flex={beside ? 1 : undefined} alignSelf="stretch" minWidth={0} width={beside ? undefined : "100%"}>
          {map}
        </Column>
        {beside ? (
          <Sticky width={PANEL_WIDTH} top={72}>
            <DockedPanel>{panel}</DockedPanel>
          </Sticky>
        ) : (
          <View alignSelf="stretch">{panel}</View>
        )}
      </View>
    </Stage>
  );
}
