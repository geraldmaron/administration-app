import { TRAIT_KEYS, traitProfileByNation, type NationId, type NationTraits, type PersonId, type RoleId } from "@admin/world";
import { createRngStreams, makeCampaignSeed, type RngStream, type RngStreams } from "./rng.js";
import { hasIntelOnNation } from "./state-selectors.js";
import type { Campaign, NationRuntime } from "./state.js";
import { rollNationTraits } from "./traits.js";
import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { recomputeApproval } from "./opinion.js";
import type { ReleaseKind } from "./state-world.js";

// What a forecast is run on: the government's belief about the world, not the
// world. A projection run on the true campaign would show the player things
// only God Mode may show (a government's real agenda, an operation nobody
// caught, the economy's figure before it is published) and would let them read
// a hidden agenda off which way the runs broke.
//
// So each ensemble member gets its own believed copy, drawn on a key of its
// own. A government the services cannot read is given the personality and aims
// a draw from its public profile gives it, the same profile its true ones were
// drawn from at founding, so the forecast is as good as what is plausible for
// that kind of country and no better. A government the services can read is
// given its true traits with an analyst's error, the economy is read from
// what was last published with the same error, and the public's judgments are
// read as polling reads them, a few points off. The error scales with the
// responsible adviser's competence: the better the staff, the narrower the
// band. An operation by a government nobody reads is not in the copy, because
// nobody in this government knows it is coming.

/** God Mode reads the true campaign; staff forecasts use the named adviser's competence (0..1). */
export type ForecastBasis =
  | { readonly kind: "truth" }
  | { readonly kind: "staff"; readonly role: RoleId; readonly person?: PersonId; readonly competence: number };

/** The widest analyst error on a personality trait read by the services, as a share of its 0..1 scale, at no competence. */
export const BELIEF_TRAIT_ERROR = 0.2;
/** The widest error on a published rate (unemployment, inflation, growth), in points of the rate, at no competence. */
export const BELIEF_RATE_ERROR = 0.01;
/** The widest error on each of the six judgments as the government reads them from polling, at no competence: a poor shop reads the country up to five points off either way. */
export const BELIEF_OPINION_ERROR = 0.05;

const PUBLISHED: readonly [ReleaseKind, "unemployment" | "inflation" | "growth"][] = [
  ["jobs", "unemployment"],
  ["cpi", "inflation"],
  ["gdp", "growth"],
];

export function beliefStreams(campaign: Campaign, member: number): RngStreams {
  return createRngStreams(makeCampaignSeed(`${campaign.seed}::belief::${member}`));
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const error = (stream: RngStream, scale: number) => (stream.next() * 2 - 1) * scale;

/** What the government believes of one foreign government's character. */
function believedTraits(campaign: Campaign, id: NationId, runtime: NationRuntime, streams: RngStreams, miss: number): NationTraits {
  if (!hasIntelOnNation(campaign, id)) {
    const profile = traitProfileByNation.get(id);
    // A country with no profile has only its authored traits, which are public record.
    return profile ? rollNationTraits(profile, streams) : runtime.base.traits;
  }
  const read = Object.fromEntries(TRAIT_KEYS.map((key) => [key, clamp01(runtime.traits[key] + error(streams.stream("belief", id, key), BELIEF_TRAIT_ERROR * miss))]));
  return { ...runtime.traits, ...read };
}

function believedNations(campaign: Campaign, streams: RngStreams, miss: number): Campaign["nations"] {
  const home = campaign.founding.nation;
  return Object.fromEntries(
    Object.keys(campaign.nations)
      .sort()
      .map((id) => {
        const runtime = campaign.nations[id as NationId]!;
        return [id, id === home ? runtime : { ...runtime, traits: believedTraits(campaign, id as NationId, runtime, streams, miss) }];
      }),
  ) as Campaign["nations"];
}

/** The latest printed figure of a release, or nothing before the first one. */
function lastPublished(campaign: Campaign, kind: ReleaseKind): number | undefined {
  const issued = (campaign.releases?.issued ?? []).filter((entry) => entry.kind === kind);
  return issued.at(-1)?.value;
}

/** The home economy as the government reads it: the last published rates, with the analyst's error. */
function believedHome(campaign: Campaign, streams: RngStreams, miss: number): NationRuntime | undefined {
  const home = campaign.nations[campaign.founding.nation];
  if (!home) return undefined;
  const economy = { ...home.stats.economy };
  const read = Object.fromEntries(
    PUBLISHED.map(([kind, field]) => [field, (lastPublished(campaign, kind) ?? economy[field]) + error(streams.stream("belief", "home", field), BELIEF_RATE_ERROR * miss)]),
  );
  return { ...home, stats: { ...home.stats, economy: { ...economy, ...read } } };
}

/** The public's six judgments as the government reads them: through polling, so with an error, and approval settled from that reading. */
function believedOpinion(campaign: Campaign, streams: RngStreams, miss: number): Campaign["player"] {
  const opinion = campaign.player.opinion;
  const read = Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, clamp01(opinion[driver] + error(streams.stream("belief", "opinion", driver), BELIEF_OPINION_ERROR * miss))]));
  return { ...campaign.player, opinion: { ...opinion, ...read } };
}

/** Whether a scheduled act is one this government cannot know is coming: covert, and by a government it cannot read. */
function unseen(campaign: Campaign, act: NonNullable<Campaign["issuedActs"]>[string]): boolean {
  if (act.kind !== "instrument") return false;
  const { actor, instrument } = act.request;
  return actor !== campaign.founding.nation && instrument === "covert" && !hasIntelOnNation(campaign, actor);
}

/**
 * The campaign as the government believes it, for ensemble member `member`.
 * Pure: the live campaign is read, never written. Under a truth basis it is
 * the campaign itself.
 */
export function believedCampaign(campaign: Campaign, member: number, basis: ForecastBasis): Campaign {
  if (basis.kind === "truth") return campaign;
  const streams = beliefStreams(campaign, member);
  const miss = 1 - clamp01(basis.competence);
  const nations = believedNations(campaign, streams, miss);
  const home = believedHome(campaign, streams, miss);
  const acts = campaign.issuedActs;
  const visible = acts ? Object.fromEntries(Object.entries(acts).filter(([, act]) => !unseen(campaign, act))) : undefined;
  return recomputeApproval({
    ...campaign,
    nations: home ? { ...nations, [campaign.founding.nation]: home } : nations,
    player: believedOpinion(campaign, streams, miss),
    ...(visible ? { issuedActs: visible } : {}),
  });
}

/** How much of the world the services read: the share of foreign governments with intelligence on them. */
export function intelligenceCoverage(campaign: Campaign): number {
  const foreign = Object.keys(campaign.nations).filter((id) => id !== campaign.founding.nation);
  if (foreign.length === 0) return 1;
  return foreign.filter((id) => hasIntelOnNation(campaign, id as NationId)).length / foreign.length;
}
