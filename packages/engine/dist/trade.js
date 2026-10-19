import { selectNation, selectRelationship } from "./state.js";
import { tradeSector, TRADE_SECTORS } from "./trade-sectors.js";
import { CUSTOMS_COLLECTION, selectWorkDelivery } from "./executive-work.js";
import { COERCION_AS_RATE, sectorFlow, sectorImports, volumeFall } from "./trade-volume.js";
import { isTradeMeasureEffective } from "./order-authority.js";
import { liftPriceMove } from "./trade-effects.js";
export function foundingTrade() {
    return { measures: {}, retaliation: [], sectorPrice: {} };
}
/**
 * What the United States trades with one partner in one sector.
 *
 * Derived every call rather than stored: the recorded opening, split by the
 * partner's own sector mix (a country with no steel industry does not sell
 * steel) and moved since by the two economies and the measures in force. The
 * reliance reading is this partner's share of everything the country imports
 * in the sector.
 */
export function tradeEdge(campaign, partner, sectorId) {
    const def = tradeSector(sectorId);
    const flow = sectorFlow(campaign, partner, sectorId);
    if (!def || !flow)
        return undefined;
    const everyone = sectorImports(campaign, sectorId);
    return {
        partner,
        sector: sectorId,
        imports: flow.imports,
        exports: flow.exports,
        dependence: everyone > 0 ? round3(flow.imports / everyone) : 0,
        substitutability: def.substitutability,
        tariffRate: currentRate(campaign, partner, sectorId),
        strategic: def.strategic,
    };
}
/** Every sector the US actually trades with one partner, largest import first. */
export function tradeEdgesWith(campaign, partner) {
    return TRADE_SECTORS.map((def) => tradeEdge(campaign, partner, def.id))
        .filter((edge) => edge !== undefined && (edge.imports > 0 || edge.exports > 0))
        .sort((a, b) => b.imports - a.imports);
}
/** Every partner the US buys a sector from, most dependent first. */
export function suppliersOf(campaign, sectorId) {
    return Object.keys(campaign.nations)
        .map((nation) => tradeEdge(campaign, nation, sectorId))
        .filter((edge) => edge !== undefined && edge.imports > 0)
        .sort((a, b) => b.imports - a.imports);
}
/** The rate currently in force on a partner and sector, counting only live measures. */
export function currentRate(campaign, partner, sectorId) {
    return Object.values(campaign.trade.measures)
        .filter((measure) => measure.liftedTurn === undefined &&
        measure.origin === "us" &&
        measure.target === partner &&
        measure.sector === sectorId)
        .reduce((total, measure) => total + measure.rate, 0);
}
// Most of the volume a tariff destroys does not come home. It goes to the next
// cheapest foreign supplier, which is why a country-specific tariff moves the
// map more than it moves the factory.
const DIVERSION_BASE = 0.69;
// What actually reaches a domestic producer, before the input costs that the
// same tariff raises for them.
const DOMESTIC_CAPTURE = 0.31;
// A supplier whose share of a sector's US imports is below this is not where
// diverted orders can go at scale.
const MATERIAL_SUPPLIER_SHARE = 0.01;
const EMPLOYMENT_PER_OUTPUT = 0.35;
const INPUT_COST_EMPLOYMENT_DRAG = 0.55;
/**
 * What a tariff does, all the way through.
 *
 * Deliberately returns the whole distribution rather than a treasury number.
 * The action surface shows who gains, who pays and who may answer, because a
 * single treasury delta was the thing that made a tariff feel free.
 */
export function tariffIncidence(campaign, target, sectorId, rate) {
    const def = tradeSector(sectorId);
    const edge = tradeEdge(campaign, target, sectorId);
    if (!def || !edge)
        return undefined;
    const borderPriceRise = round3(rate * def.borderPassThrough);
    const importFall = volumeFall(def, rate);
    // Net of what Customs actually collects, so the figure the order shows is
    // the figure the books later take in.
    const revenue = round2(edge.imports * (1 - importFall) * rate * customsCollectionShare(campaign));
    const shelfPriceRise = round3(borderPriceRise * def.shelfPassThrough);
    // How much of the destroyed volume goes to another foreign source rather than
    // to a US producer. A sector with many suppliers diverts almost entirely; one
    // where this partner is the only real source cannot divert and has to either
    // pay or do without.
    // Every economy sells the US something, so an alternative is a real source:
    // one that already supplies a material share of what the country imports.
    const alternatives = suppliersOf(campaign, sectorId).filter((other) => other.partner !== target && other.dependence >= MATERIAL_SUPPLIER_SHARE).length;
    const diversionShare = round3(DIVERSION_BASE * Math.min(1, alternatives / 4));
    const domesticGain = round3(importFall * (1 - diversionShare) * DOMESTIC_CAPTURE);
    const inputCostRise = round3(shelfPriceRise * def.inputIntensity);
    // The employment reading is the whole argument about tariffs in one line:
    // protection adds jobs in the protected sector, and the input costs the same
    // tariff creates subtract more of them across the sectors that buy from it.
    const employmentEffect = round3(domesticGain * EMPLOYMENT_PER_OUTPUT - inputCostRise * INPUT_COST_EMPLOYMENT_DRAG * def.inputIntensity);
    const retaliation = retaliationOutlook(campaign, target, rate);
    return {
        sector: def,
        target,
        rate,
        revenue,
        borderPriceRise,
        shelfPriceRise,
        importFall,
        diversionShare,
        domesticGain,
        inputCostRise,
        employmentEffect,
        retaliationChance: retaliation.chance,
        ...(retaliation.sector ? { retaliationTarget: retaliation.sector } : {}),
    };
}
// Roughly half to two thirds of major targeted partners answered a broad
// action in the modern record, and the ones that did covered under a tenth of
// the US export book. Small and alliance-dependent partners absorb, which is
// why capability and alignment both enter here.
const RETALIATION_FLOOR = 0.15;
const RETALIATION_RATE_WEIGHT = 1.2;
function retaliationOutlook(campaign, target, rate) {
    const relationship = selectRelationship(campaign, campaign.founding.nation, target);
    const nation = selectNation(campaign, target);
    if (!relationship || !nation)
        return { chance: 0 };
    // A partner that depends on the US absorbs; one that does not, answers.
    const leverage = 1 - relationship.tradeDependence;
    const hostility = 1 - Math.max(0, relationship.alignment);
    const chance = clamp01(round3(RETALIATION_FLOOR + rate * RETALIATION_RATE_WEIGHT * leverage * (0.5 + hostility * 0.5)));
    return { chance, sector: retaliationTargetFor(campaign, target) };
}
/**
 * What a partner would hit back at.
 *
 * Retaliators pick politically salient US exports rather than economically
 * optimal ones — the record is soybeans, bourbon, orange juice and motorcycles,
 * not the largest line in the book. So salience leads, and the partner has to
 * actually buy the thing.
 */
export function retaliationTargetFor(campaign, partner) {
    return tradeEdgesWith(campaign, partner)
        .filter((edge) => edge.exports > 0)
        .map((edge) => ({ edge, def: tradeSector(edge.sector) }))
        .sort((a, b) => b.def.retaliationSalience * b.edge.exports - a.def.retaliationSalience * a.edge.exports)[0]
        ?.edge.sector;
}
const RETALIATION_LAG_TURNS = 4;
/** How much of the duty owed Customs collects, from 0.6 with no capacity to all of it. */
export function customsCollectionShare(campaign) {
    return 0.6 + 0.4 * selectWorkDelivery(campaign, CUSTOMS_COLLECTION).capacity;
}
/**
 * This week's customs on tariffs the administration still has in force. Annual
 * revenue, one week of it.
 *
 * Duty is charged on the goods that still arrive, and the live edge already
 * carries the fall every tariff in force causes. Charging it through
 * `tariffIncidence` took that fall a second time.
 */
export function selectCustomsReceipts(campaign) {
    const share = customsCollectionShare(campaign);
    let annual = 0;
    for (const measure of Object.values(campaign.trade.measures)) {
        if (measure.kind !== "tariff" || measure.origin !== "us" || measure.liftedTurn !== undefined)
            continue;
        const edge = tradeEdge(campaign, measure.target, measure.sector);
        if (!edge)
            continue;
        annual += edge.imports * measure.rate * share;
    }
    return round2(annual / 52);
}
// Each signature stays separately liftable and retains its own retaliation cause.
function tariffOrderIds(campaign, target, sector) {
    let ordinal = Object.values(campaign.trade.measures).filter((measure) => measure.kind === "tariff" && measure.origin === "us" && measure.target === target && measure.imposedTurn === campaign.turn).length + 1;
    for (;; ordinal += 1) {
        const suffix = ordinal === 1 ? "" : `:${ordinal}`;
        const measure = `tariff:${target}:${sector}:${campaign.turn}${suffix}`;
        const retaliation = `retaliation:${target}:${campaign.turn}${suffix}`;
        if (!campaign.trade.measures[measure] && !campaign.trade.retaliation.some((record) => record.id === retaliation))
            return { measure, retaliation };
    }
}
/**
 * The packet a tariff order is, once its statute's checks have passed.
 *
 * Callers go through `imposeTariff` in `tariff-orders.ts`, which holds the
 * statute's finding, cap and clock. This only prices and writes the order.
 */
export function tariffPacket(campaign, target, sectorId, rate, statute, expiresDate) {
    const def = tradeSector(sectorId);
    if (!def)
        return { ok: false, reason: "No such trade sector." };
    const incidence = tariffIncidence(campaign, target, sectorId, rate);
    if (!incidence) {
        return { ok: false, reason: "The United States does not trade that sector with that partner." };
    }
    const nationName = selectNation(campaign, target)?.base.identity.name ?? String(target);
    const ids = tariffOrderIds(campaign, target, sectorId);
    const effects = [
        {
            kind: "trade",
            measure: {
                id: ids.measure,
                kind: "tariff",
                sector: sectorId,
                target,
                rate,
                imposedTurn: campaign.turn,
                imposedDate: campaign.calendar,
                authority: def.authority,
                statute,
                ...(expiresDate ? { expiresDate } : {}),
                origin: "us",
                actor: campaign.founding.nation,
            },
            priceMove: { sector: sectorId, by: incidence.shelfPriceRise },
            ...(incidence.retaliationChance > 0 && incidence.retaliationTarget
                ? {
                    expect: {
                        id: ids.retaliation,
                        by: target,
                        answering: ids.measure,
                        dueTurn: campaign.turn + RETALIATION_LAG_TURNS,
                        sector: incidence.retaliationTarget,
                        rate: round3(rate * 0.8),
                        landed: false,
                    },
                    chance: incidence.retaliationChance,
                }
                : {}),
        },
        {
            kind: "relationship",
            from: campaign.founding.nation,
            to: target,
            deltas: { tension: round3(rate * 0.3), trust: round3(-rate * 0.2), tradeDependence: round3(-incidence.importFall * 0.4) },
        },
    ];
    return {
        ok: true,
        incidence,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: {
                origin: "decision",
                entities: [target, def.authority],
                systems: ["trade", def.rollup],
                effectiveDate: campaign.calendar,
            },
            narration: {
                summary: `A ${Math.round(rate * 100)}% tariff is imposed on ${def.name.toLowerCase()} from ${nationName}.`,
            },
            effects,
        },
    };
}
const MEASURE_AUTHORITY = {
    sanctions: "INST-OFAC",
    "asset-restriction": "INST-OFAC",
    embargo: "INST-OFAC",
    "export-control": "INST-BIS",
};
/**
 * What a denial package against this partner actually is.
 *
 * A government cannot be export-controlled out of goods it does not buy. Where
 * the partner takes something from the United States that is licensed rather
 * than taxed — semiconductor equipment, critical minerals, defense articles,
 * telecom gear — denying it is an export control and BIS owns the authority.
 * Where it takes nothing of the kind, the same rung is a designation and OFAC
 * owns it.
 */
export function denialMeasureKind(campaign, target) {
    return controlledExportTo(campaign, target) ? "export-control" : "sanctions";
}
function controlledExportTo(campaign, target) {
    return tradeEdgesWith(campaign, target)
        .filter((edge) => {
        const def = tradeSector(edge.sector);
        return edge.exports > 0 && (def?.instrument === "export-control" || def?.instrument === "licensing");
    })
        .sort((a, b) => b.exports - a.exports)[0]?.sector;
}
/** Where a measure that is not a rate bites: what they sell us, or what we license them. */
function measuredSector(campaign, target, kind) {
    if (kind === "export-control")
        return controlledExportTo(campaign, target);
    return tradeEdgesWith(campaign, target).find((edge) => edge.imports > 0)?.sector;
}
/**
 * The register's record of an economic act ordered through the ladder, and the
 * answer the partner schedules against it.
 *
 * Written only for the administration's own acts, because the register is
 * US-centric all the way down: every edge is derived against the founding
 * nation, and the answer `tradePhase` lands charges the President's own book.
 * A measure between two other capitals would be an edge this model cannot
 * compute and a bill nobody in the campaign pays.
 */
export function coerciveMeasureEffect(campaign, actor, target, kind) {
    if (actor !== campaign.founding.nation)
        return undefined;
    const sector = measuredSector(campaign, target, kind);
    if (!sector)
        return undefined;
    const asRate = COERCION_AS_RATE[kind];
    const id = `${kind}:${target}:${campaign.turn}`;
    const answer = retaliationOutlook(campaign, target, asRate);
    return {
        kind: "trade",
        measure: {
            id,
            kind,
            sector,
            target,
            // The register's own contract: a measure that is not a rate carries zero,
            // so a prohibition never stacks against the ceiling a tariff is checked
            // for.
            rate: 0,
            imposedTurn: campaign.turn,
            imposedDate: campaign.calendar,
            authority: MEASURE_AUTHORITY[kind],
            origin: "us",
            actor,
        },
        ...(answer.chance > 0 && answer.sector
            ? {
                expect: {
                    id: `retaliation:${kind}:${target}:${campaign.turn}`,
                    by: target,
                    answering: id,
                    dueTurn: campaign.turn + RETALIATION_LAG_TURNS,
                    sector: answer.sector,
                    rate: round3(asRate * 0.8),
                    landed: false,
                },
                chance: answer.chance,
            }
            : {}),
    };
}
/**
 * A timed suspension of imports, the President's short measure. A standing
 * import embargo, the one the board inherits against Cuba, is lifted as an
 * embargo and thaws the relationship like one.
 */
const isTimedSuspension = (measure) => measure.direction === "imports" && measure.expiresDate !== undefined;
/** A lift says what it lifted. Four of the five kinds are not tariffs. */
function liftSummary(measure, sectorName, nationName) {
    if (isTimedSuspension(measure))
        return `The import suspension on ${nationName} is lifted.`;
    switch (measure.kind) {
        case "tariff":
            return `The tariff on ${sectorName} from ${nationName} is lifted.`;
        case "sanctions":
            return `The sanctions on ${nationName} are lifted, and ${sectorName} moves again.`;
        case "asset-restriction":
            return `The freeze on ${nationName}'s assets is released.`;
        case "export-control":
            return `The export controls on ${sectorName} to ${nationName} are withdrawn.`;
        case "embargo":
            return `The embargo on ${nationName} is lifted.`;
    }
}
/**
 * Lift a measure the administration imposed.
 *
 * No incidence is returned, and the reason is the embargo: cutting a partner
 * off sets the trade dependence the whole edge is derived from to zero, so the
 * measure that is hardest to lift is exactly the one whose incidence can no
 * longer be computed. A lift is a lift; what it undoes is on the record.
 */
export function liftMeasure(campaign, id) {
    const measure = campaign.trade.measures[id];
    if (!measure)
        return { ok: false, reason: "No such measure." };
    if (measure.liftedTurn !== undefined)
        return { ok: false, reason: "That measure is already lifted." };
    if (measure.origin !== "us")
        return { ok: false, reason: "That measure is not this administration's to lift." };
    const def = tradeSector(measure.sector);
    const nationName = selectNation(campaign, measure.target)?.base.identity.name ?? String(measure.target);
    // What comes off the relationship when the measure comes off. A rate says how
    // heavy a tariff was; a prohibition has no rate, so it is weighed by what it
    // was answered as.
    const weight = measure.kind === "tariff" ? measure.rate : COERCION_AS_RATE[measure.kind];
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: {
                origin: "decision",
                // The signature this undoes. A lift with no cause reads on the trail as
                // a tariff appearing from nowhere and vanishing to nowhere.
                ...(measure.causedBy ? { causeIds: [measure.causedBy] } : {}),
                entities: [measure.target],
                systems: ["trade"],
            },
            narration: { summary: liftSummary(measure, def?.name.toLowerCase() ?? measure.sector, nationName) },
            effects: [
                { kind: "trade", lift: id, priceMove: liftPriceMove(measure) },
                ...(isTimedSuspension(measure) ? [] : [{
                        kind: "relationship",
                        from: campaign.founding.nation,
                        to: measure.target,
                        deltas: { tension: -round3(weight * 0.2), trust: round3(weight * 0.15) },
                    }]),
                // The ladder writes a standing embargo as a governance flag and the
                // register writes it as a measure. Lifting one and leaving the other
                // would give the board two answers to whether the trade is cut off.
                ...(measure.kind === "embargo" && measure.direction !== "imports"
                    ? [{ kind: "flag", clear: [`embargo:${campaign.founding.nation}:${measure.target}`] }]
                    : []),
            ],
        },
    };
}
// --- The turn phase --------------------------------------------------------
/**
 * Trade's own week: expected retaliation arrives, and the price deviations
 * carried by each sector feed into the cost of living.
 *
 * Retaliation lands on a schedule rather than instantly, because it did:
 * partners answered a US action between two weeks and three months later, in
 * waves that tracked each escalation rather than as one reply.
 */
export const tradePhase = (state) => {
    const due = state.trade.retaliation.filter((record) => !record.landed && record.dueTurn <= state.turn);
    const packets = [];
    for (const record of due) {
        const def = tradeSector(record.sector);
        const nationName = selectNation(state, record.by)?.base.identity.name ?? String(record.by);
        const edge = tradeEdge(state, record.by, record.sector);
        // What a retaliatory tariff costs is the US exports it lands on, which is
        // the half of a trade war that never appeared in the old model at all.
        const exportLoss = edge ? round2(edge.exports * record.rate * 0.5) : 0;
        packets.push({
            source: "simulate",
            actor: "world",
            turn: state.turn,
            provenance: {
                origin: "world",
                // The tariff being answered. This used to be an empty list — the one
                // place in the engine where a caller knew there was a cause and had no
                // way to say which, so the two halves of a trade war sat on the ledger
                // as unrelated sentences. The record carries it now.
                ...(record.causedBy ? { causeIds: [record.causedBy] } : {}),
                entities: [record.by],
                systems: ["trade"],
            },
            narration: {
                summary: `${nationName} answers with a ${Math.round(record.rate * 100)}% tariff on American ${def?.name.toLowerCase() ?? record.sector}.`,
            },
            effects: [
                {
                    kind: "trade",
                    land: record.id,
                    measure: {
                        id: `retaliation-measure:${record.id}`,
                        kind: "tariff",
                        sector: record.sector,
                        target: record.by,
                        rate: record.rate,
                        imposedTurn: state.turn,
                        imposedDate: state.calendar,
                        authority: "INST-USTR",
                        origin: "retaliation",
                        actor: record.by,
                    },
                },
                { kind: "metric", deltas: { treasury: round2(-exportLoss / 52), standing: -0.008 } },
                {
                    kind: "feed",
                    items: [
                        {
                            turn: state.turn,
                            kind: "press",
                            visibility: "public",
                            headline: `${nationName} retaliates against American ${def?.name.toLowerCase() ?? "exports"}.`,
                            facts: { subject: nationName },
                        },
                    ],
                },
            ],
        });
    }
    return packets;
};
/** Which sectors are carrying a price move, worst first — the cost-of-living read. */
export function selectTradeExposure(campaign) {
    const live = Object.values(campaign.trade.measures).filter((measure) => measure.liftedTurn === undefined
        && isTradeMeasureEffective(campaign, measure.id));
    return TRADE_SECTORS.map((def) => ({
        sector: def,
        priceMove: campaign.trade.sectorPrice[def.id] ?? 0,
        measures: live.filter((measure) => measure.sector === def.id),
    }))
        .filter((exposure) => exposure.priceMove !== 0 || exposure.measures.length > 0)
        .sort((a, b) => Math.abs(b.priceMove) - Math.abs(a.priceMove));
}
/** Everything in force, so a surface never has to filter the record itself. */
export function selectLiveMeasures(campaign) {
    return Object.values(campaign.trade.measures).filter((measure) => measure.liftedTurn === undefined
        && isTradeMeasureEffective(campaign, measure.id));
}
/** What is coming, and from whom. */
export function selectExpectedRetaliation(campaign) {
    return campaign.trade.retaliation.filter((record) => !record.landed);
}
function clamp01(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
function round3(value) {
    return Math.round(value * 1000) / 1000;
}
