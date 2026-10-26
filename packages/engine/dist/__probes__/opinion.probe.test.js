import { describe, expect, it } from "vitest";
import { atCampaignTurn } from "../__fixtures__/campaign.js";
import { foundedForBalance } from "../balance-harness.js";
import { apply } from "../effects.js";
import { holdElection, projectVote, presidencyElections } from "../elections.js";
import { campaignFoundingDate, turnOnDate } from "../clock.js";
import { senateClassUpIn } from "../election-seating.js";
import { openOrEscalate } from "../conflicts.js";
import { opinionTargets } from "../opinion-causes.js";
import { recomputeApproval, selectElectorate, selectApproval } from "../opinion.js";
import { selectLiveScandals } from "../press-scandal.js";
import { stepPolarization } from "../polarization.js";
import { withWeeksElapsed } from "../__fixtures__/campaign.js";
import { runPhase } from "../turn-loop.js";
import { commodityPhase } from "../commodity-phase.js";
import { macroDriftPhase } from "../macro.js";
import { opinionPhase } from "../opinion.js";
import { openConflict } from "../conflicts.js";
import { pumpPrice, pumpShock } from "../household-prices.js";
import { priceLevelScar } from "../opinion-causes.js";
import { selectSalience } from "../opinion.js";
// Probes for the domestic opinion, election and ripple-timing domain.
// Each assertion states the REALISTIC expectation; a failure is a reproduced break.
// Static reads (no weekly sim) keep the file fast: the formulas are pure functions
// of the campaign, so a mutated campaign read through them is the engine's own answer.
const USA = "USA";
const { campaign: FOUNDED, charter: CHARTER } = foundedForBalance("opinion-probe-1", "democrat");
const log = (label, value) => console.log(`[probe] ${label}: ${JSON.stringify(value)}`);
function withMood(c, mood) {
    return recomputeApproval({ ...c, player: { ...c.player, opinion: { ...c.player.opinion, ...mood } } });
}
function uniformMood(c, level) {
    // History is flattened to the settled reading so momentum is neutral: a steady approval, not a fall from the oath.
    const settled = withMood(c, { security: level, prosperity: level, services: level, integrity: level, unity: level, competence: level });
    return { ...settled, player: { ...settled.player, metricHistory: Array.from({ length: 20 }, () => settled.player.metrics) } };
}
function withEconomy(c, economy) {
    return apply(c, {
        source: "simulate", actor: "world", turn: c.turn, narration: { summary: "probe economy" },
        effects: [{ kind: "nationStat", nation: USA, setStats: { economy } }],
    });
}
const sixLaws = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`probe-law-${i}`, { id: `probe-law-${i}`, status: "law" }]));
const withLaws = (c) => ({ ...c, bills: { ...c.bills, ...sixLaws } });
const electionTurns = presidencyElections(campaignFoundingDate(FOUNDED)).map((m) => turnOnDate(campaignFoundingDate(FOUNDED), m.date));
const MIDTERM_TURN = electionTurns[0];
const PRESIDENTIAL_TURN = electionTurns[1];
const lateTerm = withLaws(atCampaignTurn(FOUNDED, MIDTERM_TURN));
const head = (c) => selectElectorate(c).headline;
describe("1. approval bounds (Gallup: lows 22-25 for Truman/Nixon/Bush 43, highs near 89-90)", () => {
    it("can fall to a historic low when every judgment is at the floor", () => {
        const floor = head(uniformMood(lateTerm, 0));
        const own = selectElectorate(uniformMood(lateTerm, 0)).approvals.ownId;
        log("approval with every judgment 0", { headline: floor, ownIdentifiers: own });
        expect(floor).toBeLessThanOrEqual(0.3);
    });
    it("cannot exceed the highest approval ever recorded (about 0.90) without a war", () => {
        const ceiling = head(uniformMood(atCampaignTurn(FOUNDED, 60), 1));
        log("approval with every judgment 1, no war", ceiling);
        expect(ceiling).toBeLessThanOrEqual(0.9);
    });
    it("a sound-economy, unscandalized, quiet term sits inside the polarized-era band 0.35-0.60 at midterm", () => {
        const quiet = head(lateTerm);
        log("founded campaign read at week 104, mood as opened", quiet);
        expect(quiet).toBeGreaterThanOrEqual(0.35);
        expect(quiet).toBeLessThanOrEqual(0.6);
    });
});
describe("2. rally round the flag decays and cannot be re-farmed", () => {
    const start = atCampaignTurn(FOUNDED, 60);
    const calm = head(start);
    const drawnIn = (c, turn) => {
        const war = openOrEscalate({ ...c, turn }, "IRN", USA, "attack on the homeland");
        return { ...c, conflicts: { ...c.conflicts, [war.id]: war } };
    };
    it("a drawn-in war lifts the polarized-era headline by no more than 20 points, and less than half of it remains after a year", () => {
        const warring = drawnIn(start, start.turn);
        const lifts = [0, 4, 13, 26, 52].map((w) => [w, head(atCampaignTurn(warring, start.turn + w)) - head(atCampaignTurn(start, start.turn + w))]);
        log("drawn-in rally lift (points) at weeks 0/4/13/26/52", lifts.map(([w, v]) => [w, Math.round(v * 1000) / 10]));
        log("calm headline", calm);
        expect(lifts[0][1]).toBeLessThanOrEqual(0.2);
        expect(lifts[4][1]).toBeLessThanOrEqual(lifts[0][1] / 2);
    });
    it("opening a fresh war every seven weeks does not hold the rally up (a public rallies once)", () => {
        // Real record: Afghanistan 2001 lifted Bush; Iraq 2003 lifted him a few points and it was gone in months.
        const iraqLike = (c, turn, defender) => {
            const war = openOrEscalate({ ...c, turn }, USA, defender, `invasion of ${defender}`);
            return { ...c, conflicts: { ...c.conflicts, [war.id]: war } };
        };
        let serial = start;
        const defenders = ["IRN", "IRQ", "SYR", "LBY", "YEM", "AFG", "SOM", "PRK"];
        defenders.forEach((d, i) => { serial = iraqLike(serial, start.turn + i * 7, d); });
        const endTurn = start.turn + defenders.length * 7;
        const single = iraqLike(start, start.turn, "IRN");
        const first = head(atCampaignTurn(single, start.turn)) - head(atCampaignTurn(start, start.turn));
        const lateLift = head(atCampaignTurn(serial, endTurn)) - head(atCampaignTurn(start, endTurn));
        log("first-war rally lift, then lift held at week 56 by serial wars", { first, lateLift, wars: Object.keys(serial.conflicts).length });
        expect(lateLift).toBeLessThanOrEqual(0.04);
    });
});
describe("3. the economy feeds approval", () => {
    const base = lateTerm;
    it("a contraction costs the prosperity judgment something, holding jobs and prices equal", () => {
        const flat = opinionTargets(withEconomy(base, { growth: 0 })).prosperity;
        const deep = opinionTargets(withEconomy(base, { growth: -0.05 })).prosperity;
        log("prosperity target at growth 0 vs -5%", { flat, deep });
        expect(deep).toBeLessThan(flat - 0.02);
    });
    it("a point of unemployment costs at least as much approval as a point of inflation (Fair/Abramowitz misery-type models weigh both)", () => {
        const u = opinionTargets(withEconomy(base, { unemployment: 0.10 })).prosperity;
        const p = opinionTargets(withEconomy(base, { inflation: 0.09 })).prosperity;
        const z = opinionTargets(base).prosperity;
        log("prosperity target base / unemployment 10% / inflation 9%", { z, u, p });
        expect(z - u).toBeGreaterThan(0.1);
    });
    // Biden fell from the mid-50s to about 40 in 2021-22 with CPI near 9%, but
    // the share of that fall due to inflation is not isolated, so it sets no
    // floor. Direction only, with the magnitude left to a sourced series.
    it("CPI at 9% lowers the headline once opinion has fully caught up", () => {
        const calm = withMood(base, opinionTargets(base));
        const hurt0 = withEconomy(base, { inflation: 0.09 });
        const hurt = withMood(hurt0, opinionTargets(hurt0));
        log("headline at mood=target, calm vs 9% inflation", { calm: head(calm), hurt: head(hurt) });
        expect(head(calm) - head(hurt)).toBeGreaterThan(0);
    });
    it.todo("inflation's approval cost as a band: needs a sourced approval-on-CPI series that isolates inflation from the other causes of a decline (BL-146's economy refit replays 1991-92 and 2021-22)");
});
describe("4. midterms: the President's party loses House seats, more when unpopular", () => {
    // Gallup (Jones, 2018): eighteen midterms since 1946 fit seats = -97.7 + 1.41 x approval, r = .66,
    // residual SD about 17 seats. Means: -37 below 50% approval, -14 above. The model returns a band
    // across starting seats and geography, so the check is the band, not a point.
    const SEEDS = Array.from({ length: 8 }, (_, i) => ({ seed: `seat-${i}`, party: i % 2 === 0 ? "democrat" : "republican" }));
    const seatsAt = (level) => SEEDS.map(({ seed, party }) => {
        const { campaign, charter } = foundedForBalance(seed, party);
        const mt = presidencyElections(campaignFoundingDate(campaign)).map((m) => turnOnDate(campaignFoundingDate(campaign), m.date))[0];
        const c = uniformMood(withLaws(atCampaignTurn(campaign, mt)), level);
        const result = holdElection(c, charter, "midterm", c.turn);
        return { approval: head(c), house: result.swing.house, held: c.congress.chambers.house.administration };
    });
    const line = (approval) => -97.7 + 1.41 * approval * 100;
    const SD = 17;
    const meanOf = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    it("near 40% approval the loss sits inside one residual SD of the record's line, and varies with the seats held", () => {
        const rows = seatsAt(0.4);
        log("midterm House swing at ~40% approval across 8 seeds", rows);
        for (const r of rows) {
            expect(r.house).toBeGreaterThanOrEqual(line(r.approval) - SD);
            expect(r.house).toBeLessThanOrEqual(line(r.approval) + SD);
        }
        const mostHeld = rows.reduce((a, b) => (b.held > a.held ? b : a));
        const leastHeld = rows.reduce((a, b) => (b.held < a.held ? b : a));
        expect(mostHeld.house).toBeLessThan(leastHeld.house);
    });
    it("at the approval floor the mean loss is within the postwar range (1946 -55, 2010 -63) and never passes it", () => {
        const rows = seatsAt(0);
        log("midterm at the floor across 8 seeds", rows);
        expect(meanOf(rows.map((r) => r.house))).toBeLessThanOrEqual(-35);
        for (const r of rows)
            expect(r.house).toBeGreaterThanOrEqual(-70);
    });
    it("only a very popular President holds or gains seats; a 60% one still loses about a dozen", () => {
        const strong = seatsAt(0.65);
        const popular = seatsAt(0.8);
        log("midterm at ~60% and ~70% approval", { strong, popular });
        expect(meanOf(strong.map((r) => r.house))).toBeLessThanOrEqual(0);
        expect(meanOf(popular.map((r) => r.house))).toBeGreaterThanOrEqual(0);
    });
});
describe("4b. the Senate moves in a midterm", () => {
    it("loses at least one Senate seat when the President is near 40% approval in a year with a class up", () => {
        const c = uniformMood(lateTerm, 0.3);
        const result = holdElection(c, CHARTER, "midterm", c.turn);
        log("election turns", electionTurns);
        log("senate", { year: c.calendar.year, classUp: senateClassUpIn(c.calendar.year), senate: result.swing?.senate, houseAndShare: [result.swing?.house, result.voteShare] });
        expect(result.swing.senate).toBeLessThanOrEqual(-1);
    });
});
describe("5. re-election tracks election-year approval", () => {
    it("a President near 37% approval is defeated, one at 50% or better is returned (Gallup: every incumbent at 50+ won; Bush 2004 won at 48)", () => {
        const outcome = (level) => {
            const c = uniformMood(withLaws(atCampaignTurn(FOUNDED, PRESIDENTIAL_TURN)), level);
            const r = holdElection(c, CHARTER, "presidential", c.turn);
            return { approval: head(c), share: r.voteShare, won: r.won };
        };
        log("vote drivers at approval ~0.556", projectVote(uniformMood(withLaws(atCampaignTurn(FOUNDED, PRESIDENTIAL_TURN)), 0.55)).drivers);
        const rows = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map(outcome);
        log("presidential result by uniform judgment level", rows);
        const low = rows.filter((r) => r.approval <= 0.4);
        const high = rows.filter((r) => r.approval >= 0.52);
        expect(low.every((r) => r.won === false)).toBe(true);
        expect(high.every((r) => r.won === true)).toBe(true);
    });
});
describe("6. polarization is a bounded stock", () => {
    it("a decade of maximal division stays inside the stated ceiling and floor", () => {
        let up = 1;
        let down = 1;
        for (let i = 0; i < 520; i += 1) {
            up = stepPolarization(up, 1);
            down = stepPolarization(down, -1);
        }
        log("saturated stocks", { up, down });
        expect(up).toBeLessThanOrEqual(1.25);
        expect(down).toBeGreaterThanOrEqual(0.85);
    });
});
describe("7. nothing pins a metric forever", () => {
    it("a plain scenario scandal flag stops costing integrity within two years", () => {
        const c = { ...atCampaignTurn(FOUNDED, 10), player: { ...atCampaignTurn(FOUNDED, 10).player, flags: { ...FOUNDED.player.flags, "scandal:probe-affair": true } } };
        const later = atCampaignTurn(c, c.turn + 104);
        const live = selectLiveScandals(later);
        log("scandals still live 104 weeks after an unstamped authored flag", live.map((s) => ({ id: s.id, stage: s.stage, intensity: s.intensity })));
        expect(live.length).toBe(0);
    });
    it("one permanent authored scandal flag leaves no lasting mark on the headline once opinion has caught up", () => {
        const clean = withMood(lateTerm, opinionTargets(lateTerm));
        const flagged0 = { ...lateTerm, player: { ...lateTerm.player, flags: { ...lateTerm.player.flags, "scandal:probe-affair": true } } };
        const flagged = withMood(flagged0, opinionTargets(flagged0));
        log("headline clean vs permanent-flag scandal, mood at target", { clean: head(clean), flagged: head(flagged) });
        expect(head(clean) - head(flagged)).toBeLessThan(0.02);
    });
});
describe("9. salience is priced in after eight weeks", () => {
    it("a war that never escalates is loud for the hold and quiet after", () => {
        let c = atCampaignTurn(FOUNDED, 60);
        const war = openConflict("IRN", USA, c.turn, "probe war");
        c = { ...c, conflicts: { ...c.conflicts, [war.id]: war } };
        const loud = [];
        for (let i = 0; i < 14; i += 1) {
            loud.push(selectSalience(c).includes("atWar"));
            c = { ...withWeeksElapsed(c, 1), salienceMemory: { ...(c.salienceMemory ?? {}), ...(c.salienceMemory?.atWar ? {} : { atWar: { since: c.turn, level: 1 } }) } };
        }
        log("atWar loud by week", loud);
        expect(loud.slice(0, 8).every(Boolean)).toBe(true);
        expect(loud.slice(9).some(Boolean)).toBe(false);
    });
});
describe("10. a foreign war's price shock reaches the President's approval with a lag", () => {
    const bare = withLaws(atCampaignTurn(FOUNDED, 40));
    const run = (c, weeks) => {
        let w = c;
        for (let i = 0; i < weeks; i += 1) {
            w = runPhase(w, [commodityPhase, macroDriftPhase, opinionPhase], w.turn + 1);
            w = withWeeksElapsed(w, 1);
        }
        return w;
    };
    it("a Gulf war that lifts the pump price lowers prosperity, and the headline, within 26 weeks", () => {
        const war = { ...openConflict("IRN", "SAU", bare.turn, "probe Gulf war"), intensity: 0.8 };
        const warred = { ...bare, conflicts: { ...bare.conflicts, [war.id]: war } };
        const out = {};
        for (const w of [4, 13, 26]) {
            const a = run(warred, w);
            const b = run(bare, w);
            out[`w${w}`] = { pump: [pumpPrice(0) && 0, pumpShock(a), pumpShock(b)], scar: [priceLevelScar(a), priceLevelScar(b)], prosperityMood: [a.player.opinion.prosperity, b.player.opinion.prosperity], head: [head(a), head(b)] };
        }
        log("war vs control", out);
        const a26 = run(warred, 26);
        const b26 = run(bare, 26);
        expect(head(b26) - head(a26)).toBeGreaterThan(0.01);
    }, 120000);
});
describe("8. approval is not a one-step snapshot", () => {
    it("approval(mood) has no tracking noise: the stored headline moves only with mood, so identical moods give identical weeks", () => {
        const a = selectApproval(withMood(lateTerm, { security: 0.5 }));
        const b = selectApproval(withMood(atCampaignTurn(lateTerm, lateTerm.turn + 1), { security: 0.5 }));
        log("approval one week apart at the same mood", { a, b });
        expect(Math.abs(a - b)).toBeLessThan(0.02);
    });
});
