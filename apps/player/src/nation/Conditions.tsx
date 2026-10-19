import { place, type ConditionReading, type EmergencyRow } from "@admin/player-core";
import { Column, EntityLink, Icon, ReadingFrame, Row, Surface, Text } from "@admin/ui";
import { Collection, Track } from "@admin/ui/nation";
import { CONDITION_GLYPH } from "./glyphs";
import { go } from "../shell/navigate";
import { toneKey } from "./keys";
import { VALENCE_TEXT, VALENCE_TRACK, valenceOf, weeks } from "./format";

/** Each condition running at home, worst first, drawn on its severity, with a door to the state it is in. */
export function ConditionList({ conditions, none }: { readonly conditions: readonly ConditionReading[]; readonly none: string }) {
  return (
    <ReadingFrame title="How serious each problem is" unit="% of the worst damage it could do" legend={toneKey({ reading: "Under 40%: minor", watch: "40% to 69%: serious", bad: "70% or more: severe" })} help={{ meaning: "How much damage a problem does, as a share of the worst it could do. The bar fills as it gets worse and changes color at 40% and 70%." }}>
    <Collection
      items={conditions}
      initial={8}
      noun="conditions"
      empty={none}
      render={(condition) => {
        const valence = valenceOf(condition.severity.stance);
        return (
          <Surface key={condition.id} level="raised" pad="md" role="listitem">
            <Column gap="xs">
              <Row gap="sm">
                <Icon name={CONDITION_GLYPH[condition.kind]} size={20} tone="warningInk" />
                {condition.state ? <EntityLink label={condition.headline} href={place.state(condition.state!)} onPress={() => go(place.state(condition.state!))} /> : <Text variant="label">{condition.headline}</Text>}
              </Row>
              <Text variant="caption" tone="secondary">
                {condition.standfirst}
              </Text>
              <Row gap="sm">
                <Track value={condition.severity.fraction} tone={VALENCE_TRACK[valence]} label={`${condition.headline}: ${condition.severity.label.toLowerCase()} ${condition.severity.value}`} />
                <Text variant="label" tone={VALENCE_TEXT[valence]} minWidth={56} textAlign="right">
                  {condition.severity.value}
                </Text>
              </Row>
              <Text variant="caption" tone="tertiary">
                {condition.severity.note}
              </Text>
            </Column>
          </Surface>
        );
      }}
    />
    </ReadingFrame>
  );
}

/** Declared emergencies in force, each with the weeks before it lapses unless renewed. */
export function EmergencyList({ emergencies }: { readonly emergencies: readonly EmergencyRow[] }) {
  if (emergencies.length === 0) return null;
  return (
    <Column gap="xs">
      {emergencies.map((emergency) => (
        <Surface key={emergency.id} level="raised" pad="md" accentEdge="gold">
          <Column gap="2xs">
            {emergency.href ? <EntityLink icon="order" label={emergency.title} href={emergency.href!} onPress={() => go(emergency.href!)} /> : <Text variant="label">{emergency.title}</Text>}
            <Text variant="caption" tone="secondary">
              Covers {emergency.reach}. Ends in {weeks(emergency.weeksLeft)} unless you renew it.
            </Text>
          </Column>
        </Surface>
      ))}
    </Column>
  );
}
