import { addDays, compareDates } from "./clock.js";
import { apply } from "./effects.js";
import { TRADE_SECTORS, tradeSector } from "./trade-sectors.js";
import { currentEventId } from "./causality.js";
import { TARIFF_STATUTES } from "./tariff-statutes.js";
/**
 * Whether an expected retaliation is actually queued.
 *
 * Seeded by the measure it answers rather than by a stream, so the same
 * campaign replays the same trade war. A roll here rather than at read time is
 * deliberate: whether a partner will answer is settled when the tariff is
 * signed, and a chance that was re-rolled every time a screen asked would let
 * a player scrub for a favorable one.
 */
function willRetaliate(record, chance) {
    let hash = 2166136261;
    for (const char of record.id) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 1000) / 1000 < chance;
}
export function applyTrade(state, effect) {
    let measures = state.trade.measures;
    let retaliation = state.trade.retaliation;
    let sectorPrice = state.trade.sectorPrice;
    let findings = state.trade.findings;
    if (effect.finding) {
        const event = currentEventId();
        const finding = effect.finding.causedBy === undefined && event !== undefined ? { ...effect.finding, causedBy: event } : effect.finding;
        findings = { ...findings, [finding.id]: finding };
    }
    if (effect.measure) {
        // Stamped here rather than by the caller: the id of the event a measure
        // was imposed by is only knowable inside the fold. An explicitly-supplied
        // one wins, so a migration or a test can pin it.
        const event = currentEventId();
        const measure = effect.measure.causedBy === undefined && event !== undefined
            ? { ...effect.measure, causedBy: event }
            : effect.measure;
        measures = { ...measures, [measure.id]: measure };
    }
    if (effect.lift) {
        const existing = measures[effect.lift];
        if (existing && existing.liftedTurn === undefined) {
            measures = { ...measures, [effect.lift]: { ...existing, liftedTurn: state.turn } };
        }
    }
    if (effect.expect && effect.chance !== undefined && willRetaliate(effect.expect, effect.chance)) {
        // The answer remembers what it is answering. Without this the retaliation
        // phase — which runs weeks later and holds only this record — has nothing
        // to name, which is why it used to stamp an empty `causeIds` and produce a
        // trade war whose two halves sat on the ledger as unrelated sentences.
        const event = currentEventId();
        retaliation = [
            ...retaliation,
            effect.expect.causedBy === undefined && event !== undefined
                ? { ...effect.expect, causedBy: event }
                : effect.expect,
        ];
    }
    if (effect.land) {
        retaliation = retaliation.map((record) => record.id === effect.land ? { ...record, landed: true } : record);
    }
    if (effect.priceMove) {
        const { sector, by } = effect.priceMove;
        const next = Math.round(((sectorPrice[sector] ?? 0) + by) * 1000) / 1000;
        // A price that has come all the way back is dropped rather than stored as
        // zero, so a save does not accumulate one key per sector ever touched.
        if (next === 0) {
            const { [sector]: _settled, ...rest } = sectorPrice;
            sectorPrice = rest;
        }
        else {
            sectorPrice = { ...sectorPrice, [sector]: next };
        }
    }
    if (measures === state.trade.measures &&
        retaliation === state.trade.retaliation &&
        sectorPrice === state.trade.sectorPrice &&
        findings === state.trade.findings) {
        return state;
    }
    return { ...state, trade: { ...state.trade, measures, retaliation, sectorPrice, ...(findings ? { findings } : {}) } };
}
/** A declared duration starts when signed, never when a briefing was cast. */
export function temporaryImportSuspension(campaign, target, days) {
    if (!Number.isInteger(days) || days < 1 || days > 365)
        throw new Error("Invalid import suspension duration");
    return [{ kind: "trade", measure: {
                id: `import-suspension:${target}:${campaign.ledger.length}`, kind: "embargo", direction: "imports",
                target, sector: TRADE_SECTORS[0].id, rate: 0, origin: "us", actor: campaign.founding.nation,
                imposedTurn: campaign.turn, imposedDate: campaign.calendar, expiresDate: addDays(campaign.calendar, days), authority: "INST-USTR",
            } }];
}
function lapseSummary(measure, name) {
    if (measure.statute === "s122")
        return `The ${TARIFF_STATUTES.s122.name} tariff on ${name} ends after 150 days. Only Congress can extend it.`;
    if (measure.statute)
        return `The ${TARIFF_STATUTES[measure.statute].name} tariff on ${name} reaches the end of its term.`;
    return `The timed ${measure.direction === "imports" ? "import suspension" : measure.kind} on ${name} expires. Other restrictions remain in force.`;
}
/**
 * What comes off a sector's price when a measure ends. A lift and an expiry
 * both use it, because a tariff that lapses on its clock leaves the shelf the
 * same way one the President lifts does.
 */
export function liftPriceMove(measure) {
    const def = tradeSector(measure.sector);
    // Rounded in the same two steps tariffIncidence uses on the way in, so a
    // lapsed line returns the shelf exactly to where it stood.
    const border = round3(measure.rate * (def?.borderPassThrough ?? 1));
    return { sector: measure.sector, by: -round3(border * (def?.shelfPassThrough ?? 0)) };
}
function round3(value) {
    return Math.round(value * 1000) / 1000;
}
export function expireTradeMeasures(campaign) {
    let working = campaign;
    for (const measure of Object.values(campaign.trade.measures)) {
        if (!measure.expiresDate || measure.liftedTurn !== undefined || compareDates(campaign.calendar, measure.expiresDate) < 0)
            continue;
        const name = campaign.nations[measure.target]?.base.identity.name ?? measure.target;
        const summary = lapseSummary(measure, name);
        const packet = { source: "simulate", actor: "world", turn: campaign.turn,
            narration: { summary }, provenance: { origin: "scheduled", causeIds: measure.causedBy ? [measure.causedBy] : [], entities: [measure.target], systems: ["trade"], effectiveDate: campaign.calendar },
            effects: [{ kind: "trade", lift: measure.id, priceMove: liftPriceMove(measure) }, { kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", headline: summary, date: campaign.calendar }] }],
        };
        working = apply(working, packet);
    }
    return working;
}
