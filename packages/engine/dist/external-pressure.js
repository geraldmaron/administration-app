import { MACRO_ANCHORS, SECTOR_IDS, tradeExposure, US_GOODS_TRADE } from "@admin/world";
import { blockadeCutOn } from "./blockades.js";
import { NO_CYCLE } from "./business-cycle.js";
import { restingProgram } from "./governance.js";
import { macroBaseline } from "./macro-baseline.js";
import { projectTariffPrices } from "./tariff-prices.js";
import { shockPressure } from "./external-shocks.js";
import { commodityMacroPressure } from "./commodity-pressure.js";
import { COERCION_AS_RATE, retaliationLeft } from "./trade-volume.js";
import { TRADE_SECTORS, tradeSector } from "./trade-sectors.js";
import { compareDates, daysFromCivil, selectDateOfTurn } from "./clock.js";
import { isTradeMeasureEffective } from "./order-authority.js";
import { selectActiveConflicts, selectNation } from "./state.js";
import { warLossFraction } from "./commodity-shocks.js";
const NO_PRESSURE = { growth: 0, inflation: 0, outlays: 0 };
/**
 * What a war costs a belligerent per unit of intensity, by where it is fought.
 * A defender fights on its own ground, so it loses output and pays in prices; an
 * aggressor fights abroad and pays mostly in money; a joiner sends forces and
 * little else. Stated net: what a war's spending adds to demand is already
 * inside these figures, which is why war outlays never enter the budget's push.
 *
 * The growth figures are set on what a year of war does to the whole economy,
 * not on the target alone: the gap correction and the week-to-week lag take
 * about half of a target shift back inside a year, so a defender's target moves
 * ten points at full intensity for it to lose three or four over the year.
 *
 * What a war does to the world's energy and food prices is not in these
 * figures: a war among producers reaches every economy, the belligerents
 * included, through the commodity markets (`commodity-pressure.ts`), so the
 * same barrel is never charged twice.
 */
export const WAR_PRESSURE = {
    defender: { growth: -0.1, inflation: 0.03, outlays: 0.03 },
    aggressor: { growth: -0.01, inflation: 0.005, outlays: 0.02 },
    joiner: { growth: -0.003, inflation: 0, outlays: 0.005 },
};
/** A measure's growth cost per unit of the trade it cuts, as a share of output. */
export const COERCION_BITE = 0.5;
/** The most every measure in force together can take off an economy's growth. */
export const COERCION_CAP = 0.08;
/** How much of a partner's swing reaches United States growth, per unit of US exports to it as a share of US output. */
export const PARTNER_ELASTICITY = 1.5;
function warRole(conflict, nation) {
    if (conflict.defender === nation)
        return "defender";
    if (conflict.aggressor === nation)
        return "aggressor";
    if (conflict.joined.aggressor.includes(nation) || conflict.joined.defender.includes(nation))
        return "joiner";
    return undefined;
}
function warPressure(campaign, nation) {
    let growth = 0;
    let inflation = 0;
    let outlays = 0;
    for (const conflict of selectActiveConflicts(campaign)) {
        const role = warRole(conflict, nation);
        if (!role)
            continue;
        const cost = WAR_PRESSURE[role];
        growth += cost.growth * conflict.intensity;
        inflation += cost.inflation * conflict.intensity;
        outlays += cost.outlays * conflict.intensity;
    }
    return { growth, inflation, outlays };
}
/**
 * One of the administration's own measures that cuts trade rather than pricing
 * it, still standing and not paused by a court (`isTradeMeasureEffective`). A
 * paused measure keeps its record for reinstatement and charges nothing.
 */
function isCoercionInForce(campaign, measure) {
    return measure.liftedTurn === undefined && measure.origin === "us" && measure.kind !== "tariff" && measure.scope !== "listed"
        && isTradeMeasureEffective(campaign, measure.id);
}
/**
 * Planning value: the share of a designated seller's sales to third parties a
 * new designation by the administration reaches. Its measures run through the
 * currency most cross-border trade settles in, so a bank or a buyer anywhere
 * that deals with a designated seller risks its own access to it. Not a
 * sourced coefficient: Iran's crude exports fell by roughly four fifths in the
 * year after the 2018 reimposition (search snippets, not opened), and a
 * buyer the designation does not reach, such as a state refiner that never
 * touches the currency, keeps buying.
 */
export const DOLLAR_REACH = 0.8;
/**
 * Planning values: evasion (shadow fleets, transshipment, settlement in other
 * currencies) wins back up to `ceiling` of the reach while a designation
 * stands, approaching it with a `buildDays` half-life, and the networks it
 * built outlast a lift, fading with a `decayDays` half-life. No opened source
 * gives these; Iran's exports recovering over the five years after 2019 is
 * the shape (unverified).
 */
export const EVASION = { ceiling: 0.5, buildDays: 365, decayDays: 730 };
/** The part of an economy a register measure reaches: a sanction or an export control its sector, an embargo or a freeze everything. */
function measureScope(measure) {
    if (measure.kind === "embargo" || measure.kind === "asset-restriction")
        return undefined;
    return economySector(measure.sector);
}
/** A trade sector's economy sector, or the id itself where it already names one. */
export function economySector(id) {
    const rollup = tradeSector(id)?.rollup;
    if (rollup)
        return rollup;
    return SECTOR_IDS.includes(id) ? id : undefined;
}
/**
 * Whether a register measure reaches buyers beyond the imposer: a sectoral
 * designation or a two-way embargo does. A ban on goods at our own border
 * designates nobody, an export control licenses only what we sell, a freeze
 * blocks the government's own holdings here and stops no third party's
 * purchases, and a list of named persons reaches no trade at all. None of
 * those builds the evasion a designation teaches either.
 */
function carriesReach(measure) {
    if (measure.kind === "export-control" || measure.kind === "asset-restriction" || measure.scope === "listed")
        return false;
    return measure.direction !== "imports";
}
/** Each stretch, in days since the epoch, that the administration held a measure with reach on a target, imposed through lifted or today. */
function reachSpans(campaign, target) {
    const today = daysFromCivil(campaign.calendar);
    return Object.values(campaign.trade.measures)
        .filter((measure) => measure.origin === "us" && measure.kind !== "tariff" && measure.target === target && carriesReach(measure))
        .map((measure) => {
        // Records lifted before the lift date was stored read it off their week.
        const lifted = measure.liftedDate ?? (measure.liftedTurn === undefined ? undefined : selectDateOfTurn(campaign, measure.liftedTurn));
        const end = lifted === undefined ? today : daysFromCivil(lifted);
        return [daysFromCivil(measure.imposedDate), Math.min(today, end)];
    })
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
/**
 * How much of the reach evasion has won back on one target today, 0..ceiling.
 * Read off the register's own dates, so lifting a measure and imposing it
 * again does not reset the networks the first one taught the target to build.
 */
export function evasionOn(campaign, target) {
    let evasion = 0;
    let clock;
    for (const [start, end] of reachSpans(campaign, target)) {
        if (clock !== undefined && start > clock)
            evasion *= 2 ** (-(start - clock) / EVASION.decayDays);
        const from = clock === undefined ? start : Math.max(start, clock);
        if (end > from)
            evasion = EVASION.ceiling + (evasion - EVASION.ceiling) * 2 ** (-(end - from) / EVASION.buildDays);
        clock = clock === undefined ? end : Math.max(clock, end);
    }
    const today = daysFromCivil(campaign.calendar);
    if (clock !== undefined && today > clock)
        evasion *= 2 ** (-(today - clock) / EVASION.decayDays);
    return evasion;
}
/**
 * How far past its own market one government's designation of another
 * reaches this week. Only the administration's: another capital's measure
 * stops what it buys and sells itself, and no more.
 */
export function financialReachOf(campaign, imposer, target) {
    if (imposer !== campaign.founding.nation)
        return 0;
    return DOLLAR_REACH * (1 - evasionOn(campaign, target));
}
/**
 * Whose sales one of the administration's measures stops, read the way the
 * trade book reads the same measure (`trade-volume.ts`): an export control
 * denies what we license them and leaves what they sell alone, an embargo ends
 * both directions unless it bans only their goods, and sanctions and asset
 * restrictions bite on what they sell. None of the inherited programs
 * restricts what the country sells the world: their export prohibitions are
 * narrow (luxury goods and banknotes for Russia) with farm and medical trade
 * licensed, and the recorded opening already carries what they left of trade
 * with the target.
 */
function directionOf(measure) {
    if (measure.kind === "export-control")
        return "imposer-sales";
    return measure.kind === "embargo" && measure.direction !== "imports" ? "both" : "target-sales";
}
const coercionsBySnapshot = new WeakMap();
function registerCoercion(campaign, measure) {
    const sector = measureScope(measure);
    return {
        imposer: campaign.founding.nation,
        target: measure.target,
        severity: COERCION_AS_RATE[measure.kind],
        ...(sector ? { sector, good: measure.sector } : {}),
        covered: measure.covered ?? 1,
        direction: directionOf(measure),
        authority: measure.authority,
        financialReach: carriesReach(measure) ? financialReachOf(campaign, campaign.founding.nation, measure.target) : 0,
    };
}
/**
 * Every economic measure in force, whoever imposed it: the administration's own
 * register (tariffs are a price step, not a cut in trade, and are not here) and
 * every standing embargo a government has declared, the United States included
 * as a target. An embargo the administration declared is in both, and counted
 * once, from the register. Another capital's embargo is taken under its own
 * law and reaches no further than its own trade.
 */
export function coercionsInForce(campaign) {
    const known = coercionsBySnapshot.get(campaign);
    if (known)
        return known;
    const us = campaign.founding.nation;
    const fromRegister = Object.values(campaign.trade.measures)
        .filter((measure) => isCoercionInForce(campaign, measure))
        .map((measure) => registerCoercion(campaign, measure));
    const fromEmbargoes = Object.entries(campaign.player.flags)
        .filter(([flag, standing]) => standing && flag.startsWith("embargo:"))
        .map(([flag]) => flag.split(":"))
        .filter(([, imposer, target]) => imposer !== us && imposer !== undefined && target !== undefined)
        .map(([, imposer, target]) => ({ imposer, target, severity: COERCION_AS_RATE.embargo, covered: 1, direction: "both", authority: imposer, financialReach: 0 }));
    const coercions = [...fromRegister, ...fromEmbargoes];
    coercionsBySnapshot.set(campaign, coercions);
    return coercions;
}
// One table of export shares per founding, filled as pairs are read: the
// shares are read against the dataset's founding figures, so they never change
// inside a campaign, and the United States' partner sum reads two hundred of
// them every week.
const sharesByFounding = new WeakMap();
function memo(campaign, key, read) {
    let shares = sharesByFounding.get(campaign.founding);
    if (!shares) {
        shares = new Map();
        sharesByFounding.set(campaign.founding, shares);
    }
    const known = shares.get(key);
    if (known !== undefined)
        return known;
    const share = read();
    shares.set(key, share);
    return share;
}
/**
 * The share of one government's output that is goods sold to another, in one
 * sector or in all. Where the United States is on either side, what the two
 * countries actually traded (`US_GOODS_TRADE`); between two other capitals,
 * what the seller exports in the sector, split by how much of its trade runs
 * to that buyer. Read against the dataset's founding figures, so a measure
 * that has already cut the trade does not also shrink its own cost.
 */
export function exportShare(campaign, seller, buyer, sector) {
    return memo(campaign, `${seller}>${buyer}:${sector ?? "*"}`, () => foundingExportShare(campaign, seller, buyer, sector));
}
function foundingExportShare(campaign, seller, buyer, sector) {
    const from = selectNation(campaign, seller)?.base.stats;
    if (!from || from.economy.gdp <= 0)
        return 0;
    const us = campaign.founding.nation;
    const recorded = seller === us ? US_GOODS_TRADE[buyer]?.exports : buyer === us ? US_GOODS_TRADE[seller]?.imports : undefined;
    if (recorded)
        return Math.min(1, sumIn(recorded, sector) / from.economy.gdp);
    return Math.min(1, worldExportShare(campaign, seller, sector) * partnerShare(campaign, seller, buyer));
}
/** A recorded flow's total, in one economy sector or in all ("other" is in no sector). */
function sumIn(flows, sector) {
    return Object.entries(flows).reduce((sum, [id, value]) => (sector === undefined || economySector(id) === sector ? sum + value : sum), 0);
}
/**
 * How much of a seller's trade runs to one buyer, 0..1: the gravity share the
 * dataset derives, recovered from the dependence it stores, which is that
 * share times the seller's whole exposure to trade (`tradeExposure`). The
 * share is the dataset's model, not bilateral trade statistics.
 */
export function partnerShare(campaign, seller, buyer) {
    const base = selectNation(campaign, seller)?.base.stats;
    if (!base)
        return 0;
    const exposure = tradeExposure(base);
    return exposure > 0 ? Math.min(1, (base.trade.tradeDependence[buyer] ?? 0) / exposure) : 0;
}
/**
 * The share of a government's exports one economy sector carries. The dataset
 * names the sectors a country exports (`trade.topExports`, ranked from the
 * World Bank's breakdown) without their values, so its exports are read as
 * drawn from those sectors in proportion to each one's share of output. A
 * sector it does not list carries none of its exports to the world.
 */
export function exportScope(campaign, nation, sector) {
    if (sector === undefined)
        return 1;
    const base = selectNation(campaign, nation)?.base;
    if (!base || !base.stats.trade.topExports.includes(sector))
        return 0;
    const listed = base.sectors.filter((entry) => base.stats.trade.topExports.includes(entry.sector));
    const total = listed.reduce((sum, entry) => sum + entry.mix, 0);
    if (total <= 0)
        return 1 / base.stats.trade.topExports.length;
    return (listed.find((entry) => entry.sector === sector)?.mix ?? 0) / total;
}
/** What a government sells the whole world in one sector or in all, as a share of its output. */
export function worldExportShare(campaign, seller, sector) {
    return memo(campaign, `${seller}>world:${sector ?? "*"}`, () => {
        const base = selectNation(campaign, seller)?.base.stats;
        if (!base || base.economy.gdp <= 0)
            return 0;
        return Math.min(1, (base.trade.exports / base.economy.gdp) * exportScope(campaign, seller, sector));
    });
}
/** 0..1 of a seller's sales in a sector that go to one buyer. */
export function buyerShareOf(campaign, seller, buyer, sector) {
    const world = worldExportShare(campaign, seller, sector);
    const direct = exportShare(campaign, seller, buyer, sector);
    // A sector the seller does not list among its exports has no world figure to
    // divide by: read the buyer's share of its trade as a whole instead.
    if (world <= 0)
        return direct > 0 ? partnerShare(campaign, seller, buyer) : 0;
    return Math.min(1, direct / world);
}
/** Whether a measure reaches one economy sector of its target, or one good inside it. */
export function covers(coercion, sector, good) {
    if (coercion.direction === "imposer-sales")
        return false;
    if (coercion.sector === undefined)
        return true;
    return coercion.sector === sector && (good === undefined || coercion.good === undefined || coercion.good === good);
}
/** The trade sectors an economy sector's goods fall in. */
const goodsIn = (sector) => TRADE_SECTORS.filter((def) => def.rollup === sector);
/**
 * How readily the buyers a designation reaches can turn to another seller of
 * the goods (`substitutability`, from the sector taxonomy): a buyer that can
 * replace them complies, one that cannot keeps buying and accepts the risk.
 * Averaged over the sector's goods where a measure names none. Calibration
 * unresolved: the taxonomy's figure is a tariff planning value read here as
 * the share of reached sales that is actually diverted.
 */
function diversion(sector, good) {
    const named = good ? tradeSector(good) : undefined;
    if (named)
        return named.substitutability;
    const defs = goodsIn(sector).length > 0 ? goodsIn(sector) : TRADE_SECTORS;
    return defs.reduce((sum, def) => sum + def.substitutability, 0) / defs.length;
}
/**
 * The share of a seller's sales in an economy sector that one named good
 * carries: its share of what the seller sells the United States inside the
 * sector, or an equal split among the sector's goods where nothing is recorded.
 */
function goodShare(seller, sector, good) {
    const defs = goodsIn(sector);
    const recorded = US_GOODS_TRADE[seller]?.imports ?? {};
    const total = defs.reduce((sum, def) => sum + (recorded[def.id] ?? 0), 0);
    if (total > 0)
        return (recorded[good] ?? 0) / total;
    return defs.length > 0 ? 1 / defs.length : 1;
}
/**
 * 0..1 of a seller's sales of one flow a measure stops: the goods it covers
 * (all of the flow, one good's share of the sector, and the designated
 * companies' share of that good), times what it stops of them: the imposer's
 * own purchases, and of everyone else's the reach that buyers actually divert.
 */
function stopsOf(campaign, coercion, sector, good) {
    const named = coercion.sector !== undefined && coercion.good !== undefined;
    const goods = good !== undefined || !named ? 1 : goodShare(coercion.target, sector, coercion.good);
    const toImposer = buyerShareOf(campaign, coercion.target, coercion.imposer, sector);
    const diverted = coercion.financialReach * diversion(sector, good ?? coercion.good);
    return coercion.severity * goods * coercion.covered * (toImposer + diverted * (1 - toImposer));
}
/**
 * 0..1 of a seller's sales in one sector (or of one good in it) the measures
 * on it stop this week. One imposer's measures on the same sales stop them
 * once, at the heaviest; different imposers' measures stop independent shares
 * of what is left. World supply, the seller's own growth and its receipts all
 * read this one figure, so a repeated or overlapping measure cannot charge the
 * same exports twice in one place and once in another.
 */
export function stoppedShare(campaign, seller, sector, good, coercions = coercionsInForce(campaign)) {
    const byImposer = new Map();
    for (const coercion of coercions) {
        if (coercion.target !== seller || !covers(coercion, sector, good))
            continue;
        const stopped = stopsOf(campaign, coercion, sector, good);
        byImposer.set(coercion.imposer, Math.max(byImposer.get(coercion.imposer) ?? 0, stopped));
    }
    return 1 - [...byImposer.values()].reduce((kept, stopped) => kept * (1 - Math.min(1, stopped)), 1);
}
/** The flows a seller's measures are read on: each sector it exports, and any sector a measure names that it sells only to the imposer. */
function flowsOf(campaign, seller, coercions) {
    const listed = selectNation(campaign, seller)?.base.stats.trade.topExports ?? [];
    const named = coercions.flatMap((coercion) => (coercion.sector ? [coercion.sector] : []));
    return [...new Set([...listed, ...named])];
}
/**
 * What the measures in force take of one seller's output in lost sales, flow
 * by flow: each sector's world sales (or, where it sells a sector only to the
 * imposer, that bilateral flow) times the share stopped, and for a measure on
 * its whole trade the goods it sells that imposer outside every listed sector.
 */
function sellerCut(campaign, seller, coercions) {
    const mine = coercions.filter((coercion) => coercion.target === seller && coercion.direction !== "imposer-sales");
    if (mine.length === 0)
        return 0;
    const flows = flowsOf(campaign, seller, mine);
    const inFlows = flows.reduce((sum, sector) => {
        const direct = Math.max(0, ...mine.filter((c) => covers(c, sector)).map((c) => exportShare(campaign, seller, c.imposer, sector)));
        return sum + Math.max(worldExportShare(campaign, seller, sector), direct) * stoppedShare(campaign, seller, sector, undefined, mine);
    }, 0);
    return inFlows + outsideFlows(campaign, seller, mine, flows);
}
/** A whole-trade measure's bite on what the seller sells the imposer outside the flows: one figure per imposer, at its heaviest such measure. */
function outsideFlows(campaign, seller, mine, flows) {
    const heaviest = new Map();
    for (const c of mine)
        if (c.sector === undefined)
            heaviest.set(c.imposer, Math.max(heaviest.get(c.imposer) ?? 0, c.severity * c.covered));
    return [...heaviest].reduce((sum, [imposer, severity]) => {
        const rest = exportShare(campaign, seller, imposer) - flows.reduce((inside, sector) => inside + exportShare(campaign, seller, imposer, sector), 0);
        return sum + Math.max(0, rest) * severity;
    }, 0);
}
/**
 * What an export control takes of its target's output: the inputs it can no
 * longer buy from the imposer, as a share of its own output, for the part it
 * cannot source elsewhere (`1 − substitutability`). The control stops nothing
 * the target sells.
 */
function inputLoss(campaign, coercion) {
    const gdp = selectNation(campaign, coercion.target)?.base.stats.economy.gdp ?? 0;
    const good = coercion.good ? tradeSector(coercion.good) : undefined;
    if (gdp <= 0 || !good)
        return 0;
    const sold = coercion.imposer === campaign.founding.nation ? US_GOODS_TRADE[coercion.target]?.exports[good.id] ?? 0 : 0;
    return coercion.severity * (sold / gdp) * (1 - good.substitutability);
}
/** What one of the administration's measures would take of its target's output, read the way the economy charges it. */
export function measureCut(campaign, measure) {
    if (measure.scope === "listed")
        return 0;
    const coercion = registerCoercion(campaign, measure);
    return coercion.direction === "imposer-sales" ? inputLoss(campaign, coercion) : sellerCut(campaign, measure.target, [coercion]);
}
/**
 * The last day of the year a nation's resting growth was published for
 * (`MACRO_ANCHORS`): the economy the campaign opens on already carries every
 * measure in force by then.
 */
function baselineVintage(nation) {
    const year = MACRO_ANCHORS[nation]?.growth?.year;
    return year === undefined ? undefined : { year, month: 12, day: 31 };
}
const embeddedByRegister = new WeakMap();
/**
 * The register as it stood at a nation's baseline vintage: every
 * administration measure in force on or before that day, unlifted, read on
 * that day so its evasion is the evasion it had then.
 */
function atVintage(campaign, vintage) {
    const measures = Object.fromEntries(Object.entries(campaign.trade.measures)
        .filter(([, m]) => m.origin === "us" && compareDates(m.imposedDate, vintage) <= 0)
        .map(([id, m]) => [id, { ...m, liftedTurn: undefined, liftedDate: undefined }]));
    return { ...campaign, calendar: vintage, trade: { ...campaign.trade, measures }, player: { ...campaign.player, flags: {} } };
}
/**
 * Embedded measures, read for one seller: what the measures in force at its
 * baseline vintage took, which its published resting figures already carry.
 * The economy and the market are charged only the change from it, so a
 * program that was in force when the figure was published costs nothing new,
 * and lifting it lets the economy recover.
 */
function embedded(campaign, nation, key, read) {
    const vintage = baselineVintage(nation);
    if (!vintage)
        return 0;
    let byKey = embeddedByRegister.get(campaign.trade.measures);
    if (!byKey) {
        byKey = new Map();
        embeddedByRegister.set(campaign.trade.measures, byKey);
    }
    const k = `${nation}:${key}`;
    const known = byKey.get(k);
    if (known !== undefined)
        return known;
    const value = read(atVintage(campaign, vintage));
    byKey.set(k, value);
    return value;
}
/** What a seller's measures stopped of one sector or good at its baseline vintage. */
export function embeddedStoppedShare(campaign, seller, sector, good) {
    return embedded(campaign, seller, `stopped:${sector}:${good ?? "*"}`, (past) => stoppedShare(past, seller, sector, good));
}
/** The change since the baseline vintage in what the measures stop of a seller's sales: negative where an embedded program has since been lifted. */
export function newlyStoppedShare(campaign, seller, sector, good) {
    return stoppedShare(campaign, seller, sector, good) - embeddedStoppedShare(campaign, seller, sector, good);
}
/**
 * What the partners' standing answers take off American exports, as a share
 * of US output: for each partner and sector answered, the share of the
 * recorded flow the trade book's own answers leave unsold
 * (`trade-volume.ts#retaliationLeft`), so stacked answers are charged as the
 * book compounds them. The exporters lose the sales and the economy the
 * output; the Treasury, which never held the money, is not charged.
 */
function retaliationCut(campaign) {
    const us = selectNation(campaign, campaign.founding.nation)?.base.stats.economy.gdp ?? 0;
    if (us <= 0)
        return 0;
    const pairs = new Set(Object.values(campaign.trade.measures)
        .filter((measure) => measure.origin === "retaliation" && measure.liftedTurn === undefined)
        .map((measure) => `${measure.target}|${measure.sector}`));
    return [...pairs].reduce((sum, pair) => {
        const [partner, sector] = pair.split("|");
        const def = tradeSector(sector);
        const sold = US_GOODS_TRADE[partner]?.exports[sector] ?? 0;
        return def ? sum + (sold / us) * (1 - retaliationLeft(campaign, partner, def)) : sum;
    }, 0);
}
/**
 * Planning classification: the economy sectors whose goods cannot be built
 * without chips. No opened source gives a semiconductor-use table by industry,
 * so the list is stated rather than derived, and only these sectors' output is
 * charged when chips stop arriving.
 */
export const CHIP_DEPENDENT_SECTORS = ["semiconductors", "telecom-cyber", "auto", "aerospace", "defense-industrial"];
/** The trade sector whose loss constrains output rather than only raising a price. */
const CRITICAL_INPUT = "semiconductors";
/**
 * 0..1 of the chips the United States imports that stop arriving: each
 * supplier's share of the recorded imports, times what its wars and a blockade
 * on station take of its output, net of what buyers can source elsewhere in
 * the short run (the sector's `substitutability`). Recorded imports stand for
 * supply: chips that arrive inside finished goods assembled elsewhere, and
 * the country's own fabs, are not counted, so this is read as a planning value.
 */
export function chipShortfall(campaign) {
    const def = tradeSector(CRITICAL_INPUT);
    const recorded = Object.entries(US_GOODS_TRADE).map(([id, flows]) => [id, flows.imports[CRITICAL_INPUT] ?? 0]);
    const total = recorded.reduce((sum, [, value]) => sum + value, 0);
    if (!def || total <= 0)
        return 0;
    const conflicts = selectActiveConflicts(campaign);
    const lost = recorded.reduce((sum, [supplier, value]) => {
        const kept = (1 - warLossFraction(supplier, conflicts)) * (1 - Math.min(1, blockadeCutOn(campaign, supplier)));
        return sum + (value / total) * (1 - kept);
    }, 0);
    return lost * (1 - def.substitutability);
}
/**
 * What a chip shortfall takes off American output, as a share of it: the
 * shortfall on the output of the sectors that cannot build without chips.
 * A constrained input, not a price: the goods are not made, whatever they
 * would cost.
 */
function criticalInputCut(campaign) {
    const shortfall = chipShortfall(campaign);
    if (shortfall <= 0)
        return 0;
    const sectors = selectNation(campaign, campaign.founding.nation)?.base.sectors ?? [];
    return shortfall * sectors.filter((entry) => CHIP_DEPENDENT_SECTORS.includes(entry.sector)).reduce((sum, entry) => sum + entry.mix, 0);
}
/**
 * What a blockade on station stops of an economy's sales abroad, as a share of
 * its output: everything it ships by sea to anyone, not only to the imposer,
 * because the hulls stop the ships rather than a buyer. Read against the
 * founding figures like `exportShare`, and gone the week the blockade lifts.
 */
function blockadeBite(campaign, nation) {
    const cut = blockadeCutOn(campaign, nation);
    const base = selectNation(campaign, nation)?.base.stats;
    if (cut <= 0 || !base || base.economy.gdp <= 0)
        return 0;
    return Math.min(1, base.trade.exports / base.economy.gdp) * cut;
}
/**
 * What the measures in force take off one economy's growth: a measure costs its
 * target the sales it stops (or, for an export control, the inputs it denies)
 * and costs the imposer what it stops of its own sales to the target. Both
 * sides of every measure, so an embargo is never free for the government that
 * declares it and one declared against the United States reaches the United
 * States. A blockade on the economy is one more measure under the same cap.
 * What was already in force at the economy's baseline vintage is in its
 * resting figures, so only the change from it is charged.
 */
function coercionPressure(campaign, nation) {
    const coercions = coercionsInForce(campaign);
    const home = nation === campaign.founding.nation;
    let bite = blockadeBite(campaign, nation) + (home ? retaliationCut(campaign) + criticalInputCut(campaign) : 0) + sellerCut(campaign, nation, coercions);
    for (const coercion of coercions) {
        if (coercion.target === nation && coercion.direction === "imposer-sales")
            bite += inputLoss(campaign, coercion);
        else if (coercion.imposer === nation && coercion.direction !== "target-sales")
            bite += exportShare(campaign, nation, coercion.target, coercion.sector) * coercion.severity;
    }
    const baseline = embedded(campaign, nation, "cut", (past) => sellerCut(past, nation, coercionsInForce(past)));
    return -Math.min(COERCION_CAP, COERCION_BITE * bite) + Math.min(COERCION_CAP, COERCION_BITE * baseline);
}
/** Partners the United States no longer sells to: an embargo either way ends the exposure with the trade, unless ours bans only their goods. */
function cutOff(campaign, partner) {
    const us = campaign.founding.nation;
    return coercionsInForce(campaign).some((coercion) => coercion.severity >= COERCION_AS_RATE.embargo &&
        ((coercion.imposer === us && coercion.target === partner && coercion.direction === "both") || (coercion.imposer === partner && coercion.target === us)));
}
/**
 * The United States as the hub it is: when a partner runs above or below its
 * own trend, what the United States sells it moves with it. Weighted by US
 * exports to each partner as a share of US output, from the founding's own
 * trade table. The world's other economies feeding each other is a later
 * model's; this is the United States' own exposure.
 */
function partnerExposure(campaign) {
    const us = campaign.founding.nation;
    let exposure = 0;
    for (const partner of Object.keys(US_GOODS_TRADE)) {
        const runtime = selectNation(campaign, partner);
        if (!runtime || partner === us || cutOff(campaign, partner))
            continue;
        const weight = exportShare(campaign, us, partner);
        if (weight <= 0)
            continue;
        const trend = macroBaseline(runtime, NO_CYCLE).growth + restingProgram(campaign, partner)["economy.growth"];
        exposure += weight * PARTNER_ELASTICITY * (runtime.stats.economy.growth - trend);
    }
    return exposure;
}
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000 + 0;
/** What the rest of the world is doing to this economy's targets this week, and what its wars cost it. */
export function externalMacroPressure(campaign, nation) {
    if (!selectNation(campaign, nation))
        return NO_PRESSURE;
    const war = warPressure(campaign, nation);
    const coercion = coercionPressure(campaign, nation);
    const home = nation === campaign.founding.nation;
    const partners = home ? partnerExposure(campaign) : 0;
    const tariff = home ? projectTariffPrices(campaign).thisWeek : 0;
    const shocks = shockPressure(campaign, nation).growth;
    const prices = commodityMacroPressure(campaign, nation);
    return {
        growth: round6(war.growth + coercion + partners + shocks + prices.growth),
        inflation: round6(war.inflation + tariff + prices.inflation),
        outlays: round6(war.outlays),
        ...(prices.growth !== 0 || prices.inflation !== 0 ? { commodities: prices } : {}),
    };
}
