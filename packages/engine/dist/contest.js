import { CONTEST_DIALS } from "./contest-dials.js";
import { forceDomain, holdingPhrase, nuclearReading, share } from "./forces.js";
import { liveMilitaryMetrics } from "./warfighting.js";
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function pct(value) {
    return `${Math.round(clamp01(value) * 100)}%`;
}
function count(value) {
    return Math.round(value).toLocaleString("en-US");
}
function side(score, figure, caption) {
    return { score: clamp01(score), figure, caption };
}
// How well a service is covered, in the words a case officer would use. The
// covert board used to print the target's `counterIntel` to the percent, which
// is the one stat on the board whose job is to keep the player from knowing
// things — a service that can be read to two significant figures is not
// hiding anything. The word is what an officer could honestly report.
const COVER_WORDS = ["Porous", "Ordinary", "Tight", "Sealed"];
const COVER_CUTS = [0.35, 0.6, 0.8];
function coverWord(cover) {
    return COVER_WORDS[COVER_CUTS.filter((cut) => cover >= cut).length];
}
function layer(id, label, question, weight, yours, theirs) {
    return { id, label, question, weight, yours, theirs, edge: yours.score - theirs.score };
}
// --- Military ---
/**
 * A domain layer compares two things at once: how good the force is and how
 * much of it there is. Quality alone made an authored brigade count decoration;
 * mass alone would hand every contest to whoever conscripts hardest.
 */
function domainSide(nation, other, domain, dials) {
    const mine = forceDomain(nation, domain, dials);
    const theirs = forceDomain(other, domain, dials);
    const mass = share(mine.personnel, theirs.personnel);
    const score = mine.strength * (1 - dials.forceMassShare) + mass * dials.forceMassShare;
    const lead = mine.holdings[0];
    return side(score, lead ? holdingPhrase(lead.count, lead.type) : `${count(mine.personnel)} personnel`, `${pct(mine.readiness)} of it could move this month`);
}
/** What it costs you to get there, against what it costs them to stay where they already are. */
function reachLayer(input, dials) {
    const { actor, target } = input;
    const military = actor.stats.military;
    const lift = (military.airliftCapacity + military.sealiftCapacity) / 2;
    const footing = clamp01(military.basesAbroad / 20);
    const distance = Math.max(1, input.distanceMultiplier ?? 1);
    const home = clamp01(dials.homeGroundFloor + 0.35 * target.stats.security.borderControl + 0.2 * target.stats.military.doctrineQuality);
    return layer("reach", "Getting there", "Whether the force can arrive in the shape it left in.", dials.weights.military.reach, side(clamp01((lift * 0.7 + footing * 0.3) / distance), distance > 1.05 ? `${distance.toFixed(1)}× the price of a border war` : "Adjacent", `${pct(lift)} lift, ${count(military.basesAbroad)} bases abroad`), side(home, "Home ground", "Fighting where the depots already are"));
}
/** Whether either side can still be fighting in six months. */
function sustainmentLayer(input, dials) {
    // Live, like the war tick's strength: staying power spent last month is not
    // staying power this month.
    const read = (nation) => {
        const { warDuration: duration, industrialMobilization: industry } = liveMilitaryMetrics(nation.stats).sustainability;
        return { score: clamp01(duration * 0.6 + industry * 0.4), duration, industry };
    };
    const mine = read(input.actor);
    const theirs = read(input.target);
    return layer("sustainment", "Staying power", "Who runs out of shells, money and patience first.", dials.weights.military.sustainment, side(mine.score, pct(mine.duration), `${pct(mine.industry)} of industry can be turned over to it`), side(theirs.score, pct(theirs.duration), `${pct(theirs.industry)} of industry can be turned over to it`));
}
/** The rung a navy stands up: a blockade is decided at sea, so the sea and ground weights trade places for it. */
const NAVAL_RUNG = 3;
function domainWeight(dials, domain, rung) {
    const weights = dials.weights.military;
    if (rung !== NAVAL_RUNG)
        return weights[domain];
    if (domain === "sea")
        return weights.ground;
    if (domain === "ground")
        return weights.sea;
    return weights[domain];
}
function militaryLayers(input, dials) {
    const domains = ["ground", "air", "sea", "cyber", "space"];
    return [
        ...domains.map((domain) => {
            const reading = forceDomain(input.actor, domain, dials);
            return layer(domain, reading.label, reading.question, domainWeight(dials, domain, input.rung), domainSide(input.actor, input.target, domain, dials), domainSide(input.target, input.actor, domain, dials));
        }),
        reachLayer(input, dials),
        sustainmentLayer(input, dials),
    ];
}
// --- Economic ---
function dependenceOn(nation, on) {
    return nation.stats.trade.tradeDependence[on] ?? 0;
}
function economicLayers(input, dials) {
    const { actor, target } = input;
    const weights = dials.weights.economic;
    const grip = dependenceOn(target, actor.id);
    const counterGrip = dependenceOn(actor, target.id);
    const resolve = (nation) => clamp01(nation.stats.politics.legitimacy * 0.5 + nation.stats.politics.regimeStability * 0.5);
    return [
        // Their side of this layer is insulation, not a mirror of yours: two
        // countries that do not trade with each other are not evenly matched on
        // economic coercion, they are a country with no lever and a country that
        // cannot feel one. A layer that read 0 against 0 as "neutral" would price
        // sanctions on a stranger the same as sanctions on a customer.
        layer("dependence", "Who needs whom", "Whether the squeeze reaches anything they cannot replace.", weights.dependence, side(grip, pct(grip), "of their trade runs through you"), side(clamp01((1 - grip) * 0.7 + counterGrip * 0.3), pct(1 - grip), `of their trade never touches you${counterGrip > 0 ? `, and ${pct(counterGrip)} of yours runs through them` : ""}`)),
        layer("reserves", "Who outlasts whom", "Whose reserves are still there when the measure bites.", weights.reserves, side(share(actor.stats.economy.reserves, target.stats.economy.reserves), pct(share(actor.stats.economy.reserves, target.stats.economy.reserves)), "of the pair's reserves"), side(share(target.stats.economy.reserves, actor.stats.economy.reserves), pct(share(target.stats.economy.reserves, actor.stats.economy.reserves)), "of the pair's reserves")),
        layer("market", "Weight in the room", "Whether a third country has to pick a side.", weights.market, side(share(actor.stats.economy.gdp, target.stats.economy.gdp), pct(share(actor.stats.economy.gdp, target.stats.economy.gdp)), "of the pair's output"), side(share(target.stats.economy.gdp, actor.stats.economy.gdp), pct(share(target.stats.economy.gdp, actor.stats.economy.gdp)), "of the pair's output")),
        layer("resolve", "Who can take the pain", "Which government survives the month the shelves empty.", weights.resolve, side(resolve(actor), pct(resolve(actor)), "standing at home"), side(resolve(target), pct(resolve(target)), "standing at home")),
    ];
}
// --- Diplomatic ---
function diplomaticLayers(input, dials) {
    const { actor, target, tension } = input;
    const weights = dials.weights.diplomatic;
    return [
        layer("reach", "Rooms you are already in", "Whether there is anywhere to make the ask.", weights.reach, side(actor.stats.softPower.diplomaticReach, pct(actor.stats.softPower.diplomaticReach), "diplomatic reach"), side(target.stats.softPower.diplomaticReach, pct(target.stats.softPower.diplomaticReach), "diplomatic reach")),
        layer("standing", "Whether your word carries", "Whether a promise from this administration is worth taking.", weights.standing, side(actor.stats.politics.legitimacy, pct(actor.stats.politics.legitimacy), "legitimacy at home"), side(target.stats.politics.legitimacy, pct(target.stats.politics.legitimacy), "legitimacy at home")),
        layer("coalition", "Who else is listening", "Whether the argument travels without a diplomat carrying it.", weights.coalition, side(actor.stats.softPower.culturalReach, pct(actor.stats.softPower.culturalReach), "cultural reach"), side(target.stats.softPower.culturalReach, pct(target.stats.softPower.culturalReach), "cultural reach")),
        layer("temperature", "The temperature", "Whether this government is in a mood to be moved.", weights.temperature, side(1 - tension, pct(1 - tension), "of the room is still workable"), side(tension, pct(tension), "tension on the file")),
    ];
}
// --- Covert ---
function covertLayers(input, dials) {
    const { actor, target } = input;
    const weights = dials.weights.covert;
    const distance = Math.max(1, input.distanceMultiplier ?? 1);
    const accessScore = clamp01((actor.stats.security.intelCapability * 0.5 + actor.stats.softPower.diplomaticReach * 0.5) / distance);
    return [
        layer("collection", "What you can see", "Whether the service knows enough to act on.", weights.collection, side(actor.stats.security.intelCapability, pct(actor.stats.security.intelCapability), "collection reach"), side(target.stats.security.counterIntel, coverWord(target.stats.security.counterIntel), "counter-intelligence")),
        layer("access", "Getting somebody in", "Whether there is a way into the country at all.", weights.access, side(accessScore, distance > 1.05 ? `${distance.toFixed(1)}× the reach` : "In reach", "stations and cover in place"), side(target.stats.security.borderControl, pct(target.stats.security.borderControl), "of what crosses the border is seen")),
        layer("penetration", "What money buys", "Whether anyone inside can be bought, and whether it would hold.", weights.penetration, side(target.stats.security.corruptionIndex, pct(target.stats.security.corruptionIndex), "of decisions there are bought rather than argued"), side(target.stats.politics.regimeStability, pct(target.stats.politics.regimeStability), "regime stability")),
    ];
}
// --- Assistance ---
function assistanceLayers(input, dials) {
    const { actor, target, tension } = input;
    const weights = dials.weights.assistance;
    const distance = Math.max(1, input.distanceMultiplier ?? 1);
    const purse = share(actor.stats.economy.reserves, target.stats.economy.reserves);
    const hole = clamp01((1 - target.stats.politics.legitimacy) * 0.5 + target.stats.security.insurgencyPressure * 0.5);
    const delivery = clamp01((actor.stats.softPower.diplomaticReach * 0.5 + actor.stats.military.airliftCapacity * 0.5) / distance);
    const obstruction = clamp01(0.3 + target.stats.security.insurgencyPressure * 0.4 + (1 - target.stats.security.borderControl) * 0.3);
    const leakage = clamp01(target.stats.security.corruptionIndex * 0.6 + tension * 0.4);
    return [
        layer("purse", "What you can spare", "Whether the money is large against the problem.", weights.purse, side(purse, pct(purse), "of the pair's reserves are yours"), side(hole, pct(hole), "the size of the hole it has to fill")),
        layer("delivery", "Getting it there", "Whether it reaches the people it was voted for.", weights.delivery, side(delivery, pct(delivery), "lift and mission presence"), side(obstruction, pct(obstruction), "of the route is contested")),
        layer("absorption", "Whether it lands", "Whether a government exists that can spend it.", weights.absorption, side(target.stats.politics.legitimacy, pct(target.stats.politics.legitimacy), "of the country accepts its government"), side(leakage, pct(leakage), "goes missing or is read as a lever")),
    ];
}
const LAYER_BUILDERS = {
    military: militaryLayers,
    economic: economicLayers,
    diplomatic: diplomaticLayers,
    covert: covertLayers,
    assistance: assistanceLayers,
};
/**
 * The contest, and the odds it implies before rung, minister or arsenal.
 *
 * Habituation is taken off the edge rather than added to one side: repetition
 * does not make a target's navy bigger, it makes this particular move less
 * surprising, and that is a fact about the pair rather than about either of
 * them.
 */
export function assessContest(input) {
    const dials = input.dials ?? CONTEST_DIALS;
    const layers = LAYER_BUILDERS[input.instrument](input, dials);
    const weighted = layers.reduce((sum, entry) => sum + entry.weight * entry.edge, 0);
    const edge = Math.max(-1, Math.min(1, weighted - dials.habituation * (input.habituation ?? 0)));
    return {
        instrument: input.instrument,
        actor: input.actor.id,
        target: input.target.id,
        layers,
        edge,
        baseChance: Math.max(dials.floor, Math.min(dials.ceiling, 0.5 + dials.contrast * edge)),
    };
}
/** What a rung does to a contest's own odds — the difficulty of the act, separate from the matchup. */
export function rungReliability(rung, dials = CONTEST_DIALS) {
    return dials.rungReliability[rung];
}
export { nuclearReading };
