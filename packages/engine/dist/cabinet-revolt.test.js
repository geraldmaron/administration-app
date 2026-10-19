import { describe, expect, it, vi } from "vitest";
import { Person, worldDataset } from "@admin/world";
import { buildCampaign, person as base } from "./__fixtures__/campaign.js";
import { aimLeakTerms, decideAimLeak, feudTarget, projectAimLeak, revoltPacket } from "./cabinet-revolt.js";
import { RIVAL_LEAK_SYSTEM, selectSecretaryTies } from "./cabinet-alignment.js";
import { countedPhases } from "./cast-breaks.js";
import { createRngStreams } from "./rng.js";
import { QUESTION_TERMS, willDraw } from "./willingness.js";
// The willingness draw, watched: a projection must not touch the stream, and a
// decision must draw once, keyed by the pair and never the week.
vi.mock("./willingness.js", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, willDraw: vi.fn(actual.willDraw) };
});
// The harness's own counter, run over a cabinet phase that returns exactly the
// packets a test stages, so what is counted is the packet and nothing else.
const staged = vi.hoisted(() => ({ packets: [] }));
vi.mock("./turn-phases.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        campaignPhaseSequence: () => [{ id: "cabinetConsequencesPhase", run: () => staged.packets }],
        turnPhasesFrom: (sequence) => ({ simulate: sequence.map((phase) => phase.run), select: () => [] }),
    };
});
const TREASURY = "role-treasury-minister";
const DEFENSE = "role-defense-minister";
/** One decision the President took with both Secretaries on record, on the same side or opposite ones. */
function meeting(turn, x, y, apart) {
    const room = [
        { role: TREASURY, person: x.id, stance: "for" },
        { role: DEFENSE, person: y.id, stance: apart ? "against" : "for" },
    ];
    return { turn, actor: "player", description: "The President decides.", counsel: { ...room[0], room } };
}
/**
 * Two Secretaries `gap` apart on one axis, a hawk and a dove, who have taken
 * opposite sides `fights` times and the same side `agreements` times in the
 * room this half year. By default they have fought, since only a fought feud
 * is aimed at.
 */
function room(gap, leaker = {}, fights = 4, agreements = 0) {
    const x = Person.parse({
        ...base,
        id: "PER-X",
        name: "Avery Stone",
        loyalty: 0.9,
        ambition: 0.5,
        traits: ["hawkish"],
        ideology: { economicLeftRight: -gap / 2, authLibertarian: 0, nationalistGlobalist: 0 },
        ...leaker,
    });
    const y = Person.parse({
        ...base,
        id: "PER-Y",
        name: "Morgan Hale",
        traits: ["dovish"],
        ideology: { economicLeftRight: gap / 2, authLibertarian: 0, nationalistGlobalist: 0 },
    });
    const campaign = buildCampaign();
    return {
        x,
        y,
        campaign: {
            ...campaign,
            people: {
                ...campaign.people,
                [x.id]: { base: x, alive: true, currentRole: TREASURY },
                [y.id]: { base: y, alive: true, currentRole: DEFENSE },
            },
            player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [TREASURY]: x.id, [DEFENSE]: y.id } },
            ledger: [
                ...campaign.ledger,
                ...Array.from({ length: fights }, () => meeting(campaign.turn, x, y, true)),
                ...Array.from({ length: agreements }, () => meeting(campaign.turn, x, y, false)),
            ],
        },
    };
}
const leak = (campaign, x, voice = 1) => revoltPacket(campaign, "leak", campaign.turn + 1, TREASURY, x, createRngStreams(campaign.seed).stream("t", voice));
const standingHit = (packet) => packet.effects.reduce((sum, effect) => sum + (effect.kind === "metric" ? (effect.deltas.standing ?? 0) : 0), 0);
describe("a leak aimed at a colleague", () => {
    it("goes at the colleague the leaker is feuding with, names both, and stamps why", () => {
        const { campaign, x, y } = room(2);
        const packet = leak(campaign, x);
        expect(packet.provenance?.systems).toEqual(["cabinet", "leak", RIVAL_LEAK_SYSTEM]);
        expect(packet.provenance?.entities).toEqual([x.id, y.id]);
        expect(packet.narration.summary).toContain(x.name);
        expect(packet.narration.summary).toContain(y.name);
        const decision = packet.provenance?.decision;
        expect(decision?.question).toBe("aim-leak");
        expect(decision?.acts).toBe(true);
        expect(decision?.actor).toBe(x.id);
        expect(decision?.subject).toBe(y.id);
        expect(decision?.visibility).toBe("public");
        for (const term of decision?.terms ?? [])
            expect(QUESTION_TERMS["aim-leak"]).toContain(term.key);
    });
    it("costs the President half what a leak about the government does", () => {
        const aimed = room(2);
        const plain = room(0);
        expect(leak(plain.campaign, plain.x).provenance?.systems).toEqual(["cabinet", "leak"]);
        expect(standingHit(leak(aimed.campaign, aimed.x))).toBeCloseTo(standingHit(leak(plain.campaign, plain.x)) / 2, 4);
    });
    it("stays a leak about the government when the feud is shallow and the leaker owes the President little", () => {
        const { campaign, x } = room(0.21, { loyalty: 0.1 });
        expect(feudTarget(campaign, x.id)).toBeDefined();
        const packet = leak(campaign, x);
        expect(packet.provenance?.systems).toEqual(["cabinet", "leak"]);
        expect(packet.provenance?.entities).toEqual([x.id]);
        expect(packet.provenance?.decision?.question).toBe("aim-leak");
        expect(packet.provenance?.decision?.acts).toBe(false);
    });
    // A feud on paper is a reason to dislike someone; a lost argument is a
    // reason to leak about them.
    it("never aims at a colleague the leaker has only a feud on paper with", () => {
        const { campaign, x, y } = room(2, {}, 0);
        expect(selectSecretaryTies(campaign, x.id).find((tie) => tie.b === y.id)?.standing).toBeLessThan(-0.35);
        expect(feudTarget(campaign, x.id)).toBeUndefined();
        const packet = leak(campaign, x);
        expect(packet.provenance?.systems).toEqual(["cabinet", "leak"]);
        expect(packet.provenance?.decision).toBeUndefined();
    });
    it("never aims at an opposed colleague the leaker has mostly agreed with in the room", () => {
        const { campaign, x } = room(2, {}, 1, 3);
        expect(feudTarget(campaign, x.id)).toBeUndefined();
        expect(leak(campaign, x).provenance?.systems).toEqual(["cabinet", "leak"]);
    });
    it("may aim once the two have fought in the room more than they agreed", () => {
        const { campaign, x, y } = room(2, {}, 3, 1);
        expect(feudTarget(campaign, x.id)?.b).toBe(y.id);
        expect(leak(campaign, x).provenance?.decision?.question).toBe("aim-leak");
    });
    it("weighs nothing where the leaker has no feud in the room", () => {
        const { campaign, x } = room(0);
        expect(feudTarget(campaign, x.id)).toBeUndefined();
        expect(projectAimLeak(campaign, x)).toBeUndefined();
        expect(leak(campaign, x).provenance?.decision).toBeUndefined();
    });
    it("never aims at the President, however far apart they sit", () => {
        const { campaign, x } = room(0);
        const president = campaign.player.cabinet[campaign.founding.leadRole];
        const opposite = { ...campaign.people[president].base, traits: ["dovish"], ideology: { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 } };
        const apart = { ...campaign, people: { ...campaign.people, [president]: { ...campaign.people[president], base: opposite } } };
        expect(feudTarget(apart, x.id)).toBeUndefined();
        expect(leak(apart, x).provenance?.systems).toEqual(["cabinet", "leak"]);
    });
    it("decides the same way twice and on a copy of the campaign", () => {
        const { campaign, x } = room(1.4, { loyalty: 0.5 });
        const first = leak(campaign, x);
        expect(leak(campaign, x)).toEqual(first);
        expect(leak(structuredClone(campaign), x)).toEqual(first);
    });
});
describe("the aim, weighed", () => {
    const tie = (standing) => ({
        a: "PER-X",
        b: "PER-Y",
        roleA: TREASURY,
        roleB: DEFENSE,
        standing,
        record: { agreed: 0, opposed: 0, term: 0 },
        terms: { ideology: 0, temperament: 0, turf: 0, ambition: 0, faction: 0, record: 0 },
    });
    it("aims a deep feud and leaves a shallow one alone", () => {
        const { campaign, x } = room(0, { loyalty: 0.5 });
        expect(decideAimLeak(campaign, x, tie(-1)).acts).toBe(true);
        expect(decideAimLeak(campaign, { ...x, loyalty: 0 }, tie(-0.36)).acts).toBe(false);
    });
    it("weighs a deeper feud more, one way only", () => {
        const { x } = room(0);
        const enmity = (standing) => aimLeakTerms(x, tie(standing)).find((term) => term.key === "colleague-enmity").value;
        expect(enmity(-0.35)).toBe(0);
        expect(enmity(-0.6)).toBeGreaterThan(enmity(-0.4));
        expect(enmity(-1)).toBeGreaterThan(enmity(-0.6));
    });
    it("weighs deference both ways around the typical Secretary", () => {
        const { x } = room(0);
        const deference = (loyalty) => aimLeakTerms({ ...x, traits: [], loyalty }, tie(-0.8)).find((term) => term.key === "deference").value;
        expect(deference(0.1)).toBeLessThan(0);
        expect(deference(0.95)).toBeGreaterThan(0);
        expect(deference(0.4)).toBeLessThan(deference(0.6));
        expect(deference(0.6)).toBeLessThan(deference(0.8));
    });
    it("projects with no draw and decides with one, keyed by the pair and not the week", () => {
        const { campaign, x, y } = room(2);
        const spy = vi.mocked(willDraw);
        spy.mockClear();
        const projected = projectAimLeak(campaign, x);
        expect(projected?.projection.forecast).toBe("likely");
        expect(spy).not.toHaveBeenCalled();
        leak(campaign, x);
        leak({ ...campaign, turn: campaign.turn + 20 }, x);
        expect(spy).toHaveBeenCalledTimes(2);
        for (const call of spy.mock.calls)
            expect(call.slice(1)).toEqual(["aim-leak", x.id, y.id]);
    });
});
describe("the harness's count", () => {
    it("counts an aimed leak as one leak, so the term's leak band reads the same number of leaks", () => {
        const { campaign, x } = room(2);
        const aimed = leak(campaign, x);
        expect(aimed.provenance?.systems).toContain(RIVAL_LEAK_SYSTEM);
        staged.packets = [aimed];
        const tally = { leak: 0, challenge: 0, resignation: 0 };
        const phases = countedPhases(worldDataset.charters[0], tally, undefined, false);
        const runs = typeof phases.simulate === "function" ? [phases.simulate] : phases.simulate;
        for (const run of runs)
            run(campaign);
        expect(tally).toEqual({ leak: 1, challenge: 0, resignation: 0 });
    });
});
