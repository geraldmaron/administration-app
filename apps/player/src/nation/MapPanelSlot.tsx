import type { ReactNode } from "react";
import { Column, Icon, Row, Segmented, Surface, Text } from "@admin/ui";

export type MapLensOption = { readonly id: string; readonly label: string };

export type MapPanelSlotProps = {
  readonly title: string;
  /** The reading the rows below are shaded by (a player-core lens id). */
  readonly lens: string;
  /** "us", "state:CA", "world", "nation:CHN", "set:nation:A|nation:B": the region the panel is about. */
  readonly camera: string;
  /** The region the panel is centered on. */
  readonly selection?: string;
  /** Force markers the rows carry. */
  readonly marks?: "forces";
  readonly note?: string;
  /** The readings the player can switch between; each changes which rows are shown. */
  readonly lenses?: readonly MapLensOption[];
  readonly onLens?: (id: string) => void;
  /** The rows for the region, built from the same data a map of it would read. */
  readonly children: ReactNode;
};

/**
 * A titled panel for a region's rows: the heading, the reading selector and a
 * note above the list. Callers pass the region and reading as props so the
 * panel stays the one frame for every region-scoped list.
 */
export function MapPanelSlot({ title, lens, camera, selection, marks, note, lenses, onLens, children }: MapPanelSlotProps) {
  return (
    <Surface pad="lg" role="region" aria-label={title} testID={`map-slot:${lens}:${camera}${selection ? `:${selection}` : ""}${marks ? `:${marks}` : ""}`}>
      <Column gap="md">
        <Row gap="sm">
          <Icon name="mapPin" size={22} tone="gold" weight="fill" />
          <Text variant="title" role="heading" aria-level={2} flex={1}>
            {title}
          </Text>
        </Row>
        {lenses && onLens ? <Segmented label="Color by" options={lenses.map((option) => ({ value: option.id, label: option.label }))} value={lens} onChange={onLens} /> : null}
        {note ? (
          <Text variant="label" weight="regular" tone="secondary" aria-live="polite">
            {note}
          </Text>
        ) : null}
        {children}
      </Column>
    </Surface>
  );
}
