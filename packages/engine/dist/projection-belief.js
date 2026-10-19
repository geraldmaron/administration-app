import { TRAIT_KEYS, traitProfileByNation } from "@admin/world";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { hasIntelOnNation } from "./state-selectors.js";
import { rollNationTraits } from "./traits.js";
import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { recomputeApproval } from "./opinion.js";
/** The widest analyst error on a personality trait read by the services, as a share of its 0..1 scale, at no competence. */
export const BELIEF_TRAIT_ERROR = 0.2;
/** The widest error on a published rate (unemployment, inflation, growth), in points of the rate, at no competence. */
export const BELIEF_RATE_ERROR = 0.01;
/** The widest error on each of the six judgments as the government reads them from polling, at no competence: a poor shop reads the country up to five points off either way. */
export const BELIEF_OPINION_ERROR = 0.05;
const PUBLISHED = [
    ["jobs", "unemployment"],
    ["cpi", "inflation"],
    ["gdp", "growth"],
];
export function beliefStreams(campaign, member) {
    return createRngStreams(makeCampaignSeed(`${campaign.seed}::belief::${member}`));
}
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const error = (stream, scale) => (stream.next() * 2 - 1) * scale;
/** What the government believes of one foreign government's character. */
function believedTraits(campaign, id, runtime, streams, miss) {
    if (!hasIntelOnNation(campaign, id)) {
        const profile = traitProfileByNation.get(id);
        // A country with no profile has only its authored traits, which are public record.
        return profile ? rollNationTraits(profile, streams) : runtime.base.traits;
    }
    const read = Object.fromEntries(TRAIT_KEYS.map((key) => [key, clamp01(runtime.traits[key] + error(streams.stream("belief", id, key), BELIEF_TRAIT_ERROR * miss))]));
    return { ...runtime.traits, ...read };
}
function believedNations(campaign, streams, miss) {
    const home = campaign.founding.nation;
    return Object.fromEntries(Object.keys(campaign.nations)
        .sort()
        .map((id) => {
        const runtime = campaign.nations[id];
        return [id, id === home ? runtime : { ...runtime, traits: believedTraits(campaign, id, runtime, streams, miss) }];
    }));
}
/** The latest printed figure of a release, or nothing before the first one. */
function lastPublished(campaign, kind) {
    const issued = (campaign.releases?.issued ?? []).filter((entry) => entry.kind === kind);
    return issued.at(-1)?.value;
}
/** The home economy as the government reads it: the last published rates, with the analyst's error. */
function believedHome(campaign, streams, miss) {
    const home = campaign.nations[campaign.founding.nation];
    if (!home)
        return undefined;
    const economy = { ...home.stats.economy };
    const read = Object.fromEntries(PUBLISHED.map(([kind, field]) => [field, (lastPublished(campaign, kind) ?? economy[field]) + error(streams.stream("belief", "home", field), BELIEF_RATE_ERROR * miss)]));
    return { ...home, stats: { ...home.stats, economy: { ...economy, ...read } } };
}
/** The public's six judgments as the government reads them: through polling, so with an error, and approval settled from that reading. */
function believedOpinion(campaign, streams, miss) {
    const opinion = campaign.player.opinion;
    const read = Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, clamp01(opinion[driver] + error(streams.stream("belief", "opinion", driver), BELIEF_OPINION_ERROR * miss))]));
    return { ...campaign.player, opinion: { ...opinion, ...read } };
}
/** Whether a scheduled act is one this government cannot know is coming: covert, and by a government it cannot read. */
function unseen(campaign, act) {
    if (act.kind !== "instrument")
        return false;
    const { actor, instrument } = act.request;
    return actor !== campaign.founding.nation && instrument === "covert" && !hasIntelOnNation(campaign, actor);
}
/**
 * The campaign as the government believes it, for ensemble member `member`.
 * Pure: the live campaign is read, never written. Under a truth basis it is
 * the campaign itself.
 */
export function believedCampaign(campaign, member, basis) {
    if (basis.kind === "truth")
        return campaign;
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
export function intelligenceCoverage(campaign) {
    const foreign = Object.keys(campaign.nations).filter((id) => id !== campaign.founding.nation);
    if (foreign.length === 0)
        return 1;
    return foreign.filter((id) => hasIntelOnNation(campaign, id)).length / foreign.length;
}
