import {
  counselOnReply,
  likelihoodFromUnitInterval,
  metricImpact,
  type Campaign,
  type ConversationScript,
  type CounselStance,
  type MetricSet,
  type ProjectionImpact,
  type ReplyProjection,
} from "@admin/engine";
import type { PersonId } from "@admin/world";
import { fiscalPreview } from "../economy/fiscal-books";
import { replyBorrowing } from "../economy/act-prices";
import { METRIC_LABELS } from "../format/figures";
import { formatMoney } from "../format/money";
import { forceCostBasisWords } from "../act/force-cost-words";

/**
 * One cell of the decision comparison. Every option answers every row, so a
 * row a reply has nothing to say on reads "none", never a blank a player has
 * to interpret.
 */
export type ComparisonCell =
  | { readonly kind: "money"; readonly amount: number; readonly text: string }
  | { readonly kind: "impact"; readonly impact: ProjectionImpact; readonly favorable: boolean | undefined }
  | { readonly kind: "chance"; readonly chance: number; readonly text: string }
  | { readonly kind: "lines"; readonly lines: readonly string[] }
  | { readonly kind: "counsel"; readonly person: PersonId; readonly name: string; readonly stance: CounselStance }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "none"; readonly text: string };

/** What a row is about, so a surface can pick its glyph without matching on words. */
export type ComparisonTopic = "money" | "debt" | "effect" | "relationship" | "odds" | "timing" | "downside" | "reaction" | "counsel";

export type ComparisonRow = {
  readonly id: string;
  readonly topic: ComparisonTopic;
  readonly label: string;
  readonly cells: readonly ComparisonCell[];
};

export type ComparisonOption = {
  readonly id: string;
  readonly tone: string;
  readonly text: string;
  readonly available: boolean;
  /** Why the option is locked, in the engine's words. */
  readonly locked?: string;
};

export type DecisionComparison = {
  readonly options: readonly ComparisonOption[];
  readonly rows: readonly ComparisonRow[];
};

// The four player metrics a reply can move are all better higher. A nation
// stat or an institutional surface has no stance of its own, so it is drawn
// without one rather than guessed.
const BETTER_HIGHER: ReadonlySet<string> = new Set(["approval", "stability", "standing", "militaryReadiness"]);

const RELATIONSHIP_LABELS = { trust: "trust", tension: "tension", militaryThreat: "fear of military attack" } as const;
const RELATIONSHIP_BETTER_HIGHER: ReadonlySet<string> = new Set(["trust"]);

const LOCKED: ComparisonCell = { kind: "none", text: "Not available" };

function treasurySpent(reply: ReplyProjection): number {
  return reply.assessment?.spent.treasury ?? reply.cost.treasury ?? 0;
}

function moneyCell(amount: number): ComparisonCell {
  if (amount === 0) return { kind: "none", text: "Nothing up front" };
  return { kind: "money", amount, text: amount < 0 ? `${formatMoney(-amount)} spent` : `${formatMoney(amount)} coming in` };
}

/**
 * Every metric a reply moves, as the band the engine would draw it in: a
 * position's assessed bands as the room assessed them, and everything priced
 * exactly (an instrument's cost, a position's spent metrics) banded by the
 * engine's own edges, so the two kinds of reply compare on one scale.
 */
function replyEffects(campaign: Campaign, reply: ReplyProjection): ReadonlyMap<string, ProjectionImpact> {
  const effects = new Map<string, ProjectionImpact>();
  const treasury = campaign.player.metrics.treasury;
  const exact = reply.assessment ? reply.assessment.spent : reply.cost;
  for (const [domain, delta] of Object.entries(exact)) {
    if (domain === "treasury" || delta === undefined || delta === 0) continue;
    effects.set(domain, metricImpact(domain, delta, "next-turn", treasury, "modeled"));
  }
  for (const impact of reply.assessment?.assessed ?? []) effects.set(impact.domain, impact);
  return effects;
}

function effectRows(campaign: Campaign, replies: readonly ReplyProjection[]): ComparisonRow[] {
  const perReply = replies.map((reply) => replyEffects(campaign, reply));
  const domains = [...new Set(perReply.flatMap((effects) => [...effects.keys()]))];
  return domains.map((domain) => ({
    id: `effect:${domain}`,
    topic: "effect" as const,
    label: domain in METRIC_LABELS ? METRIC_LABELS[domain as keyof MetricSet] : domain,
    cells: replies.map((reply, i) => {
      if (!reply.available) return LOCKED;
      const impact = perReply[i]!.get(domain);
      if (!impact) return { kind: "none" as const, text: "No change expected" };
      const favorable = BETTER_HIGHER.has(domain) ? impact.direction === "up" : undefined;
      return { kind: "impact" as const, impact, favorable };
    }),
  }));
}

function relationshipRows(campaign: Campaign, replies: readonly ReplyProjection[], counterpartName: string): ComparisonRow[] {
  const deltas = replies.map((reply) => (reply.option.commitment.kind === "position" ? reply.option.commitment.relationship : undefined));
  const keys = [...new Set(deltas.flatMap((d) => Object.keys(d ?? {})))] as (keyof typeof RELATIONSHIP_LABELS)[];
  const treasury = campaign.player.metrics.treasury;
  return keys.map((key) => ({
    id: `relationship:${key}`,
    topic: "relationship" as const,
    label: `${counterpartName}'s ${RELATIONSHIP_LABELS[key]}`,
    cells: replies.map((reply, i) => {
      if (!reply.available) return LOCKED;
      const delta = deltas[i]?.[key];
      if (!delta) return { kind: "none" as const, text: "No change expected" };
      const impact = metricImpact(key, delta, "next-turn", treasury, "estimated");
      return { kind: "impact" as const, impact, favorable: RELATIONSHIP_BETTER_HIGHER.has(key) ? delta > 0 : delta < 0 };
    }),
  }));
}

function oddsCell(reply: ReplyProjection): ComparisonCell {
  if (reply.successChance !== undefined) {
    return { kind: "chance", chance: reply.successChance, text: likelihoodFromUnitInterval(reply.successChance) };
  }
  const confidence = reply.assessment ? `, with ${reply.assessment.confidence} confidence in the forecast` : "";
  return { kind: "text", text: `Certain, because you're only stating a position${confidence}` };
}

function timingCell(reply: ReplyProjection): ComparisonCell {
  if (reply.timing) return { kind: "text", text: reply.timing.days ? reply.timing.label : "Takes effect right away" };
  return { kind: "text", text: "Happens the moment you confirm" };
}

function downsideCell(reply: ReplyProjection): ComparisonCell {
  const lines = [
    ...(reply.conflict ? [`${reply.conflict.headline}: ${reply.conflict.summary}`] : []),
    ...reply.risks.map((risk) => risk.description),
    ...(reply.successExposureChance === undefined ? [] : [`Chance it comes out even if it works: ${likelihoodFromUnitInterval(reply.successExposureChance)}. Success doesn't keep it secret.`]),
    ...(reply.exposure ?? []).map((line) => line.description),
    ...(reply.civilianRisk ? [`Chance civilians are hurt: ${likelihoodFromUnitInterval(reply.civilianRisk.chance)}`] : []),
  ];
  return lines.length > 0 ? { kind: "lines", lines } : { kind: "none", text: "Nothing identified" };
}

function reactionCell(reply: ReplyProjection): ComparisonCell {
  const nations = new Set(reply.ripples.map((ripple) => ripple.nation)).size;
  const consulted = reply.consultation?.length ?? 0;
  if (nations === 0 && consulted === 0) return { kind: "none", text: "No other government expected to react" };
  const parts = [
    ...(nations > 0 ? [`${nations} ${nations === 1 ? "government" : "governments"} ${reply.rippleVisibility === "if-exposed" ? "react if it comes out" : "react"}`] : []),
    ...(consulted > 0 ? [`${consulted} must be consulted first`] : []),
  ];
  return { kind: "text", text: parts.join(", and ") };
}

function counselCell(campaign: Campaign, script: ConversationScript, reply: ReplyProjection): ComparisonCell {
  const counsel = counselOnReply(campaign, script, reply);
  if (!counsel) return { kind: "none", text: "No adviser weighs in" };
  if (counsel.kind === "vacant") return { kind: "none", text: "Nobody holds the adviser's job right now" };
  return { kind: "counsel", person: counsel.person, name: counsel.name, stance: counsel.stance };
}

function perReplyRow(id: string, topic: ComparisonTopic, label: string, replies: readonly ReplyProjection[], cell: (reply: ReplyProjection) => ComparisonCell): ComparisonRow {
  return { id, topic, label, cells: replies.map((reply) => (reply.available ? cell(reply) : LOCKED)) };
}

/**
 * Every reply to one decision on the same criteria, in the order a President
 * weighs them: what it costs, what it does, how sure it is, when it lands,
 * what can go wrong, who else moves, and which way the cabinet leans. Built
 * only from the projection the decision room commits against, so the
 * comparison cannot promise what the commit will not charge.
 */
export function decisionComparison(
  campaign: Campaign,
  script: ConversationScript,
  replies: readonly ReplyProjection[],
  counterpartName: string,
): DecisionComparison {
  const debts = replies.map((reply) => (reply.available ? fiscalPreview(campaign, {}, replyBorrowing(reply.option))?.cost.debt ?? 0 : 0));
  const rows: ComparisonRow[] = [
    perReplyRow("cost", "money", "Cost now", replies, (reply) => moneyCell(treasurySpent(reply))),
    ...(replies.some((reply) => reply.available && reply.costBasis)
      ? [perReplyRow("cost-basis", "money", "How the cost is figured", replies, (reply): ComparisonCell =>
          reply.costBasis ? { kind: "text", text: forceCostBasisWords(reply.costBasis) } : { kind: "none", text: "No forces sent" })]
      : []),
    ...(debts.some((debt) => debt !== 0)
      ? [perReplyRow("debt", "debt", "Added debt, first year", replies, (reply) => {
          const debt = debts[replies.indexOf(reply)]!;
          const estimated = replyBorrowing(reply.option).some((effect) => effect.kind === "choiceBorrowing" && effect.estimate);
          const broad = replyBorrowing(reply.option).some((effect) => effect.kind === "choiceBorrowing" && effect.estimate?.method === "band");
          return debt === 0 ? { kind: "none", text: "None expected" } : { kind: "money", amount: -debt, text: `${estimated ? "About " : ""}${debt > 0 ? "+" : "−"}${formatMoney(estimated ? Number(Math.abs(debt).toPrecision(2)) : Math.abs(debt))}${estimated ? broad ? " (rough estimate, the real cost may differ)" : " (estimate, the real cost may differ)" : ""}` };
        })]
      : []),
    ...effectRows(campaign, replies),
    ...relationshipRows(campaign, replies, counterpartName),
    perReplyRow("odds", "odds", "Chance it works", replies, (reply) => oddsCell(reply)),
    perReplyRow("timing", "timing", "When it takes effect", replies, (reply) => timingCell(reply)),
    perReplyRow("downside", "downside", "What could go wrong", replies, (reply) => downsideCell(reply)),
    perReplyRow("reaction", "reaction", "Who else reacts", replies, (reply) => reactionCell(reply)),
    perReplyRow("counsel", "counsel", "Your adviser", replies, (reply) => counselCell(campaign, script, reply)),
  ];
  const options = replies.map((reply) => ({
    id: reply.option.id,
    tone: reply.option.tone,
    text: reply.option.text,
    available: reply.available,
    ...(reply.available ? {} : { locked: reply.missingCapability ?? "Not available yet" }),
  }));
  return { options, rows };
}
