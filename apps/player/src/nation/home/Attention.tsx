import { router } from "expo-router";
import type { Campaign, ConditionKind } from "@admin/engine";
import { localeMatters, place, type NationOverview } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Column, Icon, Pressable, ReadingFrame, Text, View, useMedia, type IconName } from "@admin/ui";
import { Collection, Track } from "@admin/ui/nation";
import { CONDITION_GLYPH } from "../glyphs";
import { toneKey } from "../keys";
import { weeks, type Valence } from "../format";
import type { StateTableRow } from "./states-table";

type Item = {
  readonly key: string;
  readonly icon: IconName;
  readonly title: string;
  readonly detail: string;
  /** What the row does when pressed, said to a screen reader. */
  readonly does: string;
  readonly severity?: number;
  readonly valence: Valence;
  readonly tag: string;
  readonly onPress: () => void;
};

const severityValence = (severity: number | undefined): Valence => (severity === undefined ? "watch" : severity >= 0.6 ? "bad" : "watch");

/** Every state matter that waits on you, one row each; pressing one opens its acts in the state's panel on this page. */
function matterItems(campaign: Campaign, rows: readonly StateTableRow[], onAct: (state: string, cause: ConditionKind) => void): readonly Item[] {
  return rows
    .filter((row) => row.needs > 0)
    .flatMap((row) =>
      localeMatters(campaign, row.id as StateId).map((matter): Item => ({
        key: `${row.id}:${matter.cause}`,
        icon: CONDITION_GLYPH[matter.cause],
        title: `${matter.title} in ${row.name}`,
        detail: matter.request ? `${matter.request.reason} You have ${weeks(matter.request.weeksLeft)} to answer.` : `The state hasn't asked for help. Governor: ${row.relationship.toLowerCase()}.`,
        does: "Shows what you can do about it, above on this page",
        ...(matter.severity === undefined ? {} : { severity: matter.severity }),
        valence: severityValence(matter.severity),
        tag: matter.request ? "The state asked you" : "Running",
        onPress: () => onAct(row.id, matter.cause),
      })),
    );
}

function emergencyItems(overview: NationOverview): readonly Item[] {
  return overview.emergencies.map((emergency) => ({
    key: `emergency:${emergency.id}`,
    icon: "order" as const,
    title: emergency.title,
    detail: `Covers ${emergency.reach}. Ends in ${weeks(emergency.weeksLeft)} unless you renew it.`,
    does: "Opens Emergencies",
    valence: emergency.weeksLeft <= 2 ? ("bad" as const) : ("neutral" as const),
    tag: "Emergency declared",
    onPress: () => router.push((emergency.href ?? place.emergency()) as never),
  }));
}

/** Conditions no state matter already lists: national ones, and ones a state has not turned into a matter. */
function conditionItems(overview: NationOverview, listed: ReadonlySet<string>, onState: (state: string) => void): readonly Item[] {
  return overview.conditions
    .filter((condition) => !(condition.state && listed.has(`${condition.state}:${condition.kind}`)))
    .map((condition) => ({
      key: `condition:${condition.id}`,
      icon: CONDITION_GLYPH[condition.kind],
      title: condition.headline,
      detail: condition.standfirst,
      does: condition.state ? "Shows the state above on this page" : "Opens Emergencies",
      severity: condition.severity.fraction,
      valence: severityValence(condition.severity.fraction),
      tag: condition.state ? "Problem in a state" : "Problem across the country",
      onPress: () => (condition.state ? onState(condition.state) : router.push(place.emergency() as never)),
    }));
}

const TAG_TONE = { good: "success", watch: "warning", bad: "danger", neutral: "gold" } as const;

/** One row, the same anatomy for every kind: what it is and where, its severity drawn, and the whole row is the target. */
function AttentionRow({ item }: { readonly item: Item }) {
  const media = useMedia();
  const severity =
    item.severity === undefined ? null : (
      <Column width={media.phone ? "100%" : 120} gap="2xs">
        <Text variant="caption" tone="secondary" textAlign={media.phone ? "left" : "right"}>
          {`How bad ${Math.round(item.severity * 100)}%`}
        </Text>
        <Track value={item.severity} tone={item.valence === "bad" ? "bad" : "watch"} slim />
      </Column>
    );
  return (
    <Pressable role="button" aria-label={`${item.title}. ${item.detail} ${item.does}.`} onPress={item.onPress} flexDirection="row" alignItems="center" gap="md" padding="md" borderWidth={1} borderColor="borderColor" borderRadius="card" backgroundColor={{ default: "surfaceRaised", hover: "surfaceHover", press: "backgroundPress" }}>
      <View width={36} height={36} borderRadius="chip" backgroundColor={item.valence === "bad" ? "dangerFill" : item.valence === "neutral" ? "chromeBackground" : "warningFill"} alignItems="center" justifyContent="center" aria-hidden>
        <Icon name={item.icon} size={20} tone={item.valence === "bad" ? "dangerInk" : item.valence === "neutral" ? "gold" : "warningInk"} />
      </View>
      <Column flex={1} minWidth={0} gap="2xs">
        <Text variant="caption" weight="strong" tone={TAG_TONE[item.valence]}>
          {item.tag}
        </Text>
        <Text variant="label">{item.title}</Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {item.detail}
        </Text>
        {media.phone ? severity : null}
      </Column>
      {media.phone ? null : severity}
      <Icon name="chevron" size={16} tone="colorTertiary" />
    </Pressable>
  );
}

type AttentionProps = { readonly campaign: Campaign; readonly overview: NationOverview; readonly rows: readonly StateTableRow[]; readonly onAct: (state: string, cause?: ConditionKind) => void };

/** What waits on the President at home, in one list: state matters first, then declarations, then other problems. */
export function Attention({ campaign, overview, rows, onAct }: AttentionProps) {
  const matters = matterItems(campaign, rows, onAct);
  const listed = new Set(matters.map((item) => item.key));
  const items = [...matters, ...emergencyItems(overview), ...conditionItems(overview, listed, (state) => onAct(state))];
  return (
    <ReadingFrame title="Matters waiting on you" unit="How bad each is, % of the worst it could be" legend={toneKey({ bad: "Serious", watch: "Needs a look" })} pressHint="Press a row to act on it." help={{ meaning: "Each row is something at home that is waiting on you. The short bar is how bad it is, filled further for a worse problem." }}>
    <Collection
      items={items}
      initial={8}
      noun="matters"
      empty="Nothing at home needs you this week."
      render={(item) => (
        <View key={item.key} role="listitem">
          <AttentionRow item={item} />
        </View>
      )}
    />
    </ReadingFrame>
  );
}

/** How many matters wait, for the section's chip. */
export function attentionCount(rows: readonly StateTableRow[], overview: NationOverview): number {
  return rows.reduce((sum, row) => sum + row.needs, 0) + overview.emergencies.length;
}
