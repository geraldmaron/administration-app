import { lazy, type ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { Column, Icon, Row, Segmented, Surface, Text } from "@admin/ui";
import { MapSlot } from "../../map/MapSlot";

const StateMapCanvas = lazy(() => import("./StateMapCanvas"));

export type StateMapPanelProps = {
  readonly campaign: Campaign;
  readonly state: string;
  readonly title: string;
  readonly lens: string;
  readonly lenses: readonly { readonly id: string; readonly label: string }[];
  readonly onLens: (id: string) => void;
  readonly selected: string;
  /** The state's own reading on the lens, beside the map: the figure the map colors by, beside it. */
  readonly children: ReactNode;
};

/**
 * One state on the real map, framed on its own shape: a district lens
 * recolors the districts inside it, and a press on a district or a neighbor
 * opens that place. The map loads after the page; the reading under it never
 * waits for it and stays when the map cannot draw.
 */
export function StateMapPanel({ campaign, state, title, lens, lenses, onLens, selected, children }: StateMapPanelProps) {
  return (
    <Surface pad="lg" role="region" aria-label={title} testID={`map-slot:${lens}:state:${state}`}>
      <Column gap="md">
        <Row gap="sm">
          <Icon name="mapPin" size={22} tone="gold" weight="fill" />
          <Text variant="title" role="heading" aria-level={2} flex={1}>
            {title}
          </Text>
        </Row>
        <Segmented label="Color by" options={lenses.map((option) => ({ value: option.id, label: option.label }))} value={lens} onChange={onLens} />
        {/* A state is taller than wide, so its map takes a column of its own and the reading sits beside it instead of under a band of sea. */}
        <Row gap="lg" wrap top>
          <Column flexGrow={1} flexShrink={1} flexBasis={320} maxWidth={620} minWidth={0}>
            <MapSlot height={300} failed="The map can't be drawn on this device. The reading beside it has the same numbers.">
              {(onFail) => <StateMapCanvas campaign={campaign} state={state} lens={lens} title={title} selected={selected} onFail={onFail} />}
            </MapSlot>
          </Column>
          <Column flexGrow={1} flexShrink={1} flexBasis={300} minWidth={0} gap="md">
            {children}
          </Column>
        </Row>
      </Column>
    </Surface>
  );
}
