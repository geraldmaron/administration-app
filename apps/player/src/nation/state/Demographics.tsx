import type { CohortAxisId } from "@admin/world";
import type { DemographicAxis, DemographicCell } from "@admin/player-core";
import { CardGrid, Column, Icon, ReadingFrame, Row, Surface, Text, type IconName } from "@admin/ui";
import { Track } from "@admin/ui/nation";
import { gapText, percent } from "../format";
import { markEntry } from "../keys";
import { AXIS_ICON } from "../glyphs";

/** A gap this wide is called out; narrower ones are within the source's own rounding. */
const CALLOUT = 0.03;

const SECTIONS: readonly { readonly id: string; readonly title: string; readonly icon: IconName; readonly axes: readonly CohortAxisId[] }[] = [
  { id: "who", title: "Who lives here", icon: "subjectPerson", axes: ["age", "sex", "race", "nativity"] },
  { id: "living", title: "How they live", icon: "building", axes: ["class", "schooling", "place", "work"] },
  { id: "service", title: "Health and military service", icon: "departmentHealthHumanServices", axes: ["disability", "veteran"] },
];

/** Tenths where whole points would hide a real difference: states sit between about 47 and 53 percent women. */
function precise(axis: CohortAxisId, gap: number): boolean {
  return axis === "sex" || (Math.round(gap * 100) === 0 && Math.abs(gap) >= 0.0005);
}

const share = (value: number, tenths: boolean): string => (tenths ? `${(Math.round(value * 1000) / 10).toFixed(1)}%` : percent(value));

function versusUs(gap: number, tenths: boolean): string {
  const text = gapText(gap, tenths);
  return text === "level" ? "Same as U.S." : `${text} vs U.S.`;
}

function Cell({ cell, top, axis }: { readonly cell: DemographicCell; readonly top: number; readonly axis: CohortAxisId }) {
  const tenths = precise(axis, cell.gap);
  return (
    <Row gap="sm" role="listitem" aria-label={`${cell.name}: ${share(cell.state, tenths)} here, ${share(cell.nation, tenths)} in the U.S.`}>
      <Text variant="caption" width={130} numberOfLines={2}>
        {cell.name}
      </Text>
      <Track value={cell.state / top} tone="reading" slim marks={[{ at: cell.nation / top, label: `U.S. ${share(cell.nation, tenths)}`, strong: true }]} />
      <Column minWidth={92} alignItems="flex-end">
        <Text variant="caption" weight="strong">
          {share(cell.state, tenths)} <Text variant="caption" tone="tertiary">U.S. {share(cell.nation, tenths)}</Text>
        </Text>
        <Text variant="caption" tone={Math.abs(cell.gap) >= CALLOUT ? "info" : "tertiary"}>
          {versusUs(cell.gap, tenths)}
        </Text>
      </Column>
    </Row>
  );
}

function Axis({ axis }: { readonly axis: DemographicAxis }) {
  // One scale per axis, up to its largest share, so a small group is not a hairline beside a large one.
  const top = Math.max(...axis.cells.flatMap((cell) => [cell.state, cell.nation]), 0.01);
  const standout = axis.axis === "sex" ? undefined : [...axis.cells].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).find((cell) => Math.abs(cell.gap) >= CALLOUT);
  return (
    <Surface level="raised" pad="md" flexGrow={1}>
      <Column gap="xs">
        <Row gap="xs">
          <Icon name={AXIS_ICON[axis.axis]} size={16} tone="gold" />
          <Text variant="label">{axis.name}</Text>
        </Row>
        {standout ? (
          <Text variant="caption" tone="info">
            {standout.gap > 0 ? "Much more common here" : "Much less common here"}: <Text variant="caption" weight="strong">{standout.name}</Text>, {versusUs(standout.gap, false).replace("▲ ", "").replace("▼ ", "")}
          </Text>
        ) : null}
        <Column gap="2xs" role="list">
          {axis.cells.map((cell) => (
            <Cell key={cell.cohort} cell={cell} top={top} axis={axis.axis} />
          ))}
        </Column>
      </Column>
    </Surface>
  );
}

/**
 * A place's people on each of the ten axes against the country: the bar is
 * this place's share and the dark tick the U.S. share, one scale per axis,
 * both printed. Composition is a fact, not a judgment, so nothing is inked
 * good or bad.
 */
export function DemographicProfile({ name, axes }: { readonly name: string; readonly axes: readonly DemographicAxis[] | undefined }) {
  if (!axes) {
    return (
      <Text variant="body" tone="secondary">
        We don't have a population breakdown for {name}.
      </Text>
    );
  }
  const byId = new Map(axes.map((axis) => [axis.axis, axis] as const));
  return (
    <Column gap="md">
      <ReadingFrame title={`Who lives in ${name}, against the whole country`} unit="% of people in each group" legend={[{ id: "here", kind: "swatch", label: `Share of people in ${name}`, ink: "accent" }, markEntry("us", "Share for the whole U.S.")]} help={{ meaning: `Each bar is the share of people in ${name} who are in that group. The dark line is the share for the whole country, so a bar past the line means the group is more common here. Each box has its own scale.` }}>
      {SECTIONS.map((section) => (
        <Column key={section.id} gap="sm">
          <Row gap="xs">
            <Icon name={section.icon} size={18} tone="colorSecondary" />
            <Text variant="title" role="heading" aria-level={3}>
              {section.title}
            </Text>
          </Row>
          <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: section.axes.length % 3 === 1 ? 2 : 3 }}>
            {section.axes.flatMap((id) => {
              const axis = byId.get(id);
              return axis ? [<Axis key={id} axis={axis} />] : [];
            })}
          </CardGrid>
        </Column>
      ))}
      </ReadingFrame>
    </Column>
  );
}
