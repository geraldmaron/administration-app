import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, worldDataset } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { actionTiming } from "./action-timing.js";
import { directableKinds, issueDirective } from "./directives.js";
import { draftCabinetCandidates, generateFoundingPool } from "./founding.js";
import { INSTITUTION_CATALOG } from "./institutions.js";
import { INSTRUMENT_IDS } from "./instruments.js";
import { EXECUTIVE_ORDERS, projectOrder } from "./orders.js";
import { axisLean } from "./person-disposition.js";
import { makeCampaignSeed } from "./rng.js";
// Staged batteries for the two questions the balance harness never asks: it
// signs no orders, times no operations and gives no directives, so a green
// harness says nothing about whether an Attorney General objects too often or
// a cabinet drags everything. Each row stages the situation on real foundings
// and reads the projection, which is the decision, since neither question
// draws.
//
// Founding cabinets alone would measure one Attorney General per founding, so
// the spread rows seat every candidate the founding drafted for the chair in
// turn: the people a President could actually have put there.
const SEEDS = Array.from({ length: 12 }, (_, i) => `ws-a-${i}`);
const PARTIES = ["democrat", "republican", "independent"];
const AG = "role-attorney-general";
const DEFENSE = "role-defense-minister";
const RIVAL = "RUS";
const RUNGS = [1, 2, 3, 4, 5];
const FOUNDINGS = SEEDS.flatMap((seed) => PARTIES.map((party) => ({ seed, party, campaign: foundedForBalance(seed, party).campaign })));
function candidates(founding, role) {
    const leader = founding.campaign.founding.leader;
    const pool = generateFoundingPool(makeCampaignSeed(founding.seed), worldDataset);
    return draftCabinetCandidates(CHARTER_USA_CONSTITUTION, founding.campaign.founding.nation, pool, leader)[role] ?? [];
}
/** The campaign with this person in the chair, under the sitting holder's id so every reader finds them. */
function seated(campaign, role, person) {
    const id = campaign.player.cabinet[role];
    return { ...campaign, people: { ...campaign.people, [id]: { ...campaign.people[id], base: { ...person, id } } } };
}
/** A record of contested orders, the way a term's challenges pile up. */
function withRecord(campaign, contested) {
    const orders = Array.from({ length: contested }, (_, i) => ({
        id: `order-border-controls:${i}`,
        order: "order-border-controls",
        turn: i,
        contested: true,
        challengeChance: 0.3,
    }));
    return { ...campaign, orders };
}
function objectionShare(campaign) {
    const objected = EXECUTIVE_ORDERS.filter((order) => projectOrder(campaign, CHARTER_USA_CONSTITUTION, order).review?.objects === true);
    return objected.length / EXECUTIVE_ORDERS.length;
}
function quantile(values, q) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
}
const pct = (value) => `${Math.round(value * 100)}%`;
/** Every act the President could order this week that a chair carries out, and whether the chair drags it. */
function delays(campaign) {
    const us = campaign.founding.nation;
    const operations = INSTRUMENT_IDS.flatMap((instrument) => RUNGS.map((rung) => actionTiming(campaign, { actor: us, target: RIVAL, instrument, rung }).pace))
        .filter((pace) => pace !== undefined)
        .map((pace) => pace.days > 0);
    const rules = EXECUTIVE_ORDERS.map((order) => projectOrder(campaign, CHARTER_USA_CONSTITUTION, order).execution)
        .filter((execution) => execution !== undefined)
        .map((execution) => execution.addedWeeks > 0);
    const directives = INSTITUTION_CATALOG.flatMap((def) => directableKinds(def.id).map((kind) => issueDirective(campaign, { institution: def.id, kind, subject: "the battery" }))).flatMap((result) => (result.ok && result.packet.provenance?.decision?.question === "carry-out" ? [result.packet.provenance.decision.acts === false] : []));
    return [...operations, ...rules, ...directives];
}
describe("certify-order: the Attorney General's objections", () => {
    it("objects to between a tenth and a third of the catalogue for the median founded Attorney General, clean or once refused", () => {
        const lines = [];
        const medians = [0, 1, 2, 3].map((contested) => {
            const shares = FOUNDINGS.map((founding) => objectionShare(withRecord(founding.campaign, contested)));
            lines.push(`[certify-order] contested=${contested} n=${shares.length} p10 ${pct(quantile(shares, 0.1))} median ${pct(quantile(shares, 0.5))} p90 ${pct(quantile(shares, 0.9))}`);
            return quantile(shares, 0.5);
        });
        console.info(lines.join("\n"));
        // The band holds for a clean record and one refusal; past that the record
        // term is meant to compound, and the printed rows show how far.
        for (const median of medians.slice(0, 2)) {
            expect(median).toBeGreaterThanOrEqual(0.1);
            expect(median).toBeLessThanOrEqual(0.35);
        }
    });
    it("separates a principled Attorney General from a pliant one by at least fifteen points", () => {
        const rows = FOUNDINGS.flatMap((founding) => candidates(founding, AG).map((person) => ({
            principle: axisLean(person, "principle"),
            share: objectionShare(withRecord(seated(founding.campaign, AG, person), 1)),
        })));
        const low = quantile(rows.map((row) => row.principle), 0.1);
        const high = quantile(rows.map((row) => row.principle), 0.9);
        const mean = (subset) => subset.reduce((sum, row) => sum + row.share, 0) / Math.max(1, subset.length);
        const pliant = mean(rows.filter((row) => row.principle <= low));
        const principled = mean(rows.filter((row) => row.principle >= high));
        console.info(`[certify-order] candidates=${rows.length} principle p10 ${low} objects ${pct(pliant)}; p90 ${high} objects ${pct(principled)}`);
        expect(principled - pliant).toBeGreaterThanOrEqual(0.15);
    });
});
describe("carry-out: the pace of the President's acts", () => {
    it("drags between a tenth and two fifths of the acts for the median founded cabinet", () => {
        const shares = FOUNDINGS.map((founding) => {
            const marks = delays(founding.campaign);
            return marks.filter(Boolean).length / Math.max(1, marks.length);
        });
        console.info(`[carry-out] n=${shares.length} acts delayed: p10 ${pct(quantile(shares, 0.1))} median ${pct(quantile(shares, 0.5))} p90 ${pct(quantile(shares, 0.9))}`);
        expect(quantile(shares, 0.5)).toBeGreaterThanOrEqual(0.1);
        expect(quantile(shares, 0.5)).toBeLessThanOrEqual(0.4);
    });
    it("moves an operation of five days or more apart between a bold and a cautious Secretary of Defense by three quarters of a day per ten", () => {
        const rows = FOUNDINGS.flatMap((founding) => {
            const us = founding.campaign.founding.nation;
            return candidates(founding, DEFENSE).flatMap((person) => {
                const campaign = seated(founding.campaign, DEFENSE, person);
                return RUNGS.map((rung) => actionTiming(campaign, { actor: us, target: RIVAL, instrument: "military", rung }))
                    .filter((timing) => timing.pace !== undefined && timing.days - timing.pace.days >= 5)
                    .map((timing) => ({ boldness: axisLean(person, "boldness"), days: timing.days, book: timing.days - timing.pace.days }));
            });
        });
        const low = quantile(rows.map((row) => row.boldness), 0.1);
        const high = quantile(rows.map((row) => row.boldness), 0.9);
        const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
        const cautious = mean(rows.filter((row) => row.boldness <= low).map((row) => row.days));
        const bold = mean(rows.filter((row) => row.boldness >= high).map((row) => row.days));
        const length = mean(rows.map((row) => row.book));
        const bar = 0.075 * length;
        console.info(`[carry-out] Defense operations=${rows.length} lengths ${[...new Set(rows.map((row) => row.book))].sort((a, b) => a - b).join("/")} days (mean ${length.toFixed(2)}); ` +
            `boldness p10 ${low} takes ${cautious.toFixed(2)} days; p90 ${high} takes ${bold.toFixed(2)} days; gap ${(cautious - bold).toFixed(2)} against ${bar.toFixed(2)}`);
        // The bar this check was written to was 0.75 days on a ten-day operation,
        // with the effect measured at 0.84. The book length of an operation against
        // a rival moves with reach (ten days measured from the capital, five from
        // the nearest US base), so the bar is the same three quarters of a day per
        // ten days of the operations measured. A Secretary whose disposition did
        // not move the clock would put both means on the book and fail.
        expect(cautious - bold).toBeGreaterThanOrEqual(bar);
    });
});
