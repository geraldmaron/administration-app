import type { NationId } from "@admin/world";
import type { RngStream } from "./rng.js";
import type { Effect } from "./effects.js";
import type { RelationshipScalars } from "./effects.js";
import { hasFlag, selectNation, selectRelationship, type Campaign, type FlagId } from "./state.js";
import type { DeltaMetricKey, MetricDeltas } from "./effect-types.js";
import { createGrudge } from "./relationships.js";
import { markedFlags } from "./marked-flags.js";
import type { InstrumentId, RungLevel } from "./instruments.js";
import { rungCatalogueName, wireLine, wireName, wireStake, type WireAct } from "./wire.js";
import { nationName, possessive } from "./naming.js";

// The authored aftermath layer. The resolver decides *what happened* — that
// arithmetic lives in resolution.ts and nowhere else. A consequence card only
// decides *how it is told* and how much further it bites, for an outcome that
// has already been drawn. It can never make an outcome more or less likely,
// because it is only consulted once the branch is known.
//
// The engine owns this type rather than the content package because the
// dependency direction is one-way: authored content compiles down to these
// plain records, the same way a conversation script does. Everything here is
// JSON-safe data — no functions — so a card can travel from a content pack, a
// remote manifest, or a save file without losing anything.

export type ConsequenceValence = "success" | "partial" | "failure";

// Rungs are authored against in three bands rather than five levels: the
// difference between a démarche and a summons is a matter of degree, but the
// difference between either of those and an invasion is a matter of kind.
export type RungBand = "low" | "mid" | "high";

export function rungBand(rung: RungLevel): RungBand {
  if (rung <= 2) return "low";
  return rung === 3 ? "mid" : "high";
}

export type ConsequenceParties = { readonly actor: string; readonly target: string };

// What the situation has to look like for a card to be allowed to speak.
// Every field is optional and every present field must match: a card with no
// conditions is the unconditioned floor that guarantees something is always
// available to say.
export type ConsequenceConditions = {
  readonly scenarioClass?: readonly string[];
  readonly tone?: readonly string[];
  readonly flagsSet?: readonly FlagId[];
  readonly flagsClear?: readonly FlagId[];
  readonly minTension?: number;
  readonly maxTrust?: number;
  // Whether the briefing this act came out of turned out to be wrong. A reveal
  // card is written to be told only when it was, so it is refused everywhere
  // else; `false` is how a card claims the opposite — the briefing held, and
  // the aftermath may say so. Absent means the card does not care either way,
  // which is every card that is not about the briefing at all.
  readonly intelFalse?: boolean;
};

// A deliberately closed vocabulary. Authored content can move metrics, move a
// relationship, plant a grudge, and put a line in the feed — the effects whose
// blast radius a reviewer can hold in their head. It cannot rewrite nation
// stats, seat or unseat a minister, kill a person, spawn an operator, or touch
// the removal arc: those change the shape of the campaign, and nothing that
// arrives as generated prose should be able to reach them.
export type ConsequenceRecipe =
  | {
      readonly kind: "metric";
      readonly deltas: MetricDeltas;
      // Scale the whole line by how coercive the act was, so one card reads
      // proportionately at rung 2 and at rung 5.
      readonly scaleBySeverity?: boolean;
    }
  | {
      readonly kind: "relationship";
      readonly direction: "actor-to-target" | "target-to-actor";
      readonly deltas: Partial<RelationshipScalars>;
    }
  | { readonly kind: "grudge"; readonly cause: string; readonly weight: number }
  | { readonly kind: "feed"; readonly headline: string };

export type ConsequenceCard = {
  readonly id: string;
  readonly instrument: InstrumentId;
  readonly rungBands: readonly RungBand[];
  readonly valence: ConsequenceValence;
  // Which named failure branch this card is written for. A card without one
  // fits any branch of its valence; a card with one is refused everywhere else.
  readonly riskAffinity?: readonly string[];
  readonly conditions?: ConsequenceConditions;
  readonly weight: number;
  readonly once?: boolean;
  // One to three lines, in the game's voice. Only {{actor}} and {{target}} are
  // substituted — a card cannot reach for any other fact about the world, so
  // it cannot narrate something the simulation did not do.
  readonly beats: readonly string[];
  readonly effects: readonly ConsequenceRecipe[];
  readonly sets?: readonly FlagId[];
  readonly remembered?: string;
};

// The authoring context a caller knows and the resolver does not: which kind
// of scene this action came out of, and in what register the player answered.
export type ConsequenceContext = {
  readonly scenarioClass?: string;
  readonly tone?: string;
  // Whether the falsifiable claim the briefing rested on has turned out to be
  // wrong. The engine does not decide this and cannot: which claim a scenario
  // made is authored, and the verdict is drawn from the campaign seed by the
  // layer that owns the scenario. The engine's only part is refusing to tell a
  // reveal card in a week the briefing was sound. Absent means the act did not
  // come out of a briefing that had anything to be wrong about, so a card
  // asking either way is refused — silence is not a claim of soundness.
  readonly intelFalse?: boolean;
};

export type ConsequenceSituation = {
  readonly actor: NationId;
  readonly target: NationId;
  readonly instrument: InstrumentId;
  readonly rung: RungLevel;
  readonly valence: ConsequenceValence;
  readonly riskId?: string;
  readonly context?: ConsequenceContext;
};

// Severity and visibility are the resolver's findings, handed down rather than
// re-derived here. `visible` in particular is not a card's to decide: it is
// whether anyone learned this happened at all, and a card that could set it
// would be able to expose a covert operation the odds never priced.
export type ConsequenceScene = {
  readonly severity: number;
  readonly visible: boolean;
  readonly parties: ConsequenceParties;
};

export type ConsequenceContribution = {
  readonly effects: readonly Effect[];
  readonly metricDeltas: MetricDeltas;
  readonly beats: readonly string[];
};

// A card's own record in the open flag set. It carries both jobs at once:
// whether a once-only card has already been spent, and whether this campaign
// has seen this aftermath before — which is exactly what a later scenario
// wants to gate on. Riding the existing flag record means no new campaign
// field and no save migration.
export function consequenceFlag(id: string): FlagId {
  return `consequence:${id}`;
}

// A country in an authored beat is written as a bare placeholder, and a bare
// string swap produces "as long as United States wanted it to hold" and
// "United States's service", sentences no desk would file. The name goes in
// with the article a sentence needs, the possessive is
// formed by the rule rather than by the literal apostrophe the template
// carried, and the capital is put back at every sentence boundary the
// substitution may have opened.
function substitute(text: string, token: string, name: string): string {
  const articled = nationName(name);
  return text
    .replaceAll(`{{${token}}}'s`, possessive(articled))
    .replaceAll(`{{${token}}}’s`, possessive(articled))
    .replaceAll(`{{${token}}}`, articled);
}

export function renderBeat(text: string, parties: ConsequenceParties): string {
  const rendered = substitute(substitute(text, "actor", parties.actor), "target", parties.target);
  return rendered.replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead: string, letter: string) => `${lead}${letter.toUpperCase()}`);
}

// --- Eligibility ---

function matchesList(allowed: readonly string[] | undefined, value: string | undefined): boolean {
  if (!allowed) return true;
  return value !== undefined && allowed.includes(value);
}

function matchesRelationship(campaign: Campaign, situation: ConsequenceSituation, conditions: ConsequenceConditions): boolean {
  if (conditions.minTension === undefined && conditions.maxTrust === undefined) return true;
  const relationship = selectRelationship(campaign, situation.actor, situation.target);
  if (!relationship) return false;
  if (conditions.minTension !== undefined && relationship.tension < conditions.minTension) return false;
  if (conditions.maxTrust !== undefined && relationship.trust > conditions.maxTrust) return false;
  return true;
}

function matchesConditions(campaign: Campaign, situation: ConsequenceSituation, card: ConsequenceCard): boolean {
  const conditions = card.conditions;
  if (!conditions) return true;
  if (!matchesList(conditions.scenarioClass, situation.context?.scenarioClass)) return false;
  if (!matchesList(conditions.tone, situation.context?.tone)) return false;
  if (conditions.intelFalse !== undefined && conditions.intelFalse !== situation.context?.intelFalse) return false;
  for (const flag of conditions.flagsSet ?? []) if (!hasFlag(campaign, flag)) return false;
  for (const flag of conditions.flagsClear ?? []) if (hasFlag(campaign, flag)) return false;
  return matchesRelationship(campaign, situation, conditions);
}

// A risk-specific card is refused on any branch but its own, and is refused
// outright on an outcome that had no failure branch at all.
function matchesRisk(card: ConsequenceCard, situation: ConsequenceSituation): boolean {
  if (!card.riskAffinity) return true;
  return situation.riskId !== undefined && card.riskAffinity.includes(situation.riskId);
}

export function eligibleConsequences(
  campaign: Campaign,
  pool: readonly ConsequenceCard[],
  situation: ConsequenceSituation,
): readonly ConsequenceCard[] {
  const band = rungBand(situation.rung);
  return pool.filter(
    (card) =>
      card.weight > 0 &&
      card.instrument === situation.instrument &&
      card.valence === situation.valence &&
      card.rungBands.includes(band) &&
      matchesRisk(card, situation) &&
      !(card.once === true && hasFlag(campaign, consequenceFlag(card.id))) &&
      matchesConditions(campaign, situation, card),
  );
}

// Weighted, seeded, and stable under replay. The stream is the caller's to
// name, which is how this draw is kept off every stream that already exists.
export function drawConsequence(
  campaign: Campaign,
  pool: readonly ConsequenceCard[],
  situation: ConsequenceSituation,
  stream: RngStream,
): ConsequenceCard | undefined {
  const eligible = eligibleConsequences(campaign, pool, situation);
  if (eligible.length === 0) return undefined;
  const total = eligible.reduce((sum, card) => sum + card.weight, 0);
  const roll = stream.next() * total;
  let cursor = 0;
  for (const card of eligible) {
    cursor += card.weight;
    if (roll < cursor) return card;
  }
  // Floating-point residue at the very top of the range: the last card owns it.
  return eligible[eligible.length - 1]!;
}

// --- Contribution ---

function relationshipEffect(
  campaign: Campaign,
  situation: ConsequenceSituation,
  direction: "actor-to-target" | "target-to-actor",
  deltas: Partial<RelationshipScalars>,
): Effect | undefined {
  const from = direction === "actor-to-target" ? situation.actor : situation.target;
  const to = direction === "actor-to-target" ? situation.target : situation.actor;
  if (!selectRelationship(campaign, from, to)) return undefined;
  return { kind: "relationship", from, to, deltas };
}

// The aggrieved party is the one who remembers, and only about something it
// knows happened — so a grudge from an operation nobody caught is dropped
// rather than quietly planted.
function grudgeEffect(
  campaign: Campaign,
  situation: ConsequenceSituation,
  scene: ConsequenceScene,
  cause: string,
  weight: number,
): Effect | undefined {
  if (!scene.visible) return undefined;
  if (!selectRelationship(campaign, situation.target, situation.actor)) return undefined;
  const vengefulness = selectNation(campaign, situation.target)?.traits.vengefulness ?? 0.5;
  return {
    kind: "relationship",
    from: situation.target,
    to: situation.actor,
    addGrudge: createGrudge(cause, Math.max(0, Math.min(1, weight)), campaign.turn, vengefulness),
  };
}

// The feed is what the player could plausibly have found out. An outcome
// nobody witnessed still reaches them, but as intelligence rather than press —
// the card names the line, never how widely it traveled.
function feedEffect(campaign: Campaign, situation: ConsequenceSituation, scene: ConsequenceScene, headline: string): Effect {
  return {
    kind: "feed",
    items: [
      {
        turn: campaign.turn,
        kind: "press",
        visibility: scene.visible ? "public" : "intelligence",
        headline: renderBeat(headline, scene.parties),
        actor: situation.actor,
        target: situation.target,
      },
    ],
  };
}

// The act the card is dressing, as the wire desk says it. The parties arrive
// here as bare display names, so the article a sentence needs is put back on
// before anything is composed out of them.
function wireActFor(campaign: Campaign, situation: ConsequenceSituation, scene: ConsequenceScene): WireAct {
  return {
    actor: wireName(scene.parties.actor),
    target: wireName(scene.parties.target),
    instrument: situation.instrument,
    rung: situation.rung,
    landed: situation.valence !== "failure",
    ...(situation.riskId !== undefined ? { riskId: situation.riskId } : {}),
    turn: campaign.turn,
  };
}

function firstSentence(text: string): string {
  const match = text.trim().match(/^[^.!?]+[.!?]?/);
  return (match?.[0] ?? text).trim();
}

/**
 * The dispatch an act gets when the card that spoke for it wrote no feed line.
 *
 * Most cards carry beats and no `feed` recipe, and the result was that a player
 * could commit an instrument, read a paragraph of aftermath in the Record, and
 * find nothing at all in the feed — two acts out of three ended in silence on
 * the surface that is supposed to report the world back. The headline is the
 * plain sentence for the act itself, so the feed always says who did what to
 * whom; the card's own first sentence rides along as the particular the piece
 * behind it opens on, because it is the better-written half and it is already
 * true of this outcome.
 */
function fallbackFeedEffect(
  campaign: Campaign,
  situation: ConsequenceSituation,
  scene: ConsequenceScene,
  card: ConsequenceCard,
): Effect {
  const act = wireActFor(campaign, situation, scene);
  const beat = card.beats[0];
  const particular = beat ? firstSentence(renderBeat(beat, scene.parties)) : undefined;
  const catalogueName = rungCatalogueName(situation.instrument, situation.rung);
  return {
    kind: "feed",
    items: [
      {
        turn: campaign.turn,
        // The President's own act files under its own kind, so the Desk can
        // read "your order" against the week's foreign traffic instead of
        // dressing the player's strike as somebody else's move.
        kind: situation.actor === campaign.founding.nation ? "player-action" : "npc-action",
        visibility: scene.visible ? "public" : "intelligence",
        headline: wireLine(act),
        actor: situation.actor,
        target: situation.target,
        facts: {
          stake: particular ?? wireStake(act),
          ...(catalogueName ? { instrument: catalogueName } : {}),
        },
      },
    ],
  };
}

function scaledDeltas(
  deltas: MetricDeltas,
  scale: number,
): MetricDeltas {
  const out: MetricDeltas = {};
  for (const [key, delta] of Object.entries(deltas) as [DeltaMetricKey, number][]) {
    out[key] = delta * scale;
  }
  return out;
}

function recipeEffects(
  campaign: Campaign,
  situation: ConsequenceSituation,
  scene: ConsequenceScene,
  card: ConsequenceCard,
): { readonly effects: readonly Effect[]; readonly metricDeltas: MetricDeltas } {
  const effects: Effect[] = [];
  const metricDeltas: MetricDeltas = {};
  for (const recipe of card.effects) {
    if (recipe.kind === "metric") {
      const deltas = recipe.scaleBySeverity ? scaledDeltas(recipe.deltas, scene.severity) : recipe.deltas;
      for (const [key, delta] of Object.entries(deltas) as [DeltaMetricKey, number][]) {
        metricDeltas[key] = (metricDeltas[key] ?? 0) + delta;
      }
      continue;
    }
    const effect =
      recipe.kind === "relationship"
        ? relationshipEffect(campaign, situation, recipe.direction, recipe.deltas)
        : recipe.kind === "grudge"
          ? grudgeEffect(campaign, situation, scene, recipe.cause, recipe.weight)
          : feedEffect(campaign, situation, scene, recipe.headline);
    if (effect) effects.push(effect);
  }
  return { effects, metricDeltas };
}

// What a drawn card actually does, alongside the branch that fired rather than
// instead of it: the outcome already happened, and this deepens it.
export function consequenceContribution(
  campaign: Campaign,
  card: ConsequenceCard,
  situation: ConsequenceSituation,
  scene: ConsequenceScene,
): ConsequenceContribution {
  const { effects, metricDeltas } = recipeEffects(campaign, situation, scene, card);
  const wroteFeedLine = card.effects.some((recipe) => recipe.kind === "feed");
  const stamped: Effect[] = [
    ...effects,
    ...(wroteFeedLine ? [] : [fallbackFeedEffect(campaign, situation, scene, card)]),
    // Turn-stamped, because a card's flag is a deed a later scenario is meant
    // to be able to wait on. An unmarked flag reads as old by construction to
    // `agedAtLeast`, so the first follow-up written against an aftermath card
    // would arrive the same week as the thing it follows, at full ripeness.
    { kind: "flag", set: markedFlags([consequenceFlag(card.id), ...(card.sets ?? [])], campaign.turn) },
  ];
  // The counterpart keeps the line, and only when it had reason to notice.
  if (card.remembered && scene.visible && selectRelationship(campaign, situation.target, situation.actor)) {
    stamped.push({
      kind: "relationship",
      from: situation.target,
      to: situation.actor,
      addHistory: { turn: campaign.turn, kind: "consequence", description: renderBeat(card.remembered, scene.parties) },
    });
  }
  return { effects: stamped, metricDeltas, beats: card.beats.map((beat) => renderBeat(beat, scene.parties)) };
}
