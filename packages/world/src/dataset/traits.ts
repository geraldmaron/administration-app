import type { Nation, Agenda, NationArchetype } from "../schemas/nation.js";
import { NationTraitProfile, TRAIT_KEYS, type TraitKey, type TraitRanges } from "../schemas/traits.js";
import { worldNations } from "./nations.js";
import { applyBands } from "./bands.js";
import { applyPartySystems } from "./party-systems.js";
import { applyMemberships } from "./orgs-cradles.js";

// Personality ranges are derived from each nation's authored trait midpoint
// rather than hand-written a second time: the midpoints already encode the
// research, and duplicating them as 51 hand-typed ranges would guarantee the
// two drift apart. What *is* authored here is how much a nation can vary
// (below) and what it might be trying to do (the agenda pools).

// How far a nation's personality can swing between campaigns. A settled state
// with durable institutions behaves much the same whoever is in charge; a
// collapsing one is largely defined by who happens to hold the capital, so its
// window is nearly three times wider.
const STABILITY_HALF_WIDTH: Record<Nation["bands"]["stabilityBand"], number> = {
  stable: 0.06,
  fragile: 0.1,
  volatile: 0.14,
  collapsing: 0.17,
};

// Archetype nudges on top of the stability window. Great powers are constrained
// by the sheer inertia of their commitments; post-conflict and client states
// swing hardest because their behavior tracks a patron or a fresh settlement.
const ARCHETYPE_WIDTH_MULTIPLIER: Record<NationArchetype, number> = {
  "great-power": 0.8,
  "regional-power": 0.9,
  "middle-power": 1,
  "resource-exporter": 1.1,
  "trading-hub": 0.85,
  "post-conflict": 1.3,
  isolationist: 0.9,
  "client-state": 1.25,
  "rising-power": 1.15,
  microstate: 1,
};

// Institutional character (how far a nation's word can be trusted, how much it
// shows of itself) is a property of the state rather than of the government of
// the day, so it moves less between campaigns than mood-like traits do.
const INSTITUTIONAL_TRAITS: ReadonlySet<TraitKey> = new Set<TraitKey>(["reliability", "transparency", "legalism"]);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;

function rangesFor(nation: Nation): TraitRanges {
  const base = STABILITY_HALF_WIDTH[nation.bands.stabilityBand] * ARCHETYPE_WIDTH_MULTIPLIER[nation.bands.archetype];
  const entries = TRAIT_KEYS.map((key) => {
    const halfWidth = INSTITUTIONAL_TRAITS.has(key) ? base * 0.7 : base;
    const midpoint = nation.traits[key];
    return [key, { min: round3(clamp01(midpoint - halfWidth)), max: round3(clamp01(midpoint + halfWidth)) }] as const;
  });
  return Object.fromEntries(entries) as TraitRanges;
}

// Agendas a nation of this shape could plausibly be pursuing in any given
// campaign, added to whatever that nation already has authored. Weights are
// deliberately below the authored agendas' so a nation's signature aim usually
// still leads, and the pool agenda reads as the second thing on its mind.
const ARCHETYPE_AGENDAS: Record<NationArchetype, readonly Agenda[]> = {
  "great-power": [
    { id: "shape-the-order", description: "Write the rules of the international order rather than live under them", weight: 0.55 },
    { id: "deny-peer-basing", description: "Deny a peer competitor permanent basing near its own approaches", weight: 0.45 },
    { id: "technology-lead", description: "Hold a generational lead in strategically decisive technology", weight: 0.5 },
  ],
  "regional-power": [
    { id: "neighborhood-order", description: "Be the state its neighbors call first when the region wobbles", weight: 0.5 },
    { id: "resist-external-arbitration", description: "Keep outside powers out of regional disputes", weight: 0.45 },
    { id: "seat-at-the-table", description: "Convert regional weight into standing in global forums", weight: 0.45 },
  ],
  "middle-power": [
    { id: "rules-based-hedging", description: "Bind larger powers into rules it can survive being enforced against", weight: 0.5 },
    { id: "niche-influence", description: "Buy influence through specialization rather than mass", weight: 0.45 },
    { id: "coalition-broker", description: "Broker coalitions no single great power can convene", weight: 0.4 },
  ],
  "resource-exporter": [
    { id: "price-defense", description: "Defend the price of the commodity the budget is built on", weight: 0.55 },
    { id: "revenue-diversification", description: "Buy a post-commodity economy while the revenue lasts", weight: 0.45 },
    { id: "buyer-diversification", description: "Avoid depending on any single buyer for export revenue", weight: 0.45 },
  ],
  "trading-hub": [
    { id: "keep-lanes-open", description: "Keep trade lanes and financial channels open through any dispute", weight: 0.6 },
    { id: "neutral-broker", description: "Stay useful to every bloc by committing to none", weight: 0.5 },
    { id: "regulatory-arbitrage", description: "Stay the easiest jurisdiction in the region to do business in", weight: 0.4 },
  ],
  "post-conflict": [
    { id: "consolidate-monopoly-of-force", description: "Finish establishing a single armed authority inside its borders", weight: 0.65 },
    { id: "reconstruction-finance", description: "Secure reconstruction finance without surrendering policy control", weight: 0.5 },
    { id: "settlement-survival", description: "Keep the settlement that ended the fighting from unravelling", weight: 0.55 },
  ],
  isolationist: [
    { id: "regime-survival", description: "Outlast external pressure without opening up", weight: 0.65 },
    { id: "sanctions-workaround", description: "Build durable routes around the sanctions regime", weight: 0.5 },
    { id: "deterrence-by-cost", description: "Make any intervention visibly too expensive to attempt", weight: 0.55 },
  ],
  "client-state": [
    { id: "patron-management", description: "Extract more from its patron than it concedes in return", weight: 0.55 },
    { id: "hedge-a-second-patron", description: "Quietly cultivate an alternative patron as insurance", weight: 0.4 },
    { id: "sovereignty-optics", description: "Look independent at home while depending on support abroad", weight: 0.45 },
  ],
  "rising-power": [
    { id: "growth-above-all", description: "Subordinate foreign policy to sustained economic growth", weight: 0.6 },
    { id: "status-recognition", description: "Be treated as a power of the tier it believes it has reached", weight: 0.5 },
    { id: "strategic-autonomy", description: "Refuse to be enrolled in anyone else's bloc", weight: 0.5 },
  ],
  microstate: [
    { id: "survival-by-usefulness", description: "Stay too useful to larger neighbors to be worth absorbing", weight: 0.55 },
    { id: "legal-shelter", description: "Shelter behind international law and multilateral membership", weight: 0.5 },
    { id: "single-sector-defense", description: "Protect the one sector the whole economy rests on", weight: 0.45 },
  ],
};

function candidateAgendasFor(nation: Nation): Agenda[] {
  const seen = new Set(nation.traits.agendas.map((a) => a.id));
  const pool = ARCHETYPE_AGENDAS[nation.bands.archetype].filter((a) => !seen.has(a.id));
  return [...nation.traits.agendas, ...pool];
}

export function traitProfileFor(nation: Nation): NationTraitProfile {
  return NationTraitProfile.parse({
    nation: nation.id,
    ranges: rangesFor(nation),
    candidateAgendas: candidateAgendasFor(nation),
    // Two aims per campaign: one is a caricature, three makes every nation
    // look like it wants the same set of things.
    agendaCount: 2,
  });
}

// Profiles key off archetype and stability band, so they have to be built from
// the assembled nations rather than the authored records — the bands do not
// exist until derivation has run.
export const nationTraitProfiles: NationTraitProfile[] = applyBands(
  applyPartySystems(applyMemberships([...worldNations])),
).map(traitProfileFor);

export const traitProfileByNation: ReadonlyMap<string, NationTraitProfile> = new Map(
  nationTraitProfiles.map((p) => [p.nation, p]),
);
