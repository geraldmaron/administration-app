import { TREATY_TERMS, metricImpact, projectEngagement, type Campaign, type EngagementKind, type MetricSet, type TreatyKind } from "@admin/engine";
import type { NationId } from "@admin/world";
import { engagementReading, warmthWord, type EngagementOption, type TreatyOption } from "../world/engagement";
import { treatyReading } from "./preview";

// The plan half of a meeting and a treaty: what each would do to the
// relationship, read off the engine's own projection of it. The instrument
// ladder, the tariff and the vote for force already have readers the plan
// prints whole (ActionTerms, the tariff incidence, the authorization bundle).

export type RelationshipReading = "trust" | "tension" | "alignment";

/** One reading of the relationship moving, in words: which, which way and how far. */
export type RelationshipStep = {
  readonly reading: RelationshipReading;
  readonly direction: "up" | "down";
  readonly size: string;
};

const READINGS: readonly RelationshipReading[] = ["trust", "tension", "alignment"];

function stepsOf(deltas: Partial<Record<RelationshipReading, number>>, size: (delta: number) => string): readonly RelationshipStep[] {
  return READINGS.flatMap((reading): RelationshipStep[] => {
    const delta = deltas[reading] ?? 0;
    return delta === 0 ? [] : [{ reading, direction: delta > 0 ? "up" : "down", size: size(delta) }];
  });
}

export type EngagementPlan = {
  readonly option: EngagementOption;
  /** What a yes does to the relationship, both ways. A no changes nothing but the record of it. */
  readonly steps: readonly RelationshipStep[];
};

export function engagementPlan(campaign: Campaign, nation: NationId, kind: EngagementKind): EngagementPlan | undefined {
  const option = engagementReading(campaign, nation)?.options.find((entry) => entry.kind === kind);
  const projection = projectEngagement(campaign, { actor: campaign.founding.nation, target: nation, kind });
  if (!option || !projection) return undefined;
  const first = projection.effects.find((effect) => effect.kind === "relationship");
  const deltas = first?.kind === "relationship" ? (first.deltas ?? {}) : {};
  return { option, steps: stepsOf(deltas, warmthWord) };
}

export type TreatyPlan = {
  readonly binds: "ratification" | "signature";
  readonly summary: string;
  /** Their side's reasons, where the services can read that government. */
  readonly counterpart?: TreatyOption;
  /** What the signature itself does to the President's readings. */
  readonly onSigning: Partial<Record<keyof MetricSet, number>>;
  /** Whether going around the Senate sours Congress on the President. */
  readonly congressCools: boolean;
  /** What the treaty does to the relationship once it is in force: on signature, or on ratification. */
  readonly inForce: readonly RelationshipStep[];
  readonly senate?: ReturnType<typeof treatyReading>["senate"];
};

const BAND_WORDS = { slight: "a little", moderate: "noticeably", major: "sharply" } as const;

/** How far a move of a relationship reading goes, in the bands the engine's projections use for any 0..1 reading. */
function bandWord(delta: number): string {
  return BAND_WORDS[metricImpact("relationship", delta, "next-turn", 0, "modeled").band];
}

export function treatyPlan(campaign: Campaign, nation: NationId, kind: TreatyKind): TreatyPlan | undefined {
  const { result, senate } = treatyReading(campaign, nation, kind);
  if (!result.ok) return undefined;
  const terms = TREATY_TERMS[kind];
  const metric = result.packet.effects.flatMap((effect) => (effect.kind === "metric" ? [effect.deltas] : []));
  const onSigning = metric.reduce<Partial<Record<keyof MetricSet, number>>>(
    (sum, deltas) => Object.fromEntries([...new Set([...Object.keys(sum), ...Object.keys(deltas)])].map((key) => [key, (sum[key as keyof MetricSet] ?? 0) + (deltas[key as keyof MetricSet] ?? 0)])),
    {},
  );
  const congress = result.packet.effects.find((effect) => effect.kind === "congress");
  const counterpart = engagementReading(campaign, nation)?.treaties.find((entry) => entry.kind === kind);
  return {
    binds: terms.bindsOn,
    summary: terms.summary,
    ...(counterpart ? { counterpart } : {}),
    onSigning,
    congressCools: congress?.kind === "congress" && congress.set.disposition < campaign.congress.disposition,
    inForce: stepsOf(terms.effect, bandWord),
    ...(senate ? { senate } : {}),
  };
}
