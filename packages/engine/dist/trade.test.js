import { imposeTestTariff } from "./__fixtures__/tariff.js";
import { describe, expect, it } from "vitest";
import { currentRate, foundingTrade, selectCustomsReceipts, liftMeasure, retaliationTargetFor, selectExpectedRetaliation, selectLiveMeasures, selectTradeExposure, suppliersOf, tariffIncidence, tradeEdge, tradeEdgesWith } from "./trade.js";
import { tradePhase } from "./trade-phase.js";
import { TRADE_SECTORS, TRADE_SECTOR_IDS, downstreamOf, tradeSector, tradeSectorsFor } from "./trade-sectors.js";
import { SECTOR_IDS } from "@admin/world";
import { apply } from "./effects.js";
import { selectRevenue } from "./fiscal.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { landRung } from "./__fixtures__/ladder.js";
import { candidateTargetsForBalance, foundedForBalance } from "./balance-harness.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { advanceTurn } from "./turn-loop.js";
import { createRngStreams } from "./rng.js";
import { externalMacroPressure } from "./external-pressure.js";
import { retaliationFall } from "./trade-volume.js";
const PARTNER = "ALP";
// The fixture nations make textiles and run utilities. Trading a sector they
// have no industry in would make every assertion below a silent no-op.
const TRADED = "textiles-apparel";
function tradingCampaign() {
    return buildCampaign();
}
describe("the sector taxonomy", () => {
    it("refines the dataset's sectors rather than forking them", () => {
        // A second sector system beside the world's own is exactly what the
        // mission forbids: everything that reads employment or mix keeps reading
        // SectorId, and only trade reads this.
        const known = new Set(SECTOR_IDS);
        for (const sector of TRADE_SECTORS) {
            expect(known.has(sector.rollup), `${sector.id} rolls into unknown ${sector.rollup}`).toBe(true);
        }
    });
    it("is a manageable taxonomy, not a tariff schedule", () => {
        expect(TRADE_SECTORS.length).toBeGreaterThanOrEqual(15);
        expect(TRADE_SECTORS.length).toBeLessThanOrEqual(30);
        expect(new Set(TRADE_SECTOR_IDS).size).toBe(TRADE_SECTOR_IDS.length);
    });
    it("keeps border and shelf pass-through as two different quantities", () => {
        // Conflating them is the single most common modeling error available. The
        // border figure is near-complete for every sector; the shelf figure is a
        // share of that rise and is far below it for all but the handful of goods
        // whose retail price tracks the wholesale one within weeks. Refined fuel is
        // the honest exception and is not smoothed away to make a rule tidy.
        for (const sector of TRADE_SECTORS) {
            expect(sector.borderPassThrough).toBeGreaterThan(0.5);
            expect(sector.borderPassThrough).toBeLessThanOrEqual(1);
            expect(sector.shelfPassThrough).toBeGreaterThanOrEqual(0);
            expect(sector.shelfPassThrough).toBeLessThanOrEqual(1);
        }
        const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
        expect(median(TRADE_SECTORS.map((sector) => sector.shelfPassThrough))).toBeLessThan(median(TRADE_SECTORS.map((sector) => sector.borderPassThrough)) / 2);
        // The four goods whose retail price tracks the wholesale one closely: fuel
        // at the pump within weeks, gas on the bill within a season, and apparel,
        // which is the largest consumer-price transmission by volume in the record.
        // Any fifth entry appearing here is a calibration slip, not a discovery.
        const tracksWholesale = TRADE_SECTORS.filter((sector) => sector.shelfPassThrough > sector.borderPassThrough / 2).map((sector) => sector.id);
        expect(tracksWholesale).toEqual([
            "energy-crude",
            "energy-refined",
            "energy-gas-lng",
            "textiles-apparel",
        ]);
    });
    it("does not cargo-cult one elasticity across every sector", () => {
        const passThroughs = new Set(TRADE_SECTORS.map((sector) => sector.borderPassThrough));
        expect(passThroughs.size).toBeGreaterThan(1);
        // Steel is the documented exception where foreign exporters actually cut
        // their own price, so it absorbs more than a differentiated manufacture.
        expect(tradeSector("steel").borderPassThrough).toBeLessThan(tradeSector("autos-light-vehicles").borderPassThrough);
        // Commodities absorb more than differentiated goods, for the United States
        // specifically, because it is a large enough buyer to move a world price.
        expect(tradeSector("agriculture-row-crops").borderPassThrough).toBeLessThan(tradeSector("semiconductors").borderPassThrough);
    });
    it("names an institution for every sector's authority", () => {
        for (const sector of TRADE_SECTORS) {
            expect(sector.authority.startsWith("INST-"), `${sector.id} has no institution`).toBe(true);
        }
    });
    it("knows which sectors a tariff is simply not the instrument for", () => {
        expect(tradeSector("defense-articles").instrument).toBe("licensing");
        expect(tradeSector("critical-minerals").instrument).toBe("export-control");
        expect(tradeSector("semiconductor-equipment").instrument).toBe("export-control");
    });
    it("groups several trade sectors under one dataset sector", () => {
        expect(tradeSectorsFor("agriculture").length).toBeGreaterThan(1);
        expect(tradeSectorsFor("auto").map((sector) => sector.id)).toContain("auto-parts");
    });
    it("says a high-input sector reaches downstream and a shelf good does not", () => {
        expect(downstreamOf("steel").length).toBeGreaterThan(0);
        expect(downstreamOf("textiles-apparel")).toHaveLength(0);
    });
});
describe("edges are derived, not stored", () => {
    it("carries no edges in the save at all", () => {
        const trade = foundingTrade();
        expect(Object.keys(trade.measures)).toHaveLength(0);
        expect(trade.retaliation).toHaveLength(0);
        expect(Object.keys(trade.sectorPrice)).toHaveLength(0);
    });
    it("refuses to trade a nation with itself", () => {
        const campaign = tradingCampaign();
        expect(tradeEdge(campaign, campaign.founding.nation, TRADED)).toBeUndefined();
    });
    it("returns only edges with real volume on one side", () => {
        const campaign = tradingCampaign();
        for (const edge of tradeEdgesWith(campaign, PARTNER)) {
            expect(edge.imports > 0 || edge.exports > 0).toBe(true);
        }
    });
    it("reads the same edge the same way twice", () => {
        const campaign = tradingCampaign();
        expect(tradeEdge(campaign, PARTNER, TRADED)).toEqual(tradeEdge(campaign, PARTNER, TRADED));
    });
});
describe("a tariff is no longer treasury plus a relationship knock", () => {
    it("produces a whole incidence, not a single number", () => {
        const campaign = tradingCampaign();
        const incidence = tariffIncidence(campaign, PARTNER, TRADED, 0.25);
        expect(incidence).toBeDefined();
        if (!incidence)
            return;
        // Every one of these is a channel the old rung had none of.
        expect(incidence.revenue).toBeGreaterThan(0);
        expect(incidence.borderPriceRise).toBeGreaterThan(0);
        expect(incidence.importFall).toBeGreaterThan(0);
        expect(incidence.shelfPriceRise).toBeGreaterThan(0);
        expect(incidence.diversionShare).toBeGreaterThanOrEqual(0);
        expect(incidence.retaliationChance).toBeGreaterThan(0);
    });
    it("prices the answer's odds on the export flow the answer would cut, at the trade book's own response", () => {
        const campaign = tradingCampaign();
        const incidence = tariffIncidence(campaign, PARTNER, TRADED, 0.25);
        expect(incidence.retaliationTarget).toBeDefined();
        expect(incidence.retaliationCut).toBe(retaliationFall(tradeSector(incidence.retaliationTarget), 0.2));
        const larger = tariffIncidence(campaign, PARTNER, TRADED, 0.5);
        expect(larger.retaliationCut).toBeGreaterThan(incidence.retaliationCut);
        expect(larger.retaliationChance).toBeGreaterThan(incidence.retaliationChance);
    });
    it("answers on salient goods its buyers can replace, as China answered on soybeans, not on aircraft", () => {
        const { campaign } = foundedForBalance("trade-retaliation-target");
        expect(retaliationTargetFor(campaign, "CHN")).toBe("agriculture-row-crops");
    });
    it("charges a bigger rate more of everything", () => {
        const campaign = tradingCampaign();
        const small = tariffIncidence(campaign, PARTNER, TRADED, 0.1);
        const large = tariffIncidence(campaign, PARTNER, TRADED, 0.4);
        if (!small || !large)
            return;
        expect(large.borderPriceRise).toBeGreaterThan(small.borderPriceRise);
        expect(large.importFall).toBeGreaterThan(small.importFall);
        expect(large.retaliationChance).toBeGreaterThan(small.retaliationChance);
    });
    it("does not let revenue rise without limit, because the volume goes away", () => {
        const campaign = tradingCampaign();
        // The whole point of an import response: at a total ban there is nothing
        // left to collect a duty on.
        const ban = tariffIncidence(campaign, PARTNER, TRADED, 1);
        const quarter = tariffIncidence(campaign, PARTNER, TRADED, 0.25);
        if (!ban || !quarter)
            return;
        expect(ban.importFall).toBeGreaterThan(quarter.importFall);
        expect(ban.revenue / ban.rate).toBeLessThan(quarter.revenue / quarter.rate);
    });
    it("charges the country imposing it, not only the country targeted", () => {
        const campaign = tradingCampaign();
        const incidence = tariffIncidence(campaign, PARTNER, TRADED, 0.3);
        if (!incidence)
            return;
        // A US shelf price rises and US input costs rise. Before this a tariff was
        // free at home, which is the reason it was always the right move.
        expect(incidence.shelfPriceRise).toBeGreaterThan(0);
        expect(incidence.inputCostRise).toBeGreaterThan(0);
    });
    it("sends most of the lost volume abroad rather than home", () => {
        const campaign = tradingCampaign();
        const incidence = tariffIncidence(campaign, PARTNER, TRADED, 0.3);
        if (!incidence)
            return;
        // A country-specific tariff moves the map more than it moves the factory.
        expect(incidence.domesticGain).toBeLessThan(incidence.importFall);
    });
    it("can leave employment worse off than the protection it bought", () => {
        // The whole argument about tariffs in one reading: protection adds jobs in
        // the protected sector and input costs subtract more across the sectors
        // that buy from it. The net must be able to go the wrong way, or the
        // decision has only one side.
        const campaign = tradingCampaign();
        const incidence = tariffIncidence(campaign, PARTNER, TRADED, 0.5);
        if (!incidence)
            return;
        expect(incidence.employmentEffect).toBeLessThan(incidence.domesticGain);
    });
});
describe("imposing one", () => {
    it("refuses a sector a tariff is not the instrument for, and says what is", () => {
        const campaign = tradingCampaign();
        const result = imposeTestTariff(campaign, PARTNER, "critical-minerals", 0.2);
        expect(result.ok).toBe(false);
        if (result.ok)
            return;
        expect(result.reason).toContain("export control");
    });
    it("refuses a rate outside the statute's reach", () => {
        const campaign = tradingCampaign();
        expect(imposeTestTariff(campaign, PARTNER, TRADED, 0).ok).toBe(false);
        expect(imposeTestTariff(campaign, PARTNER, TRADED, 1.5).ok).toBe(false);
        expect(imposeTestTariff(campaign, PARTNER, TRADED, Number.NaN).ok).toBe(false);
        expect(imposeTestTariff(campaign, PARTNER, TRADED, Number.POSITIVE_INFINITY).ok).toBe(false);
    });
    it("refuses to stack past a total ban, unlike the rung it replaces", () => {
        const campaign = tradingCampaign();
        const first = imposeTestTariff(campaign, PARTNER, TRADED, 0.8);
        if (!first.ok)
            return;
        const after = apply(campaign, first.packet);
        expect(imposeTestTariff(after, PARTNER, TRADED, 0.5).ok).toBe(false);
    });
    it("records the rate in force so a second measure reads the first", () => {
        const campaign = tradingCampaign();
        const result = imposeTestTariff(campaign, PARTNER, TRADED, 0.25);
        if (!result.ok)
            return;
        const after = apply(campaign, result.packet);
        expect(currentRate(after, PARTNER, TRADED)).toBeCloseTo(0.25, 5);
        expect(selectLiveMeasures(after)).toHaveLength(1);
    });
    it("keeps repeated same-turn orders distinct, additive, traceable and individually liftable", () => {
        const campaign = tradingCampaign();
        const first = imposeTestTariff(campaign, PARTNER, TRADED, 0.25);
        expect(first.ok).toBe(true);
        if (!first.ok)
            return;
        const afterFirst = apply(campaign, first.packet);
        const second = imposeTestTariff(afterFirst, PARTNER, TRADED, 0.15);
        expect(second.ok).toBe(true);
        if (!second.ok)
            return;
        const afterSecond = apply(afterFirst, second.packet);
        expect(currentRate(afterSecond, PARTNER, TRADED)).toBeCloseTo(0.4, 6);
        const measures = selectLiveMeasures(afterSecond);
        expect(measures).toHaveLength(2);
        expect(new Set(measures.map((measure) => measure.id)).size).toBe(2);
        expect(afterSecond.player.metrics.treasury).toBe(campaign.player.metrics.treasury);
        expect(selectCustomsReceipts(afterSecond)).toBeGreaterThan(0);
        const firstEffect = first.packet.effects.find((effect) => effect.kind === "trade");
        const secondEffect = second.packet.effects.find((effect) => effect.kind === "trade");
        expect(firstEffect?.kind).toBe("trade");
        expect(secondEffect?.kind).toBe("trade");
        if (firstEffect?.kind !== "trade" || secondEffect?.kind !== "trade")
            return;
        expect(secondEffect.measure?.id).not.toBe(firstEffect.measure?.id);
        expect(secondEffect.expect?.id).not.toBe(firstEffect.expect?.id);
        expect(secondEffect.expect?.answering).toBe(secondEffect.measure?.id);
        expect(imposeTestTariff(afterFirst, PARTNER, TRADED, 0.15)).toEqual(second);
        const lift = liftMeasure(afterSecond, measures[0].id);
        expect(lift.ok).toBe(true);
        if (!lift.ok)
            return;
        expect(currentRate(apply(afterSecond, lift.packet), PARTNER, TRADED)).toBeCloseTo(0.15, 6);
    });
    it("moves state only through apply()", () => {
        const campaign = tradingCampaign();
        const result = imposeTestTariff(campaign, PARTNER, TRADED, 0.25);
        if (!result.ok)
            return;
        expect(Object.keys(campaign.trade.measures)).toHaveLength(0);
        expect(Object.keys(apply(campaign, result.packet).trade.measures)).toHaveLength(1);
    });
    it("stamps its provenance with the trade system and the target", () => {
        const campaign = tradingCampaign();
        const result = imposeTestTariff(campaign, PARTNER, TRADED, 0.25);
        if (!result.ok)
            return;
        const after = apply(campaign, result.packet);
        const entry = after.ledger[after.ledger.length - 1];
        expect(entry.causal?.systems).toContain("trade");
        expect(entry.causal?.entities).toContain(PARTNER);
    });
    it("raises the sector's own price, which the cost-of-living read shows", () => {
        const campaign = tradingCampaign();
        const result = imposeTestTariff(campaign, PARTNER, TRADED, 0.3);
        if (!result.ok)
            return;
        const after = apply(campaign, result.packet);
        const exposure = selectTradeExposure(after);
        expect(exposure.length).toBeGreaterThan(0);
        expect(exposure[0].priceMove).toBeGreaterThan(0);
    });
    it("gives the price back when the measure is lifted", () => {
        const campaign = tradingCampaign();
        const imposed = imposeTestTariff(campaign, PARTNER, TRADED, 0.3);
        if (!imposed.ok)
            return;
        const after = apply(campaign, imposed.packet);
        const id = Object.keys(after.trade.measures)[0];
        const lifted = liftMeasure(after, id);
        if (!lifted.ok)
            return;
        const settled = apply(after, lifted.packet);
        expect(settled.trade.sectorPrice[TRADED] ?? 0).toBe(0);
        expect(selectLiveMeasures(settled)).toHaveLength(0);
    });
    it("refuses to lift a measure the administration did not impose", () => {
        expect(liftMeasure(tradingCampaign(), "no-such-measure").ok).toBe(false);
    });
    it("collects less duty when the agency that collects it is hollow", () => {
        const campaign = tradingCampaign();
        const hollow = {
            ...campaign,
            institutions: Object.fromEntries(Object.entries(campaign.institutions).map(([id, runtime]) => [
                id,
                { ...runtime, implementationQuality: 0.05 },
            ])),
        };
        const healthy = imposeTestTariff(campaign, PARTNER, TRADED, 0.3);
        const broken = imposeTestTariff(hollow, PARTNER, TRADED, 0.3);
        if (!healthy.ok || !broken.ok)
            return;
        // The duty is the general fund's, so a hollow Commerce shows up as a
        // smaller tariff line in the national take, not in the President's account.
        const tariffOf = (start, packet) => selectRevenue(apply(start, packet)).tariff;
        expect(tariffOf(hollow, broken.packet)).toBeLessThan(tariffOf(campaign, healthy.packet));
    });
    it("collects duty every week a tariff stands, and stops when it is lifted", () => {
        const campaign = tradingCampaign();
        const result = imposeTestTariff(campaign, PARTNER, TRADED, 0.3);
        if (!result.ok)
            return;
        const signed = apply(campaign, result.packet);
        const debtOf = (c) => c.nations[c.founding.nation].stats.economy.debt;
        expect(debtOf(signed)).toBe(debtOf(campaign));
        expect(selectCustomsReceipts(signed)).toBeGreaterThan(0);
        // Each revenue line is rounded to a whole number, so the difference of two
        // of them can sit up to one away from the unrounded year of duty.
        const lineMoved = selectRevenue(signed).tariff - selectRevenue(campaign).tariff;
        expect(Math.abs(lineMoved - selectCustomsReceipts(signed) * 52)).toBeLessThanOrEqual(1);
        const again = tradePhase(signed).reduce(apply, signed);
        const lifted = liftMeasure(again, Object.keys(again.trade.measures)[0]);
        if (!lifted.ok)
            return;
        const gone = apply(again, lifted.packet);
        expect(selectCustomsReceipts(gone)).toBe(0);
        expect(selectRevenue(gone).tariff).toBeCloseTo(selectRevenue(campaign).tariff, 0);
        expect(tradePhase(gone).some((packet) => packet.effects.some((effect) => effect.kind === "nationStat"))).toBe(false);
    });
});
describe("the other half of a trade war", () => {
    it("picks a politically salient export rather than the largest line", () => {
        const campaign = tradingCampaign();
        const target = retaliationTargetFor(campaign, PARTNER);
        if (!target)
            return;
        // Retaliators pick what hurts a constituency: soybeans, bourbon, orange
        // juice, motorcycles. Salience is what orders the choice.
        expect(tradeSector(target).retaliationSalience).toBeGreaterThan(0.2);
    });
    it("does not answer in the same week the tariff was signed", () => {
        const campaign = tradingCampaign();
        const result = imposeTestTariff(campaign, PARTNER, TRADED, 0.6);
        if (!result.ok)
            return;
        const packets = tradePhase(apply(campaign, result.packet));
        expect(packets.some((packet) => packet.effects.some((effect) => effect.kind === "trade"))).toBe(false);
    });
    it("answers on a lag, and the answer costs the United States", () => {
        const campaign = tradingCampaign();
        const result = imposeTestTariff(campaign, PARTNER, TRADED, 0.9);
        if (!result.ok)
            return;
        let after = apply(campaign, result.packet);
        const expected = selectExpectedRetaliation(after);
        if (expected.length === 0)
            return; // this partner absorbs; that is a legal outcome
        expect(expected[0].dueTurn).toBeGreaterThan(campaign.turn);
        after = { ...after, turn: expected[0].dueTurn };
        const packets = tradePhase(after);
        expect(packets.length).toBeGreaterThan(0);
        const landed = packets.reduce((state, packet) => apply(state, packet), after);
        expect(selectExpectedRetaliation(landed)).toHaveLength(0);
        expect(landed.player.metrics.standing).toBeLessThan(after.player.metrics.standing);
    });
    it("names who imposed every measure on the register: the United States for its own, the answering capital for a reply", () => {
        const { campaign } = foundedForBalance("trade-actor");
        const partner = "SAU";
        const signed = TRADE_SECTORS.filter((def) => def.instrument === "tariff")
            .map((def) => imposeTestTariff(campaign, partner, def.id, 0.25))
            .flatMap((result) => (result.ok ? [apply(campaign, result.packet)] : []))
            .find((state) => selectExpectedRetaliation(state).length > 0);
        expect(signed).toBeDefined();
        const ours = Object.values(signed.trade.measures).filter((measure) => !(measure.id in campaign.trade.measures));
        expect(ours.map((measure) => [measure.origin, measure.actor])).toEqual([["us", campaign.founding.nation]]);
        const due = { ...signed, turn: selectExpectedRetaliation(signed)[0].dueTurn };
        const landed = tradePhase(due).reduce(apply, due);
        const reply = Object.values(landed.trade.measures).find((measure) => measure.origin === "retaliation");
        expect(reply?.actor).toBe(partner);
        const denial = landRung(campaign, campaign.founding.nation, partner, "economic", 3, createRngStreams(campaign.seed));
        expect(denial.ok).toBe(true);
        if (!denial.ok)
            return;
        const registered = Object.values(apply(campaign, denial.packet).trade.measures);
        expect(registered.length).toBeGreaterThan(0);
        for (const measure of registered)
            expect(measure.actor).toBe(campaign.founding.nation);
    });
    it("settles whether a partner answers when the tariff is signed, not on every read", () => {
        // A chance re-rolled on read would let a player scrub for a favorable one.
        const campaign = tradingCampaign();
        const result = imposeTestTariff(campaign, PARTNER, TRADED, 0.5);
        if (!result.ok)
            return;
        expect(apply(campaign, result.packet).trade.retaliation.length).toBe(apply(campaign, result.packet).trade.retaliation.length);
    });
    it("is likelier from a partner that does not depend on the United States", () => {
        const campaign = tradingCampaign();
        const key = `${campaign.founding.nation}:${PARTNER}`;
        const relationship = campaign.relationships[key];
        if (!relationship)
            return;
        const dependent = {
            ...campaign,
            relationships: { ...campaign.relationships, [key]: { ...relationship, tradeDependence: 0.95 } },
        };
        const independent = {
            ...campaign,
            relationships: { ...campaign.relationships, [key]: { ...relationship, tradeDependence: 0.1 } },
        };
        const a = tariffIncidence(dependent, PARTNER, TRADED, 0.4);
        const b = tariffIncidence(independent, PARTNER, TRADED, 0.4);
        if (!a || !b)
            return;
        expect(b.retaliationChance).toBeGreaterThan(a.retaliationChance);
    });
});
describe("suppliers", () => {
    it("lists who the United States buys a sector from, largest first", () => {
        const suppliers = suppliersOf(tradingCampaign(), TRADED);
        for (let i = 1; i < suppliers.length; i += 1) {
            expect(suppliers[i - 1].imports).toBeGreaterThanOrEqual(suppliers[i].imports);
        }
    });
    it("never lists the United States as its own supplier", () => {
        const campaign = tradingCampaign();
        for (const edge of suppliersOf(campaign, TRADED)) {
            expect(edge.partner).not.toBe(campaign.founding.nation);
        }
    });
});
// The ladder and the register used to be two disjoint accounts of the same
// acts. A ten percent tariff on one sector, ordered through a country file,
// scheduled a dated and cause-linked answer four weeks out; a full embargo,
// ordered through the ladder, was answered by nobody. So the President's
// heaviest economic act had no consequence and a routine one did.
describe("the economic ladder writes into the trade register", () => {
    function embargoable(campaign, streams) {
        for (const target of candidateTargetsForBalance(campaign)) {
            const result = landRung(campaign, campaign.founding.nation, target, "economic", 5, streams);
            if (result.ok)
                return { target, packet: result.packet };
        }
        return undefined;
    }
    it("answers an embargo with a dated reply that names the embargo", () => {
        const { campaign: founded, charter } = foundedForBalance("ladder-embargo");
        const phases = campaignTurnPhases(charter);
        const attempt = embargoable(founded, createRngStreams(founded.seed));
        expect(attempt, "no partner on the founded board could be embargoed").toBeDefined();
        if (!attempt)
            return;
        const signed = apply(founded, attempt.packet);
        // The board may open with an inherited embargo; the one under test is the rung's own.
        const measure = selectLiveMeasures(signed).find((m) => m.kind === "embargo" && !m.id.endsWith(":inherited"));
        expect(measure, "the embargo rung recorded no measure").toBeDefined();
        if (!measure)
            return;
        expect(measure.target).toBe(attempt.target);
        // Not a rate: a prohibition never stacks against the ceiling a tariff is
        // checked for.
        expect(measure.rate).toBe(0);
        const signature = signed.ledger.filter((entry) => entry.causal !== undefined).at(-1);
        expect(measure.causedBy).toBe(signature.causal.eventId);
        const expected = selectExpectedRetaliation(signed).filter((record) => record.answering === measure.id);
        expect(expected.length, "an embargo of a major partner drew no expected answer").toBeGreaterThan(0);
        let working = signed;
        const due = Math.max(...expected.map((record) => record.dueTurn));
        while (working.turn <= due)
            working = advanceTurn(working, phases);
        const answers = working.ledger.filter((entry) => (entry.causal?.causeIds ?? []).includes(signature.causal.eventId));
        expect(answers.length, "the embargo was never answered").toBeGreaterThan(0);
        expect(selectExpectedRetaliation(working).some((record) => record.answering === measure.id)).toBe(false);
    });
    it("records a denial package as the thing the partner actually buys", () => {
        const { campaign: founded } = foundedForBalance("ladder-denial");
        const streams = createRngStreams(founded.seed);
        const kinds = new Set();
        for (const target of candidateTargetsForBalance(founded)) {
            for (const rung of [3, 4]) {
                const result = landRung(founded, founded.founding.nation, target, "economic", rung, streams);
                if (!result.ok)
                    continue;
                for (const measure of selectLiveMeasures(apply(founded, result.packet)))
                    kinds.add(measure.kind);
            }
        }
        // Sanctions and asset restrictions are what rungs 3 and 4 are; an export
        // control appears wherever the partner buys something licensed rather than
        // taxed, which is the one place the vocabulary was dead before.
        expect(kinds.has("sanctions") || kinds.has("export-control")).toBe(true);
        expect(kinds.has("asset-restriction")).toBe(true);
    });
});
describe("a partner's answer costs the exporters, not the Treasury", () => {
    const { campaign } = foundedForBalance("trade-retaliation-output");
    const partner = "SAU";
    const signed = TRADE_SECTORS.filter((def) => def.instrument === "tariff")
        .map((def) => imposeTestTariff(campaign, partner, def.id, 0.25))
        .flatMap((result) => (result.ok ? [apply(campaign, result.packet)] : []))
        .find((state) => selectExpectedRetaliation(state).length > 0);
    const due = { ...signed, turn: selectExpectedRetaliation(signed)[0].dueTurn };
    it("lands the answer with no charge to the Treasury", () => {
        const packets = tradePhase(due);
        expect(packets.length).toBeGreaterThan(0);
        for (const packet of packets) {
            for (const effect of packet.effects)
                if (effect.kind === "metric")
                    expect(effect.deltas.treasury ?? 0).toBe(0);
        }
    });
    it("lowers where US growth is headed for as long as the answer stands, and not after it is lifted", () => {
        const landed = tradePhase(due).reduce(apply, due);
        const reply = Object.values(landed.trade.measures).find((measure) => measure.origin === "retaliation");
        const growth = (state) => externalMacroPressure(state, state.founding.nation).growth;
        expect(growth(landed)).toBeLessThan(growth(due));
        const lifted = { ...landed, trade: { ...landed.trade, measures: { ...landed.trade.measures, [reply.id]: { ...reply, liftedTurn: landed.turn } } } };
        expect(growth(lifted)).toBeCloseTo(growth(due), 9);
    });
});
