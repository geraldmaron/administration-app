import type { Campaign, ConditionKind } from "@admin/engine";
import { formatRatio, place, type NationOverview, type StateRow } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Button, Column, EntityLink, Icon, Pressable, ReadingFrame, Row, Surface, Text, type IconName } from "@admin/ui";
import type { StateId as StateKey } from "@admin/world";
import { TrackRow } from "@admin/ui/nation";
import { go } from "../../shell/navigate";
import { VALENCE_TEXT, type Valence } from "../format";
import { markEntry, toneKey } from "../keys";
import { BatchActs } from "./BatchActs";
import { StateActs } from "./StateActs";
import { focusCounts, type StateTableRow } from "./states-table";
import type { StateFocus } from "./search";

const PARTY_WORDS = { democrat: "Democrat", republican: "Republican", independent: "Independent" } as const;
const BAND_VALENCE: Readonly<Record<NonNullable<StateTableRow["relationshipBand"]>, Valence>> = { allied: "good", cooperative: "good", guarded: "watch", opposed: "bad" };

function Governor({ row }: { readonly row: StateTableRow }) {
  const valence = row.relationshipBand ? BAND_VALENCE[row.relationshipBand] : "neutral";
  return (
    <Column gap="2xs">
      <Row gap="xs" wrap>
        <Icon name="subjectPerson" size={16} tone="colorSecondary" />
        {row.governor && row.governorId ? <EntityLink label={`Governor ${row.governor}`} href={place.person(row.governorId!)} onPress={() => go(place.person(row.governorId!))} /> : <Text variant="label">{row.governor ? `Governor ${row.governor}` : "No governor"}</Text>}
        {row.party ? (
          <Text variant="caption" tone="secondary">
            {PARTY_WORDS[row.party]}
          </Text>
        ) : null}
      </Row>
      <Text variant="label" tone={VALENCE_TEXT[valence]}>
        {row.relationship === "No governor" ? "No governor to ask" : `Feels ${row.relationship.toLowerCase()} toward you`}
      </Text>
      {row.relationshipMeaning ? (
        <Text variant="caption" tone="secondary">
          {row.relationshipMeaning}
        </Text>
      ) : null}
    </Column>
  );
}

type StateCardProps = { readonly campaign: Campaign; readonly row: StateTableRow; readonly state: StateRow; readonly cause?: ConditionKind; readonly onCause: (cause: ConditionKind) => void; readonly onClear: () => void };

/** The chosen state, managed in place: who governs and how they feel about you, how the state sees you, and the acts you can take. */
function StateCard({ campaign, row, state, cause, onCause, onClear }: StateCardProps) {
  const approvalTone = state.approval >= 0.5 ? "good" : state.approval >= 0.4 ? "watch" : "bad";
  return (
    <Surface level="raised" pad="lg" role="region" aria-label={`${row.name}, selected`} accentEdge="gold" id="nation-selection">
      <Column gap="md">
        <Row gap="sm" top>
          <Column flex={1} gap="2xs">
            <Text variant="eyebrow" tone="gold">
              Selected state
            </Text>
            <Text variant="title" role="heading" aria-level={3}>
              {row.name}
            </Text>
          </Column>
          <Button kind="quiet" size="compact" icon="close" label={`Clear ${row.name}`} onPress={onClear}>
            Clear
          </Button>
        </Row>
        <Governor row={row} />
        <Column gap="xs">
          <ReadingFrame title="Approval here" unit="% of the state who approve" legend={[markEntry("half", "Half the state"), ...toneKey({ good: "Half or more approve", watch: "40% to 49%", bad: "Under 40%" })]} help={{ meaning: "The bar is the share of people in this state who approve of you. The line is half the state." }}>
          <TrackRow name="Approval here" figure={formatRatio(state.approval)} value={state.approval} tone={approvalTone} marks={[{ at: 0.5, label: "Half the state" }]} />
          </ReadingFrame>
          <Text variant="caption" tone="secondary">
            {`${state.callText}. ${state.leanText}. ${state.electoralVotes} electoral votes.`}
          </Text>
        </Column>
        <StateActs key={row.id} campaign={campaign} state={row.id as StateId} {...(cause ? { cause } : {})} onCause={onCause} />
        <EntityLink icon="mapPin" label={`Read more about ${row.name}`} href={row.href} onPress={() => go(row.href)} />
      </Column>
    </Surface>
  );
}

type CountRowProps = { readonly icon: IconName; readonly count: number; readonly words: string; readonly valence: Valence; readonly onPress: () => void };

function CountRow({ icon, count, words, valence, onPress }: CountRowProps) {
  return (
    <Pressable role="button" aria-label={`${count} ${words}. Show them in the list`} onPress={onPress} flexDirection="row" alignItems="center" gap="sm" padding="sm" borderRadius="control">
      <Icon name={icon} size={18} tone={valence === "bad" ? "danger" : valence === "watch" ? "warningInk" : "colorSecondary"} />
      <Text variant="heading" tabular tone={count > 0 ? VALENCE_TEXT[valence] : "secondary"} width={44}>
        {count}
      </Text>
      <Text variant="label" weight="regular" flex={1}>
        {words}
      </Text>
      <Icon name="chevron" size={14} tone="colorTertiary" />
    </Pressable>
  );
}

/** With nothing chosen, the same place shows the whole country: what waits on you, and how to choose a state. */
function NationCard({ rows, overview, onFocus, onMany }: { readonly rows: readonly StateTableRow[]; readonly overview: NationOverview; readonly onFocus: (focus: StateFocus) => void; readonly onMany: (ids: readonly string[]) => void }) {
  const counts = focusCounts(rows);
  const waiting = rows.filter((row) => row.needs > 0).map((row) => row.id);
  return (
    <Surface level="raised" pad="lg" role="region" aria-label="The whole country" id="nation-selection">
      <Column gap="md">
        <Column gap="2xs">
          <Text variant="eyebrow" tone="gold">
            The whole country
          </Text>
          <Text variant="title" role="heading" aria-level={3}>
            {`In the middle state, ${formatRatio(overview.median)} approve`}
          </Text>
        </Column>
        <Column role="list" aria-label="Where the states stand with you">
          <CountRow icon="caution" count={counts.needs} words={counts.needs === 1 ? "state is waiting for your answer" : "states are waiting for your answer"} valence="watch" onPress={() => onFocus("needs")} />
          <CountRow icon="subjectPerson" count={counts.against} words={counts.against === 1 ? "governor is wary of you or against you" : "governors are wary of you or against you"} valence="bad" onPress={() => onFocus("against")} />
          <CountRow icon="order" count={counts.declared} words={counts.declared === 1 ? "state has an emergency declared" : "states have an emergency declared"} valence="neutral" onPress={() => onFocus("declared")} />
        </Column>
        {waiting.length > 1 ? (
          <Button kind="primary" icon="mapPin" onPress={() => onMany(waiting)}>
            {`Select all ${waiting.length} that need you`}
          </Button>
        ) : null}
        <Text variant="label" weight="regular" tone="secondary">
          No state selected. A state selected on the map or in the list shows here with how it feels about you and what you can do there. Shift, or Select several, holds more than one.
        </Text>
      </Column>
    </Surface>
  );
}

/** Several states chosen together: who they are, each removable, and one act for all of them. */
function BatchCard({ campaign, rows, chosen, onToggle, onClear }: { readonly campaign: Campaign; readonly rows: readonly StateTableRow[]; readonly chosen: readonly string[]; readonly onToggle: (id: string) => void; readonly onClear: () => void }) {
  const named = chosen.map((id) => rows.find((row) => row.id === id)).filter((row): row is StateTableRow => row !== undefined);
  return (
    <Surface level="raised" pad="lg" role="region" aria-label={`${named.length} states selected`} accentEdge="gold" id="nation-selection">
      <Column gap="md">
        <Row gap="sm" top>
          <Column flex={1} gap="2xs">
            <Text variant="eyebrow" tone="gold">
              Selected states
            </Text>
            <Text variant="title" role="heading" aria-level={3}>
              {`${named.length} states`}
            </Text>
          </Column>
          <Button kind="quiet" size="compact" icon="close" label="Clear every selected state" onPress={onClear}>
            Clear
          </Button>
        </Row>
        <Row gap="xs" wrap role="list" aria-label="The selected states">
          {named.map((row) => (
            <Pressable key={row.id} role="button" aria-label={`Take ${row.name} out`} onPress={() => onToggle(row.id)} flexDirection="row" alignItems="center" gap="2xs" paddingVertical="2xs" paddingHorizontal="sm" borderRadius="pill" borderWidth={1} borderColor="borderColorStrong" backgroundColor={{ default: "surface", hover: "surfaceHover" }}>
              <Text variant="caption" weight="strong">
                {row.name}
              </Text>
              <Icon name="close" size={12} tone="colorSecondary" />
            </Pressable>
          ))}
        </Row>
        <BatchActs key={chosen.join(",")} campaign={campaign} states={named.map((row) => row.id as StateKey)} />
      </Column>
    </Surface>
  );
}

export type SelectionPanelProps = {
  readonly campaign: Campaign;
  readonly overview: NationOverview;
  readonly rows: readonly StateTableRow[];
  /** Every chosen state, in the order chosen; the last is the one in focus. */
  readonly chosen: readonly string[];
  readonly cause?: ConditionKind;
  readonly onCause: (cause: ConditionKind) => void;
  readonly onToggle: (id: string) => void;
  readonly onMany: (ids: readonly string[]) => void;
  readonly onClear: () => void;
  readonly onFocus: (focus: StateFocus) => void;
};

export function SelectionPanel({ campaign, overview, rows, chosen, cause, onCause, onToggle, onMany, onClear, onFocus }: SelectionPanelProps) {
  if (chosen.length > 1) return <BatchCard campaign={campaign} rows={rows} chosen={chosen} onToggle={onToggle} onClear={onClear} />;
  const selected = chosen[0];
  const row = selected ? rows.find((candidate) => candidate.id === selected) : undefined;
  const state = selected ? overview.rows.find((candidate) => candidate.id === selected) : undefined;
  if (!row || !state) return <NationCard rows={rows} overview={overview} onFocus={onFocus} onMany={onMany} />;
  return <StateCard campaign={campaign} row={row} state={state} {...(cause ? { cause } : {})} onCause={onCause} onClear={onClear} />;
}
