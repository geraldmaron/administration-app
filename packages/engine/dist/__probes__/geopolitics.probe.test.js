import { describe, expect, it } from "vitest";
import { organizations } from "@admin/world";
import { foundedForBalance } from "../balance-harness.js";
import { campaignTurnPhases } from "../turn-phases.js";
import { advanceTurn } from "../turn-loop.js";
import { apply } from "../effects.js";
import { openConflict } from "../conflicts.js";
import { resolveAction } from "../resolution.js";
import { createRngStreams } from "../rng.js";
import { npcActorsThisTurn } from "../npc-turn.js";
import { councilVote, securityCouncil } from "../security-council.js";
import { COUPS_PER_YEAR, observeWeek, startCensus } from "./census.js";
// Geopolitics and NPC-to-NPC behavior, driven on the shipped dataset with
// nobody at the desk unless a probe says otherwise. Every assertion states the
// realistic expectation; a failure is a reproduced break, and the console line
// beside it carries the observed numbers.
const YEAR = 52;
const PLAYER = "USA";
const NATO = organizations.find((o) => o.id === "ORG-NATO").members;
function nuclear(campaign, id) {
    return (campaign.nations[id]?.stats.military.arsenal.warheads ?? 0) > 0;
}
function run(campaign, phases, weeks, each) {
    let working = campaign;
    for (let week = 0; week < weeks; week += 1) {
        working = advanceTurn(working, phases);
        each?.(working, week);
    }
    return working;
}
const IDLE_SEEDS = ["geo-1", "geo-2", "geo-3", "geo-4"];
const IDLE_WEEKS = 2 * YEAR;
const idleReadings = new Map();
function idleRun(seed) {
    const cached = idleReadings.get(seed) ?? measureIdle(seed);
    idleReadings.set(seed, cached);
    return cached;
}
function measureIdle(seed) {
    const { campaign, charter } = foundedForBalance(seed);
    const phases = campaignTurnPhases(charter);
    // Coups and elections come from the shared record census (census.ts), the
    // same count the events probe asserts, so the two audits cannot disagree on
    // what a coup is again.
    let census = startCensus(campaign);
    let actorWeeksAtCap = 0;
    let activeWarWeeks = 0;
    const end = run(campaign, phases, IDLE_WEEKS, (c) => {
        census = observeWeek(census, c);
        activeWarWeeks += Object.values(c.conflicts).filter((w) => w.status === "active" && w.aggressor !== PLAYER && w.defender !== PLAYER).length;
        if (npcActorsThisTurn(c, createRngStreams(c.seed)).length >= 3)
            actorWeeksAtCap += 1;
    });
    const opened = Object.values(end.conflicts).filter((c) => c.startedTurn > 0 && c.aggressor !== PLAYER && c.defender !== PLAYER);
    const ended = opened.filter((c) => c.status !== "active");
    const nuclearPairWars = Object.values(end.conflicts)
        .filter((c) => nuclear(end, c.aggressor) && nuclear(end, c.defender))
        .map((c) => c.id);
    let thirdPartySanctions = 0;
    let thirdPartyCoercion = 0;
    let npcActs = 0;
    let militaryActs = 0;
    let neutralMilitary = 0;
    const partnerMilitary = [];
    for (const entry of end.ledger) {
        if (entry.actor !== "world" || !entry.commitment)
            continue;
        npcActs += 1;
        if (entry.commitment.target === PLAYER)
            continue;
        if (entry.commitment.instrument === "economic" && entry.commitment.rung >= 3)
            thirdPartySanctions += 1;
        if (entry.commitment.rung >= 3)
            thirdPartyCoercion += 1;
        const from = entry.causal?.decision?.actor;
        const edge = from ? campaign.relationships[`${from}:${entry.commitment.target}`] : undefined;
        const pressure = entry.commitment.instrument === "military" && entry.commitment.rung >= 2;
        if (edge && edge.alignment >= 0.5 && pressure)
            partnerMilitary.push(`${from}->${entry.commitment.target}:m${entry.commitment.rung}`);
        if (edge && Math.abs(edge.alignment) < 0.2 && pressure)
            neutralMilitary += 1;
        if (pressure)
            militaryActs += 1;
    }
    let borderClashes = 0;
    let nuclearPairClashes = 0;
    const borderClashPairs = [];
    for (const edge of Object.values(end.relationships)) {
        for (const event of edge.history) {
            if (event.kind !== "world-event:border-clash")
                continue;
            borderClashes += 1;
            borderClashPairs.push(`${edge.from}-${edge.to}@${event.turn}`);
            if (nuclear(end, edge.from) && nuclear(end, edge.to))
                nuclearPairClashes += 1;
        }
    }
    const regimeOps = (end.regimeOperations?.operations ?? []).map((op) => `${op.sponsor ?? "?"}->${op.target ?? "?"}:${op.act ?? "?"}`);
    const npcEdges = Object.values(campaign.relationships).filter((e) => e.from !== PLAYER && e.to !== PLAYER);
    return {
        seed,
        npcWarOnsets: opened.length,
        activeWarWeeks,
        npcWarsEnded: ended.length,
        warDurations: ended.map((c) => (c.endedTurn ?? 0) - c.startedTurn),
        nuclearPairWars,
        coups: census.coups,
        elections: census.elections,
        otherChanges: census.otherChanges,
        regimeOps,
        thirdPartySanctions,
        thirdPartyCoercion,
        npcActs,
        borderClashes,
        borderClashPairs: borderClashPairs.slice(0, 8),
        nuclearPairClashes,
        exits: census.exits,
        accessions: census.accessions,
        actorWeeksAtCap,
        militaryActs,
        partnerMilitary,
        neutralMilitary,
        partnerDyads: npcEdges.filter((e) => e.alignment >= 0.5).length,
        neutralDyads: npcEdges.filter((e) => Math.abs(e.alignment) < 0.2).length,
    };
}
describe("A. the idle world's base rates against the real record", () => {
    const readings = IDLE_SEEDS.map(idleRun);
    const years = (IDLE_SEEDS.length * IDLE_WEEKS) / YEAR;
    const sum = (pick) => readings.reduce((total, r) => total + pick(r), 0);
    it("reports the idle world", () => {
        console.log("[geo:A] idle readings", JSON.stringify(readings, null, 1));
        console.log("[geo:A] per year", JSON.stringify({
            npcWarOnsets: sum((r) => r.npcWarOnsets) / years,
            npcActiveWarYears: sum((r) => r.activeWarWeeks) / YEAR / years,
            coups: sum((r) => r.coups) / years,
            elections: sum((r) => r.elections) / years,
            thirdPartySanctions: sum((r) => r.thirdPartySanctions) / years,
            borderClashes: sum((r) => r.borderClashes) / years,
            npcActs: sum((r) => r.npcActs) / years,
        }));
        expect(readings.length).toBe(IDLE_SEEDS.length);
    });
    // UCDP counted 2 interstate conflicts in 2023 and 4 in 2024 (Davies et al.,
    // JPR 2025): those are ACTIVE conflict-years, not onsets, so they bound how
    // many wars are running in a year (occupancy) and say nothing about how many
    // start. The report test prints both readings; the onset rate needs its own
    // benchmark before it can be a gate.
    it.todo("NPC interstate war onsets per year: source an onset-rate benchmark (UCDP/COW onsets with a matching definition of war), then assert onsets, durations and occupancy separately; §6.13's tempo ledger stays in force");
    it(`seats ${COUPS_PER_YEAR.min} to ${COUPS_PER_YEAR.max} successful coups a year (dated coup records, shared census)`, () => {
        const perYear = sum((r) => r.coups) / years;
        expect(perYear).toBeGreaterThanOrEqual(COUPS_PER_YEAR.min);
        expect(perYear).toBeLessThanOrEqual(COUPS_PER_YEAR.max);
    });
    // Dozens of national elections a year worldwide; 2024 had more than sixty
    // countries vote nationally (IFES, not opened this session). The floor here
    // is deliberately low.
    it("holds dozens of national elections abroad each year", () => {
        expect(sum((r) => r.elections) / years).toBeGreaterThanOrEqual(30);
    });
    // No two nuclear-armed states have fought a war in the nuclear era beyond
    // limited clashes (Kargil 1999 is the edge case).
    it("never opens a full war between two nuclear-armed states", () => {
        expect(readings.flatMap((r) => r.nuclearPairWars)).toEqual([]);
    });
    // The EU alone has eighteen-plus sanctions packages on Russia; third parties
    // sanction one another constantly. A world with no sanctions between other
    // states is missing a whole layer of the record.
    it("carries sanctions between third parties", () => {
        expect(sum((r) => r.thirdPartySanctions) / years).toBeGreaterThanOrEqual(2);
    });
});
describe("A3. border incidents are bursty, not scheduled", () => {
    // Armed clashes between rivals cluster around crises and go quiet for years
    // (Galwan 2020 after decades without deaths on the line). A pair that clashes
    // on the same fixed interval every time is a timer, not a rivalry.
    it("does not fire the same pair on one fixed interval", () => {
        const { campaign, charter } = foundedForBalance("geo-clash");
        const end = run(campaign, campaignTurnPhases(charter), 2 * YEAR);
        const byPair = new Map();
        for (const edge of Object.values(end.relationships)) {
            for (const event of edge.history) {
                if (event.kind !== "world-event:border-clash")
                    continue;
                const key = [edge.from, edge.to].sort().join("-");
                byPair.set(key, [...(byPair.get(key) ?? []), event.turn]);
            }
        }
        const timers = [...byPair.entries()]
            .map(([pair, turns]) => {
            const sorted = [...new Set(turns)].sort((a, b) => a - b);
            const gaps = new Set(sorted.slice(1).map((t, i) => t - sorted[i]));
            return { pair, clashes: sorted.length, gaps: [...gaps] };
        })
            .filter((p) => p.clashes >= 4 && p.gaps.length === 1);
        console.log("[geo:A3] pairs", byPair.size, "fixed-interval pairs", JSON.stringify(timers));
        expect(timers).toEqual([]);
    }, 300000);
    // An armed clash on a NATO member's border with Russia is the most serious
    // thing that can happen on the eastern flank. Eight in two years with no
    // alliance consequence is not the record.
    it("does not stage routine armed clashes on NATO's border with Russia", () => {
        const { campaign, charter } = foundedForBalance("geo-1");
        const end = run(campaign, campaignTurnPhases(charter), 2 * YEAR);
        // A clash is written on both directed edges; count each pair-and-week once.
        const flank = [...new Set(Object.values(end.relationships).flatMap((edge) => edge.history
                .filter((e) => e.kind === "world-event:border-clash" && ((edge.from === "RUS" && NATO.includes(edge.to)) || (edge.to === "RUS" && NATO.includes(edge.from))))
                .map((e) => `${[edge.from, edge.to].sort().join("-")}@${e.turn}`)))];
        const byPair = {};
        for (const f of flank)
            byPair[f.split("@")[0]] = (byPair[f.split("@")[0]] ?? 0) + 1;
        console.log("[geo:A3] NATO-Russia clashes over two years", flank.length, JSON.stringify(byPair));
        expect(flank.length).toBeLessThanOrEqual(1);
    }, 300000);
});
describe("A2. partners are not the target of military pressure", () => {
    // Military pressure (deployments, shows of force and up) aimed at a
    // government the actor's own record reads as aligned at 0.5 or better is
    // rarer than at one it reads as neutral: allies quarrel over trade, they do
    // not mass forces on each other. An ordering per eligible dyad, not a share:
    // partners can still disagree or coerce one another.
    it("aims military pressure at an aligned partner less often, per pair, than at a neutral government", () => {
        const readings = ["geo-1", "geo-2"].map(idleRun);
        const partner = readings.flatMap((r) => r.partnerMilitary);
        const neutral = readings.reduce((s, r) => s + r.neutralMilitary, 0);
        const partnerRate = partner.length / Math.max(1, readings.reduce((s, r) => s + r.partnerDyads, 0));
        const neutralRate = neutral / Math.max(1, readings.reduce((s, r) => s + r.neutralDyads, 0));
        console.log("[geo:A2] military acts", readings.reduce((s, r) => s + r.militaryActs, 0), "at aligned partners", partner.length, partner.slice(0, 20), "at neutrals", neutral, "per-dyad rates partner/neutral", partnerRate, neutralRate);
        expect(partnerRate).toBeLessThan(neutralRate);
    }, 600000);
});
// --- B. Collective defense: Article 5 ----------------------------------------
function inject(campaign, conflict) {
    return apply(campaign, {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        effects: [{ kind: "conflict", set: conflict }],
        narration: { summary: conflict.cause },
    });
}
function warAfter(seed, aggressor, defender, weeks) {
    const { campaign, charter } = foundedForBalance(seed);
    const war = openConflict(aggressor, defender, campaign.turn, `${aggressor} invades ${defender}`);
    const end = run(inject(campaign, war), campaignTurnPhases(charter), weeks);
    return { conflict: end.conflicts[war.id] ?? war, campaign: end };
}
let hedgerShift = [];
describe("B. collective defense holds the way the treaties and precedent say", () => {
    // Article 5: an armed attack on one party in Europe is an attack on all, and
    // each takes "such action as it deems necessary, including the use of armed
    // force". Not automatic, but the UK leads the forward battlegroup in Estonia;
    // a Russian invasion of Estonia that drew fewer than three NATO governments
    // into the fight inside a month is not a plausible reading of the alliance.
    it("brings NATO governments into a Russian invasion of Estonia", () => {
        const seeds = ["geo-art5-1", "geo-art5-2", "geo-art5-3"];
        const joins = seeds.map((seed) => {
            const { conflict } = warAfter(seed, "RUS", "EST", 4);
            return {
                seed,
                status: conflict.status,
                defender: conflict.joined.defender,
                aggressor: conflict.joined.aggressor,
                natoDefenders: conflict.joined.defender.filter((n) => NATO.includes(n)).length,
            };
        });
        console.log("[geo:B] RUS->EST joins after 4 weeks", JSON.stringify(joins));
        for (const j of joins) {
            expect(j.aggressor.filter((n) => NATO.includes(n))).toEqual([]);
            expect(j.natoDefenders).toBeGreaterThanOrEqual(3);
        }
    }, 300000);
    // Turkey is inside the treaty area by Article 6 by name.
    it("reports who answers an attack on Turkey (report only)", () => {
        const { conflict } = warAfter("geo-art5-tur", "SYR", "TUR", 4);
        console.log("[geo:B] SYR->TUR joins", JSON.stringify(conflict.joined), conflict.status);
        expect(conflict.status).toBeDefined();
    }, 300000);
    // Russia–Ukraine as carried in 2026: no government has sent its own forces
    // to fight beside Ukraine; North Korea sent troops beside Russia (2024,
    // widely reported; not opened this session). A NATO member entering with
    // forces is the escalation the alliance has spent four years avoiding.
    it("keeps NATO governments out of the fighting in Ukraine for a year", () => {
        const { campaign, charter } = foundedForBalance("geo-ukraine", "democrat", {}, { openingPreset: "world-2026" });
        const war = Object.values(campaign.conflicts).find((c) => c.aggressor === "RUS" && c.defender === "UKR");
        expect(war, "the 2026 board carries Russia's war on Ukraine").toBeDefined();
        const end = run(campaign, campaignTurnPhases(charter), YEAR);
        const after = end.conflicts[war.id];
        hedgerShift = ["IND", "TUR", "SAU", "BRA"].flatMap((h) => ["RUS", "USA", "UKR", "CHN"].map((p) => {
            const k = `${h}:${p}`;
            const a = campaign.relationships[k]?.alignment ?? 0;
            const b = end.relationships[k]?.alignment ?? 0;
            return { edge: k, from: Math.round(a * 1000) / 1000, to: Math.round(b * 1000) / 1000 };
        }));
        console.log("[geo:B] hedger alignment over the year", JSON.stringify(hedgerShift));
        console.log("[geo:B] RUS-UKR after a year", JSON.stringify({ status: after.status, joined: after.joined, left: after.left, endedTurn: after.endedTurn }));
        expect(after.joined.defender.filter((n) => NATO.includes(n))).toEqual([]);
    }, 300000);
});
describe("B2. hedgers hedge", () => {
    // India, Turkey, Saudi Arabia and Brazil kept working ties with both Moscow
    // and Washington through the war in Ukraine. A year of the world acting
    // should not swing any of their alignment edges by more than 0.3.
    it("keeps the hedgers' alignment toward both poles within 0.3 over a war year", () => {
        expect(hedgerShift.length).toBeGreaterThan(0);
        for (const h of hedgerShift)
            expect(Math.abs(h.to - h.from), h.edge).toBeLessThanOrEqual(0.3);
    });
});
// --- C. Deterrence and the stability-instability paradox ----------------------
describe("C. nuclear deterrence bounds force without forbidding every clash", () => {
    // India struck targets in Pakistan in May 2025 (Operation Sindoor) and at
    // Balakot in 2019, and Pakistan answered both times; China and India fought
    // hand to hand at Galwan in 2020. Nuclear dyads do have limited force
    // between them. A rule that refuses every act of force between them cannot
    // produce the record.
    // Won't fix under the current rule: DECISIONS §6.9 refuses every act of force
    // against a declared, deliverable arsenal because the engine has no outcome
    // base for it. Limited force between nuclear dyads needs a bounded outcome
    // model and an owner amendment to §6.9 first (PROGRAM.md, rule amendments).
    it.skip("lets India and Pakistan exchange a limited strike", () => {
        const { campaign } = foundedForBalance("geo-sindoor");
        const streams = createRngStreams(campaign.seed);
        const strike = resolveAction(campaign, { actor: "IND", target: "PAK", instrument: "military", rung: 4 }, streams, "simulate");
        console.log("[geo:C] IND->PAK limited strike", strike.ok ? "offered" : JSON.stringify(strike.reason ?? strike));
        expect(strike.ok).toBe(true);
    }, 120000);
    // Israel is estimated to hold about ninety warheads (SIPRI Yearbook 2026,
    // chapter 8, table 8A.10, January 2026) under a policy of opacity; an attacker weighs them anyway.
    it("reads Israel's undeclared arsenal as a deterrent", () => {
        const { campaign } = foundedForBalance("geo-israel");
        console.log("[geo:C] ISR warheads", campaign.nations["ISR"]?.stats.military.arsenal);
        expect(nuclear(campaign, "ISR")).toBe(true);
    });
});
function answerTo(seed, target, weeks) {
    const { campaign, charter } = foundedForBalance(seed);
    const streams = createRngStreams(campaign.seed);
    const sanction = resolveAction(campaign, { actor: PLAYER, target: target, instrument: "economic", rung: 3 }, streams, "action");
    if (!sanction.ok)
        throw new Error(`sanctions on ${target} refused: ${JSON.stringify(sanction)}`);
    const start = apply(campaign, sanction.packet);
    const end = run(start, campaignTurnPhases(charter), weeks);
    const answers = end.ledger.filter((e) => e.actor === "world" && e.commitment?.target === PLAYER && e.causal?.decision?.actor === target && e.turn > campaign.turn);
    return {
        acts: answers.length,
        economic: answers.filter((e) => e.commitment?.instrument === "economic").length,
        maxRung: Math.max(0, ...answers.map((e) => e.commitment?.rung ?? 0)),
        firstWeek: answers[0] ? answers[0].turn - campaign.turn : undefined,
    };
}
describe("D0. the sanctions the United States actually runs are available", () => {
    // OFAC lists country programs for Iran, North Korea, Cuba, Belarus and
    // Nicaragua (Treasury, Sanctions Programs and Country Information, read
    // 2026-10-24). Designations do not need a bilateral trade channel.
    it("offers targeted sanctions on every country OFAC runs a program against", () => {
        const { campaign } = foundedForBalance("geo-ofac");
        const refused = ["IRN", "PRK", "CUB", "BLR", "NIC", "VEN", "RUS"].flatMap((id) => {
            const r = resolveAction(campaign, { actor: PLAYER, target: id, instrument: "economic", rung: 3 }, createRngStreams(campaign.seed), "simulate");
            return r.ok ? [] : [`${id}: ${r.missingCapability}`];
        });
        console.log("[geo:D0] refused", refused);
        expect(refused).toEqual([]);
    }, 120000);
});
describe("D. the answer to the President fits the government answering", () => {
    // In 2018 China answered each round of US tariffs with its own within days
    // (USTR Section 301 record; not opened this session). A capable government
    // answers coercion in some form; same-instrument retaliation in every seed
    // would be too rigid, since diplomacy, delay and restraint are answers too.
    // A distribution target: across seeds, some answer of any instrument.
    it("has China answer US targeted sanctions in some seed within twelve weeks, by any instrument", () => {
        const seeds = ["geo-chn-1", "geo-chn-2", "geo-chn-3"];
        const answers = seeds.map((seed) => answerTo(seed, "CHN", 12));
        console.log("[geo:D] CHN answers", JSON.stringify(answers));
        expect(answers.reduce((s, a) => s + a.acts, 0)).toBeGreaterThan(0);
    }, 600000);
    it("answers from China outnumber answers from Honduras, and are not both zero", () => {
        const seeds = ["geo-cmp-1", "geo-cmp-2", "geo-cmp-3"];
        const chn = seeds.map((seed) => answerTo(seed, "CHN", 12));
        const hnd = seeds.map((seed) => answerTo(seed, "HND", 12));
        console.log("[geo:D] CHN vs HND over 12 weeks", JSON.stringify({ chn, hnd }));
        const total = (list) => list.reduce((s, a) => s + a.acts, 0);
        expect(total(chn)).toBeGreaterThan(total(hnd));
    }, 600000);
});
// --- E. Institutions the world runs on ----------------------------------------
describe("E. the institutions a President deals with exist", () => {
    // UN Charter Art. 27(3): substantive Security Council decisions need nine
    // votes including the concurring votes of the permanent members; a
    // permanent member that abstains lets a draft pass.
    it("seats the Security Council with five permanent members and ten elected", () => {
        const council = securityCouncil();
        expect(council?.members).toHaveLength(15);
        expect(council?.council?.permanent).toHaveLength(5);
        expect(council?.council?.threshold).toBe(9);
    });
    it("vetoes a resolution the United States favors and Russia and China oppose", () => {
        const { campaign } = foundedForBalance("geo-unsc");
        const vote = councilVote(campaign, { sponsor: PLAYER, target: "IRN", measure: "sanctions" });
        console.log("[geo:E] US sanctions on Iran", vote.reason, `for ${vote.for} against ${vote.against} abstain ${vote.abstain}`, vote.vetoedBy);
        expect(vote.adopted).toBe(false);
        expect(vote.vetoedBy).toEqual(expect.arrayContaining(["CHN", "RUS"]));
    });
    it("passes a draft on nine votes when a permanent member abstains, and gives it no domestic force", () => {
        const { campaign } = foundedForBalance("geo-unsc");
        const passed = Object.keys(campaign.nations)
            .filter((target) => target !== PLAYER)
            .map((target) => councilVote(campaign, { sponsor: PLAYER, target, measure: "recommendation" }))
            .filter((vote) => vote.adopted && ["RUS", "CHN"].some((p) => vote.positions[p] === "abstain"));
        console.log("[geo:E] US drafts passed with a Russian or Chinese abstention", passed.length);
        expect(passed.length).toBeGreaterThan(0);
        expect(passed.every((vote) => vote.for >= 9 && vote.effects?.usDomesticAuthority === "none")).toBe(true);
    });
    it("models the Shanghai Cooperation Organisation beside the CSTO", () => {
        expect(organizations.map((o) => o.id)).toContain("ORG-SCO");
    });
});
describe("Z. debug", () => {
    it("lists trade channels", () => {
        const { campaign } = foundedForBalance("geo-trade");
        const usa = campaign.nations[PLAYER].stats.trade.tradeDependence;
        console.log("[geo:Z] USA trade channels", Object.keys(usa).length, JSON.stringify(usa));
        const noChannel = Object.keys(campaign.nations).filter((id) => id !== "USA" && usa[id] === undefined);
        console.log("[geo:Z] nations the US cannot sanction", noChannel.length, noChannel.slice(0, 40).join(","));
    });
    it("traces China after sanctions", async () => {
        const { decideNpcAction } = await import("../npc-agent.js");
        const { campaign } = foundedForBalance("geo-chn-1");
        const streams = createRngStreams(campaign.seed);
        const sanction = resolveAction(campaign, { actor: PLAYER, target: "CHN", instrument: "economic", rung: 3 }, streams, "action");
        if (!sanction.ok)
            throw new Error("refused");
        const c = apply(campaign, sanction.packet);
        for (const k of ["CHN:RUS", "RUS:CHN", "CHN:USA", "CHN:TWN", "CHN:JPN", "CHN:IND", "CHN:PHL"]) {
            const e = c.relationships[k];
            console.log("[geo:Z] edge", k, e ? JSON.stringify({ trust: e.trust, align: e.alignment, tension: e.tension, mil: e.militaryThreat, trade: e.tradeDependence }) : "none");
        }
        const d = decideNpcAction(c, "CHN", createRngStreams(c.seed));
        for (const cand of d.ranked.slice(0, 8))
            console.log("[geo:Z] cand", `${cand.request.target}:${cand.request.instrument}${cand.request.rung}`, cand.score, JSON.stringify(cand.terms));
        const usa = d.ranked.filter((x) => x.request.target === PLAYER).slice(0, 3);
        for (const cand of usa)
            console.log("[geo:Z] usa", `${cand.request.instrument}${cand.request.rung}`, cand.score, JSON.stringify(cand.terms));
        console.log("[geo:Z] rejected usa", JSON.stringify(d.rejected.filter((r) => r.request.target === PLAYER).slice(0, 6).map((r) => `${r.request.instrument}${r.request.rung}:${r.missingCapability}`)));
    }, 300000);
});
