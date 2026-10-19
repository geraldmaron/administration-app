import { DEFAULT_REGIME_ACT, AUTHORIZATION_DELAY_DAYS, TREATY_TERMS, createRngStreams, currentRate, elapsedDays, engagementHold, likelihoodFromUnitInterval, outstandingInstrumentActs, outstandingIssuedAuthorizationActs, projectAction, projectForceAuthorization, projectRatification, selectAuthorizationAgainst, selectNation, selectTreaties, signTreaty, tariffIncidence, tradeEdgesWith, tradeSector, } from "@admin/engine";
import { chosenTariffLaw } from "./tariff-law";
import { charterOf } from "../campaign/founding-options";
import { formatDate } from "../format/figures";
import { formatMoney } from "../format/money";
import { chosenForce, forcePackageFor } from "../world/nation-forces";
import { engagementReading } from "../world/engagement";
import { actOption, configUnder } from "./catalogue";
import { forceCostBasisWords } from "./force-cost-words";
const NO_MONEY = { now: 0, weekly: 0 };
export const LIKELIHOOD_STANCE = {
    "almost certain": "favorable",
    likely: "favorable",
    "roughly even": "caution",
    unlikely: "adverse",
    remote: "adverse",
};
// Retaliation is the one chance on a card that is bad news when it is high.
export const RETALIATION_STANCE = {
    "almost certain": "adverse",
    likely: "adverse",
    "roughly even": "caution",
    unlikely: "favorable",
    remote: "favorable",
};
export function instrumentDraft(campaign, nation, instrument, rung, count, config = {}) {
    const choice = instrument === "military" ? forcePackageFor(campaign, rung, nation) : undefined;
    const force = choice ? chosenForce(choice, count ?? choice.composed.defaultCount) : undefined;
    const request = { actor: campaign.founding.nation, target: nation, instrument, rung, ...(force ? { force } : {}),
        ...(["economic", "military"].includes(instrument) ? { support: { mode: config.support ?? "unilateral", partners: (config.partners ?? []) } } : {}),
        ...(instrument === "military" && rung === 4 ? { civilianProtection: config.civilianProtection ?? "standard", strikeObjective: config.strikeObjective ?? "military-capacity" } : {}),
        ...(instrument === "covert" && rung === 5 ? { regimeAct: config.regimeAct ?? DEFAULT_REGIME_ACT } : {}), };
    return { request, ...(choice ? { choice } : {}), ...(force ? { force } : {}) };
}
export function instrumentProjection(campaign, draft) {
    return projectAction(campaign, draft.request, createRngStreams(campaign.seed));
}
/** The money an act moves now: a spend is negative on the engine's books. */
export function moneyWords(treasury) {
    if (treasury < 0)
        return `${formatMoney(-treasury)} spent`;
    if (treasury > 0)
        return `${formatMoney(treasury)} coming in`;
    return "No money up front";
}
/** The money in a list column: a spend bare, money coming in signed. */
export function moneyShort(treasury) {
    if (treasury < 0)
        return formatMoney(-treasury);
    if (treasury > 0)
        return `+${formatMoney(treasury)}`;
    return "None";
}
function daysShort(days) {
    return days > 0 ? `${days} ${days === 1 ? "day" : "days"}` : "Now";
}
const HELD_SHORT = { cost: "—", timing: "—" };
const FREE_NOW = { cost: "None", timing: "Now" };
export function timingWords(projection) {
    const days = projection.timing?.days ?? 0;
    return days > 0 ? `First results in about ${days} ${days === 1 ? "day" : "days"}` : "Takes effect right away";
}
function preparing(campaign, nation, instrument) {
    return outstandingInstrumentActs(campaign).find((act) => act.request.target === nation && act.request.instrument === instrument);
}
function instrumentPreview(campaign, nation, instrument, rung, count, config = {}) {
    const scale = { label: "Intensity", level: rung, of: 5 };
    const pending = preparing(campaign, nation, instrument);
    if (pending) {
        return { state: "underway", reason: `${pending.title} is being prepared. First report by ${formatDate(pending.dueDate)}.`, cost: "Funds already set aside", timing: "Under way", short: { cost: "Set aside", timing: "Under way" }, scale };
    }
    const draft = instrumentDraft(campaign, nation, instrument, rung, count, config);
    const projected = instrumentProjection(campaign, draft);
    const closed = draft.choice?.composed.closedReason;
    if (!projected.ok || closed) {
        return { state: "held", reason: projected.ok ? closed : `This needs ${projected.missingCapability}.`, cost: "Not available", timing: "Not available", short: HELD_SHORT, scale };
    }
    const { projection } = projected;
    const word = likelihoodFromUnitInterval(projection.successChance);
    return {
        state: "open",
        odds: { label: "Chance it works", word, stance: LIKELIHOOD_STANCE[word], chance: projection.successChance },
        cost: moneyWords(projection.cost.treasury ?? 0),
        money: { now: Math.max(0, -(projection.cost.treasury ?? 0)), weekly: projection.costBasis?.weekly ?? 0 },
        ...(projection.costBasis ? { basis: forceCostBasisWords(projection.costBasis) } : {}),
        timing: timingWords(projection),
        short: { cost: moneyShort(projection.cost.treasury ?? 0), timing: daysShort(projection.timing?.days ?? 0) },
        days: projection.timing?.days ?? 0,
        scale,
        ...(projection.conflict ? { warning: projection.conflict.headline } : {}),
    };
}
const ENGAGEMENT_HOLD_WORDS = {
    "no-relationship": (name) => `The United States has no working ties with ${name}, so there's no way to arrange this.`,
    cooldown: (_name, hold) => {
        const weeks = hold.kind === "cooldown" ? hold.weeksLeft : 0;
        return `You did this recently. You can do it again in ${weeks} ${weeks === 1 ? "week" : "weeks"}.`;
    },
    "host-distrusts": (name) => `${name} will only host a state visit if it trusts you at least a little, and it doesn't yet. Build some trust with them first.`,
    "too-calm": () => "A summit is for two governments that are badly at odds. Things with them aren't tense enough to call one.",
    "too-little-trust": () => "A joint declaration needs strong trust on both sides. Build more trust with them first.",
};
export const WILLINGNESS_WORDS = { likely: "Likely", close: "Could go either way", unlikely: "Unlikely" };
const WILLINGNESS_STANCE = { likely: "favorable", close: "caution", unlikely: "adverse" };
const WARMTH_LEVEL = { "a small step": 1, "a real step": 2, "a large step": 3 };
function nameOf(campaign, nation) {
    return selectNation(campaign, nation)?.base.identity.name ?? nation;
}
function engagementPreview(campaign, nation, kind, reading) {
    const hold = engagementHold(campaign, { actor: campaign.founding.nation, target: nation, kind });
    const option = reading?.options.find((entry) => entry.kind === kind);
    if (hold || !option) {
        const reason = hold ? ENGAGEMENT_HOLD_WORDS[hold.kind](nameOf(campaign, nation), hold) : "This isn't possible this week. Check again next week.";
        return { state: "held", reason, cost: "No money", timing: "Not available", short: HELD_SHORT };
    }
    return {
        state: "open",
        odds: { label: "Would they accept", word: WILLINGNESS_WORDS[option.forecast], stance: WILLINGNESS_STANCE[option.forecast] },
        cost: "No money",
        money: NO_MONEY,
        timing: "Answered right away",
        short: FREE_NOW,
        days: 0,
        scale: { label: "How much closer it brings you", level: WARMTH_LEVEL[option.warmth], of: 3 },
    };
}
/** The signature, read first, and the Senate's whip count on what it would send up. */
export function treatyReading(campaign, nation, kind) {
    const result = signTreaty(campaign, charterOf(campaign), kind, nation);
    const senate = result.ok && result.record.status === "signed" ? projectRatification(campaign, result.record) : undefined;
    return { result, senate };
}
function liveTreaty(campaign, nation, kind) {
    return selectTreaties(campaign).find((record) => record.counterpart === nation && record.kind === kind && (record.status === "signed" || record.status === "ratified" || record.status === "in-force-by-signature"));
}
function treatyPreview(campaign, nation, kind) {
    const note = TREATY_TERMS[kind].bindsOn === "ratification" ? "Needs two thirds of the Senate" : "You can sign it on your own";
    const live = liveTreaty(campaign, nation, kind);
    if (live) {
        const where = live.status === "signed" ? "signed and waiting on the Senate" : "in force";
        return { state: "done", reason: `The ${live.title} is already ${where}.`, cost: "No money", timing: live.status === "signed" ? "Before the Senate" : "In force", short: { cost: "None", timing: live.status === "signed" ? "Senate" : "In force" }, note };
    }
    const { result, senate } = treatyReading(campaign, nation, kind);
    if (!result.ok)
        return { state: "held", reason: result.reason, cost: "No money", timing: "Not available", short: HELD_SHORT, note };
    const word = senate?.forecast.likelihood;
    return {
        state: "open",
        ...(word ? { odds: { label: "Senate approval", word, stance: LIKELIHOOD_STANCE[word] } } : {}),
        cost: "No money",
        money: NO_MONEY,
        timing: senate ? "Senate votes after you sign" : "In force once signed",
        short: { cost: "None", timing: senate ? "Senate vote" : "On signing" },
        note,
    };
}
/** The goods we buy from them that a tariff can land on, the largest first. */
export function tariffableSectors(campaign, nation) {
    return tradeEdgesWith(campaign, nation).filter((edge) => edge.imports > 0 && tradeSector(edge.sector)?.instrument === "tariff");
}
/** A rate a new tariff opens at, before the President sets one. */
export const DEFAULT_TARIFF_RATE = 10;
export function tariffDraft(campaign, nation, sector, rate, statute) {
    const sectors = tariffableSectors(campaign, nation);
    const edge = sector === undefined ? sectors[0] : sectors.find((entry) => entry.sector === sector);
    if (!edge)
        return undefined;
    const law = chosenTariffLaw(campaign, nation, edge.sector, statute);
    const standing = Math.round(currentRate(campaign, nation, edge.sector) * 100);
    const room = law.orders === "tariff" ? Math.min(Math.max(0, 100 - standing), law.roomPercent) : Math.max(0, 100 - standing);
    const chosen = rate ?? Math.min(DEFAULT_TARIFF_RATE, room);
    if (!Number.isInteger(chosen) || chosen <= 0 || chosen > room)
        return undefined;
    const incidence = chosen > 0 && chosen <= room ? tariffIncidence(campaign, nation, edge.sector, chosen / 100) : undefined;
    return { sector: edge, rate: chosen, standing, room, law, ...(incidence ? { incidence } : {}) };
}
function tariffPreview(campaign, nation, config) {
    const draft = tariffDraft(campaign, nation, config.sector, config.rate, config.statute);
    if (!draft)
        return { state: "held", reason: "Pick goods we buy from them and a whole-number rate above zero. The total tariff can't go over 100%, or the trade law's own limit.", cost: "Not available", timing: "Not available", short: HELD_SHORT };
    const law = draft.law;
    if (law.orders === "investigation" && law.investigation) {
        return { state: "open", cost: "No money", money: NO_MONEY, timing: `Finding in about ${law.investigation.weeks} weeks`, short: { cost: "None", timing: `${law.investigation.weeks} wk` }, days: elapsedDays(law.investigation.weeks), note: `Asks ${law.investigation.by} to investigate under ${law.name}` };
    }
    if (law.orders !== "tariff")
        return { state: "held", reason: law.reason, cost: "Not available", timing: "Not available", short: HELD_SHORT };
    if (!draft.incidence)
        return { state: "held", reason: "Pick a rate above zero. Added to the tariff already in place, it can't go over 100%.", cost: "Not set", timing: "Takes effect right away", short: HELD_SHORT };
    const word = likelihoodFromUnitInterval(draft.incidence.retaliationChance);
    return {
        state: "open",
        odds: { label: "Chance they hit back", word, stance: RETALIATION_STANCE[word], chance: draft.incidence.retaliationChance },
        cost: `${formatMoney(draft.incidence.revenue)} a year coming in`,
        money: { now: 0, weekly: 0, perYearIn: draft.incidence.revenue },
        timing: "Takes effect right away",
        short: { cost: `+${formatMoney(draft.incidence.revenue)}/yr`, timing: "Now" },
        days: 0,
        note: `${tradeSector(draft.sector.sector)?.name ?? draft.sector.sector} at ${draft.rate}% under ${law.name}`,
    };
}
function authorizationPreview(campaign, nation) {
    const note = "The House and Senate vote";
    const standing = selectAuthorizationAgainst(campaign, nation);
    if (standing)
        return { state: "done", reason: `Congress has already approved force against ${nameOf(campaign, nation)} in the ${standing.title}.`, cost: "No money", timing: "In force", short: { cost: "None", timing: "In force" }, note };
    const pending = outstandingIssuedAuthorizationActs(campaign).find((act) => act.target === nation);
    if (pending)
        return { state: "underway", reason: `Congress is voting on it. The House and Senate answer by ${formatDate(pending.dueDate)}.`, cost: "No money", timing: `Answer by ${formatDate(pending.dueDate)}`, short: { cost: "None", timing: "Voting" }, note };
    const word = projectForceAuthorization(campaign, nation).forecast.likelihood;
    return { state: "open", odds: { label: "Congress says yes", word, stance: LIKELIHOOD_STANCE[word] }, cost: "No money", money: NO_MONEY, timing: `Congress answers in ${AUTHORIZATION_DELAY_DAYS} days`, short: { cost: "None", timing: daysShort(AUTHORIZATION_DELAY_DAYS) }, days: AUTHORIZATION_DELAY_DAYS, note };
}
/**
 * Every listed option's card, priced against the campaign as it stands. The
 * engagement reading is read once for the whole set because each kind's
 * forecast comes out of the same reading.
 */
export function previewOptions(campaign, nation, options, config = {}) {
    const reading = options.some((option) => option.ref.kind === "engagement") ? engagementReading(campaign, nation) : undefined;
    return new Map(options.map((option) => {
        const ref = option.ref;
        const own = actOption(config.option)?.id === option.id;
        switch (ref.kind) {
            case "instrument":
                return [option.id, instrumentPreview(campaign, nation, ref.instrument, ref.rung, own ? config.count : undefined, configUnder(ref, own ? config : {}))];
            case "engagement":
                return [option.id, engagementPreview(campaign, nation, ref.engagement, reading)];
            case "treaty":
                return [option.id, treatyPreview(campaign, nation, ref.treaty)];
            case "tariff":
                return [option.id, tariffPreview(campaign, nation, own ? config : {})];
            case "authorization":
                return [option.id, authorizationPreview(campaign, nation)];
        }
    }));
}
