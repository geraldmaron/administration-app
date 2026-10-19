import {
  ENGAGEMENT_KINDS,
  TREATY_TERMS,
  counterpartPreview,
  envoyBenchLean,
  foreignLeaderFor,
  hasIntelOnNation,
  presidentRapport,
  projectEngagement,
  receivePreview,
  secretaryOfState,
  treatyForecast,
  type Campaign,
  type Effect,
  type EngagementKind,
  type TreatyKind,
  type WillingnessForecast,
} from "@admin/engine";
import type { NationId, PersonId, RoleId } from "@admin/world";
import { reasonLines } from "../reasons/reason-lines";
import { charterOf } from "../campaign/founding-options";
import { roleTitle } from "../format/figures";

// The President's call, envoy, visit, summit and joint declaration, read
// before any is made: whether the other government would take it, why, and
// how much it would do for the relationship. Beside them, whether the same
// government would sign each kind of treaty, and why. And the two people on
// the President's side of the table: the Secretary of State, whose skill sizes
// what a meeting does, and the President, whose rapport with the other leader
// counts where the services can read that leader. The country file renders
// all of it; the commit goes through the engine's `engagementPacket` and
// `signTreaty`, the same paths every government uses.

const KIND_LABELS: Readonly<Record<EngagementKind, string>> = {
  call: "A call",
  envoy: "An envoy",
  visit: "A state visit",
  summit: "A summit",
  declaration: "A joint declaration",
};

/** The size of the step a received engagement takes, in words: the figures are the engine's, not the player's. */
export type EngagementWarmth = "a small step" | "a real step" | "a large step";

export type EngagementOption = {
  readonly kind: EngagementKind;
  readonly label: string;
  readonly forecast: WillingnessForecast;
  readonly warmth: EngagementWarmth;
  /** Why the other side would or would not take it, only where the services can read that government. */
  readonly reasons: readonly string[];
};

export type TreatyOption = {
  readonly kind: TreatyKind;
  readonly name: string;
  readonly forecast: WillingnessForecast;
  /** The two readings that lead the forecast, heaviest first, only where the services can read that government. */
  readonly reasons: readonly string[];
};

/** Where the Secretary of State stands among the people who could hold the job, in a word. */
export type EnvoyHand = "skilled" | "capable" | "unsure" | "vacant";

export type EnvoyReading = {
  readonly hand: EnvoyHand;
  /** Whoever runs the State Department, confirmed or acting. */
  readonly person?: PersonId;
  /** One sentence a player reads: who it is and what their hand does to reception, warmth and signatures. */
  readonly line: string;
};

export type EngagementReading = {
  readonly nation: NationId;
  readonly options: readonly EngagementOption[];
  readonly treaties: readonly TreatyOption[];
  readonly envoy: EnvoyReading;
  /** How the President and this leader get on, said only where it is marked and the services can read that leader. */
  readonly rapport?: string;
};

/** How big one move of one reading is, in the words an engagement's step is said in. */
export function warmthWord(size: number): EngagementWarmth {
  const magnitude = Math.abs(size);
  return magnitude >= 0.05 ? "a large step" : magnitude >= 0.03 ? "a real step" : "a small step";
}

function warmthOf(effects: readonly Effect[]): EngagementWarmth {
  const first = effects.find((effect) => effect.kind === "relationship");
  const deltas = first?.kind === "relationship" ? first.deltas : undefined;
  return warmthWord(Math.max(Math.abs(deltas?.trust ?? 0), Math.abs(deltas?.tension ?? 0), Math.abs(deltas?.alignment ?? 0)));
}

function engagementOptions(campaign: Campaign, nation: NationId): readonly EngagementOption[] {
  const actor = campaign.founding.nation;
  return ENGAGEMENT_KINDS.flatMap((kind): EngagementOption[] => {
    const request = { actor, target: nation, kind };
    const projection = projectEngagement(campaign, request);
    if (!projection) return [];
    const reasons = reasonLines(receivePreview(campaign, request), campaign).map((line) => line.text);
    return [{ kind, label: KIND_LABELS[kind], forecast: projection.willingness.forecast, warmth: warmthOf(projection.effects), reasons }];
  });
}

const TREATY_REASONS = 2;

function treatyOptions(campaign: Campaign, nation: NationId): readonly TreatyOption[] {
  return (Object.keys(TREATY_TERMS) as TreatyKind[]).flatMap((kind): TreatyOption[] => {
    const read = treatyForecast(campaign, nation, kind);
    const preview = counterpartPreview(campaign, nation, kind);
    if (!read || !preview) return [];
    const reasons = reasonLines(preview, campaign)
      .slice(0, TREATY_REASONS)
      .map((line) => line.text);
    return [{ kind, name: TREATY_TERMS[kind].name, forecast: read.forecast, reasons }];
  });
}

const SECRETARY_OF_STATE = "role-foreign-minister" as RoleId;

// How far from the middle of the bench a Secretary has to sit before it is
// worth a word. Inside this band the effect is real but too small to plan around.
const HAND_BAND = 0.5;

const ENVOY_LINES: Readonly<Record<Exclude<EnvoyHand, "vacant">, (who: string) => string>> = {
  skilled: (who) =>
    `${who} is one of the best diplomats to hold the job. Other countries are a little more willing to meet with you and sign your treaties, and each meeting gets a little more done.`,
  capable: (who) =>
    `${who} is about as good a diplomat as most who've held the job. Other countries meet with you and sign treaties about as readily as they would under anyone else.`,
  unsure: (who) =>
    `${who} is a weaker diplomat than most who've held the job. Other countries are a little less willing to meet with you and sign your treaties, and each meeting gets a little less done.`,
};

const VACANT_LINE =
  "Nobody is running the State Department right now. Other countries are less willing to meet with you and sign your treaties, and each meeting gets less done. Name a Secretary of State to fix this.";

/** The Secretary of State's hand, read against the people who could hold the job. */
export function envoyReading(campaign: Campaign): EnvoyReading {
  const secretary = secretaryOfState(campaign);
  if (!secretary) return { hand: "vacant", line: VACANT_LINE };
  const lean = envoyBenchLean(campaign);
  const hand: EnvoyHand = lean >= HAND_BAND ? "skilled" : lean <= -HAND_BAND ? "unsure" : "capable";
  const acting = campaign.player.cabinet[SECRETARY_OF_STATE] !== secretary.base.id;
  const title = roleTitle(SECRETARY_OF_STATE, charterOf(campaign).roleTitles);
  const who = `${acting ? `Acting ${title}` : title} ${secretary.base.name}`;
  return { hand, person: secretary.base.id, line: ENVOY_LINES[hand](who) };
}

/** Where rapport between two leaders is marked enough to say. */
const RAPPORT_MARKED = 0.15;

/**
 * How the President and this government's leader get on, in a sentence. Said
 * only where the services read that government and the dataset knows it in
 * full: rapport is read from the leader's own character, and a thin record's
 * leader has none worth naming.
 */
export function rapportLine(campaign: Campaign, nation: NationId): string | undefined {
  if (!hasIntelOnNation(campaign, nation)) return undefined;
  if ((campaign.nations[nation]?.base.fidelity ?? "full") !== "full") return undefined;
  const rapport = presidentRapport(campaign, nation);
  const leader = foreignLeaderFor(campaign, nation);
  if (rapport === undefined || !leader) return undefined;
  if (rapport >= RAPPORT_MARKED) return `You and ${leader.name} get along well, which helps every meeting and every treaty.`;
  if (rapport <= -RAPPORT_MARKED) return `You and ${leader.name} don't get along, which makes every meeting and every treaty harder.`;
  return undefined;
}

/** What the President could do with a government this week. Undefined for the President's own country. */
export function engagementReading(campaign: Campaign, nation: NationId): EngagementReading | undefined {
  if (nation === campaign.founding.nation || !campaign.nations[nation]) return undefined;
  const rapport = rapportLine(campaign, nation);
  return {
    nation,
    options: engagementOptions(campaign, nation),
    treaties: treatyOptions(campaign, nation),
    envoy: envoyReading(campaign),
    ...(rapport ? { rapport } : {}),
  };
}
