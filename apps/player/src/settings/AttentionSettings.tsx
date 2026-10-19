import type { AttentionSource } from "@admin/engine";
import { ATTENTION_SOURCES, LAST_CALL_DAYS, defaultAttentionSetting, logEligible, type AttentionSetting } from "@admin/player-core";
import { CardGrid, Column, Meter, ReadingFrame, Row, Text } from "@admin/ui";
import { Field, Select } from "@admin/ui/forms";
import { usePreferences } from "../device/hooks";
import { SettingsGroup } from "./parts";

/** What each source is, in the words a player sets a habit against rather than the engine's own name for it. */
const SOURCE_LABEL: Readonly<Record<AttentionSource, string>> = {
  "constitutional-deadline": "Dates set by the Constitution",
  "appropriations-deadline": "Government funding deadlines",
  "bill-signature": "Bills on your desk",
  nomination: "Nominations",
  "court-ruling": "Court rulings",
  "intelligence-warning": "Warnings from spy agencies",
  "military-escalation": "Growing military threats",
  "treaty-deadline": "Treaty deadlines",
  "agency-request": "Requests from federal agencies",
  "governor-request": "Governors' requests",
  "market-threshold": "Big market moves",
  "standing-threshold": "Swings in approval and press coverage",
  disaster: "Disasters at home",
  "diplomatic-request": "Requests from other countries",
  "consequence-return": "Results of earlier decisions",
  investigation: "Pressure to remove you from office",
  pledge: "Promises coming due",
  scandal: "Scandals",
  incident: "Incidents at home",
  "resignation-offer": "Offers to resign",
  "market-shock": "Market crashes and spikes",
  coup: "Governments overthrown abroad",
  scenario: "Decisions",
};

// "wait" stops the clock only when the item is LAST_CALL_DAYS from its own
// deadline; one with no deadline never stops.
const SETTING_LABEL: Readonly<Record<AttentionSetting, string>> = {
  pause: "Pause time right away",
  wait: `Pause ${LAST_CALL_DAYS} days before it's due`,
  log: "Never pause time",
};

const GROUPS: readonly { readonly title: string; readonly sources: readonly AttentionSource[] }[] = [
  { title: "Your choices and your team", sources: ["consequence-return", "pledge", "resignation-offer"] },
  { title: "Your duties in Washington", sources: ["constitutional-deadline", "appropriations-deadline", "bill-signature", "nomination", "court-ruling", "agency-request", "investigation"] },
  { title: "Other countries and safety", sources: ["intelligence-warning", "military-escalation", "treaty-deadline", "diplomatic-request", "coup"] },
  { title: "Life at home and public trust", sources: ["governor-request", "market-threshold", "standing-threshold", "disaster", "scandal", "incident", "market-shock"] },
];

function SourceRow({ source, value, onChange }: { readonly source: AttentionSource; readonly value: AttentionSetting; readonly onChange: (setting: AttentionSetting) => void }) {
  const settings: readonly AttentionSetting[] = logEligible(source) ? ["pause", "wait", "log"] : ["pause", "wait"];
  return (
    <Column flexGrow={1} minWidth={0}>
      <Field label={SOURCE_LABEL[source]}>
        {(control) => <Select {...control} label={SOURCE_LABEL[source]} options={settings.map((setting) => ({ value: setting, label: SETTING_LABEL[setting] }))} value={value} onChange={onChange} testID={`attention-${source}`} />}
      </Field>
    </Column>
  );
}

/** Which kinds of matter stop the world, and how; the tally is drawn from the rows themselves. */
export function AttentionSettings() {
  const { preferences, update } = usePreferences();
  const settings = preferences.attentionByKind;
  const ungrouped = ATTENTION_SOURCES.filter((source) => source !== "scenario" && !GROUPS.some((group) => group.sources.includes(source)));
  const groups = ungrouped.length > 0 ? [...GROUPS, { title: "Everything else", sources: ungrouped }] : GROUPS;
  const valueOf = (source: AttentionSource): AttentionSetting => (source === "scenario" ? "pause" : (settings?.[source] ?? defaultAttentionSetting(source)));
  const values = ATTENTION_SOURCES.map(valueOf);
  const count = (setting: AttentionSetting) => values.filter((value) => value === setting).length;
  return (
    <SettingsGroup icon="notificationStack" title="What pauses time" description="Time keeps moving in the game until something needs you. Choose which kinds of events pause it.">
      <ReadingFrame
        title="How your choices add up"
        unit="Kinds of event, out of all of them"
        legend={(["pause", "wait", "log"] as const).map((setting) => ({ id: setting, kind: "swatch" as const, label: SETTING_LABEL[setting], ink: "accent" as const, figure: count(setting) }))}
        help={{ meaning: "Each bar is how many kinds of event you have set to that choice, out of every kind there is. The three bars add up to all of them." }}
      >
        <CardGrid columns={{ phone: 1, tablet: 3, desktop: 3, wide: 3 }} gap="xl">
          {(["pause", "wait", "log"] as const).map((setting) => (
            <Column key={setting} flexGrow={1}>
              <Meter label={SETTING_LABEL[setting]} value={count(setting) / values.length} figure={`${count(setting)} of ${values.length} kinds`} />
            </Column>
          ))}
        </CardGrid>
      </ReadingFrame>
      <Text variant="caption" tone="secondary">
        Some things always pause time, whatever you pick here. A new decision always does. So does anything urgent, like a deadline set by law or a bill that becomes law if you don't act on it.
      </Text>
      {groups.map((group) => (
        <Column key={group.title} gap="sm" role="group" aria-label={group.title}>
          <Row gap="sm">
            <Text variant="label" weight="strong" role="heading" aria-level={3}>
              {group.title}
            </Text>
            <Text variant="caption" tone="tertiary">
              {group.sources.length} kinds
            </Text>
          </Row>
          <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 4 }} gap="lg">
            {group.sources.map((source) => (
              <SourceRow key={source} source={source} value={valueOf(source)} onChange={(setting) => update({ attentionByKind: { ...settings, [source]: setting } })} />
            ))}
          </CardGrid>
        </Column>
      ))}
    </SettingsGroup>
  );
}
