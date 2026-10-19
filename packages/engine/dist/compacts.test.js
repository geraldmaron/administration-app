import { describe, expect, it } from "vitest";
import { organizations } from "@admin/world";
import { ANSWERING_RUNG, CALL_GRACE_TURNS, answeredCall, callCompact, compactCallFlag, compactKind, compactPhase, selectCallableCompacts, selectCompactCalls, usCallFlag, } from "./compacts.js";
import { createRngStreams } from "./rng.js";
import { CALL_THRESHOLD, joinDecisionPackets, projectCallAnswers, weekOfJoins } from "./war-join.js";
import { apply } from "./effects.js";
import { flagMarker } from "./marked-flags.js";
import { foundedForBalance } from "./balance-harness.js";
import { selectRelationship } from "./state.js";
// What a compact obliges. Before this, an alliance was a line in a dossier: it
// widened a band at founding and moved a relationship number, and no compact
// in the game ever asked the president for anything.
const DEFENSE_ORGS = organizations.filter((org) => org.kind === "defense");
function memberOf(campaign, org) {
    return Object.keys(campaign.nations).filter((id) => campaign.nations[id]?.base.memberships.some((m) => m === org));
}
/** Puts the player into a defense compact that has at least two other members. */
function seatedInAlliance(seed) {
    const { campaign } = foundedForBalance(seed);
    const player = campaign.founding.nation;
    for (const org of DEFENSE_ORGS) {
        const members = memberOf(campaign, org.id).filter((id) => id !== player);
        if (members.length < 2)
            continue;
        const outsider = Object.keys(campaign.nations).find((id) => id !== player && !members.includes(id) && !campaign.nations[id]?.base.memberships.includes(org.id));
        if (!outsider)
            continue;
        const seated = {
            ...campaign,
            nations: {
                ...campaign.nations,
                [player]: {
                    ...campaign.nations[player],
                    base: {
                        ...campaign.nations[player].base,
                        memberships: [...new Set([...campaign.nations[player].base.memberships, org.id])],
                    },
                },
            },
        };
        return { campaign: seated, org: org.id, ally: members[0], outsider };
    }
    throw new Error("no defense compact in the dataset has two members beside the player");
}
function atWar(campaign, aggressor, defender, startedTurn) {
    const conflict = {
        id: `war:${aggressor}:${defender}:${startedTurn}`,
        aggressor,
        defender,
        joined: { aggressor: [], defender: [] },
        startedTurn,
        cause: "A border the two of them read differently.",
        intensity: 0.6,
        warSupport: { aggressor: 0.6, defender: 0.7 },
        exhaustion: { aggressor: 0.1, defender: 0.1 },
        status: "active",
        beats: [{ turn: startedTurn, description: "The border is crossed." }],
    };
    return { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
}
describe("what a defense compact obliges", () => {
    it("reads the registry's own kind rather than a second list", () => {
        expect(DEFENSE_ORGS.length).toBeGreaterThan(0);
        for (const org of DEFENSE_ORGS)
            expect(compactKind(org.id)).toBe("defense");
    });
    it("puts a call on the president when a treaty ally is attacked", () => {
        const { campaign, org, ally, outsider } = seatedInAlliance("compact-call");
        const before = selectCompactCalls(campaign).length;
        const warring = { ...atWar(campaign, outsider, ally, campaign.turn), turn: campaign.turn };
        const calls = selectCompactCalls(warring);
        expect(calls.length).toBe(before + 1);
        const call = calls.find((c) => c.org === org);
        expect(call.ally).toBe(ally);
        expect(call.aggressor).toBe(outsider);
        expect(call.answered).toBe(false);
        // Everyone else in the compact is watching. That is the whole difference
        // between a treaty and a favor.
        expect(call.watching).not.toContain(ally);
        expect(call.watching).not.toContain(campaign.founding.nation);
    });
    it("asks nothing while the war is somebody else's", () => {
        const { campaign, outsider, ally } = seatedInAlliance("compact-not-mine");
        // Attacking the ally is a call; the ally attacking someone is not.
        const aggressing = { ...atWar(campaign, ally, outsider, campaign.turn), turn: campaign.turn };
        expect(selectCompactCalls(aggressing).some((call) => call.aggressor === outsider)).toBe(false);
    });
    it("gives the president a grace period before silence is an answer", () => {
        const { campaign, ally, outsider } = seatedInAlliance("compact-grace");
        const opened = campaign.turn;
        const warring = atWar(campaign, outsider, ally, opened);
        const inGrace = { ...warring, turn: opened + CALL_GRACE_TURNS };
        expect(selectCompactCalls(inGrace)[0]?.unansweredTurns).toBe(0);
        const past = { ...warring, turn: opened + CALL_GRACE_TURNS + 2 };
        expect(selectCompactCalls(past)[0]?.unansweredTurns).toBe(2);
    });
    it("charges the whole compact for silence, not only the country that asked", () => {
        const { campaign, ally, outsider } = seatedInAlliance("compact-silence");
        const player = campaign.founding.nation;
        const opened = campaign.turn;
        const warring = { ...atWar(campaign, outsider, ally, opened), turn: opened + CALL_GRACE_TURNS + 1 };
        const call = selectCompactCalls(warring)[0];
        expect(call.watching.length).toBeGreaterThan(0);
        const packets = compactPhase(warring);
        expect(packets.length).toBe(1);
        const after = apply(warring, packets[0]);
        for (const watcher of [call.ally, ...call.watching]) {
            const key = `${watcher}->${player}`;
            const was = warring.relationships[key];
            const now = after.relationships[key];
            if (!was || !now)
                continue;
            expect(now.trust, `${watcher} did not revise its reading`).toBeLessThan(was.trust);
        }
        expect(after.player.flags[compactCallFlag(call.org)]).toBe(true);
    });
    it("counts an act the aggressor can feel as an answer, and a statement as not one", () => {
        const { campaign, ally, outsider } = seatedInAlliance("compact-answer");
        const opened = campaign.turn;
        const warring = { ...atWar(campaign, outsider, ally, opened), turn: opened + CALL_GRACE_TURNS + 1 };
        const statement = {
            ...warring,
            ledger: [
                ...warring.ledger,
                {
                    turn: opened + 1,
                    actor: "player",
                    description: "A statement is issued.",
                    commitment: { instrument: "diplomatic", rung: 1, target: outsider, landed: true },
                },
            ],
        };
        expect(selectCompactCalls(statement)[0]?.answered).toBe(false);
        const acted = {
            ...warring,
            ledger: [
                ...warring.ledger,
                {
                    turn: opened + 1,
                    actor: "player",
                    description: "Sanctions are imposed.",
                    commitment: {
                        instrument: "economic",
                        rung: ANSWERING_RUNG,
                        target: outsider,
                        landed: true,
                    },
                },
            ],
        };
        expect(selectCompactCalls(acted)[0]?.answered).toBe(true);
        const first = compactPhase(acted).reduce(apply, acted);
        const answerFlag = Object.keys(first.player.flags).find((flag) => flag.startsWith("compact-answer:"));
        expect(first.player.flags[flagMarker(answerFlag, acted.turn + 1)]).toBe(true);
        const watcher = selectCompactCalls(acted)[0].watching[0] ?? ally;
        expect(selectRelationship(first, watcher, campaign.founding.nation).trust).toBeGreaterThan(selectRelationship(acted, watcher, campaign.founding.nation).trust);
        const later = { ...first, turn: first.turn + 1 };
        const second = compactPhase(later).reduce(apply, later);
        expect(selectRelationship(second, watcher, campaign.founding.nation).trust).toBe(selectRelationship(first, watcher, campaign.founding.nation).trust);
    });
    it("does not read an act against the wrong country as an answer", () => {
        const { campaign, ally, outsider } = seatedInAlliance("compact-wrong-target");
        const opened = campaign.turn;
        const warring = {
            ...atWar(campaign, outsider, ally, opened),
            turn: opened + CALL_GRACE_TURNS + 1,
            ledger: [
                ...campaign.ledger,
                {
                    turn: opened + 1,
                    actor: "player",
                    description: "Sanctions are imposed on somebody else entirely.",
                    commitment: { instrument: "economic", rung: 4, target: ally, landed: true },
                },
            ],
        };
        expect(selectCompactCalls(warring)[0]?.answered).toBe(false);
    });
    it("counts the weeks an open call has gone unanswered past its grace", () => {
        const { campaign, ally, outsider } = seatedInAlliance("compact-desk");
        const opened = campaign.turn;
        const warring = { ...atWar(campaign, outsider, ally, opened), turn: opened + CALL_GRACE_TURNS + 4 };
        const standing = selectCompactCalls(warring).find((call) => !call.answered && call.ally === ally);
        expect(standing?.ally).toBe(ally);
        expect(standing?.unansweredTurns).toBe(4);
    });
    it("stops asking once the war it was about is over", () => {
        const { campaign, ally, outsider } = seatedInAlliance("compact-over");
        const opened = campaign.turn;
        const warring = { ...atWar(campaign, outsider, ally, opened), turn: opened + CALL_GRACE_TURNS + 1 };
        const raised = apply(warring, compactPhase(warring)[0]);
        const flag = compactCallFlag(selectCompactCalls(warring)[0].org);
        expect(raised.player.flags[flag]).toBe(true);
        const ended = {
            ...raised,
            conflicts: Object.fromEntries(Object.entries(raised.conflicts).map(([id, conflict]) => [
                id,
                { ...conflict, status: "settled", endedTurn: raised.turn },
            ])),
        };
        const packets = compactPhase(ended);
        expect(packets.length).toBe(1);
        // Cleared rather than deleted: the flag writer's own convention, and the
        // one that survives a save round trip.
        expect(apply(ended, packets[0]).player.flags[flag]).toBe(false);
    });
});
// The call the other way: the United States attacked, asking the body it sits
// in to answer, and each member answering on its own terms.
describe("the United States calling on its allies", () => {
    function usAttacked(seed) {
        const { campaign, org, outsider } = seatedInAlliance(seed);
        const us = campaign.founding.nation;
        const warring = atWar(campaign, outsider, us, campaign.turn);
        return { campaign: warring, org, aggressor: outsider, war: `war:${outsider}:${us}:${campaign.turn}` };
    }
    it("offers a call only in a war the country fights on the defending side, and prices it", () => {
        const { campaign, org, war } = usAttacked("us-call-offer");
        const callable = selectCallableCompacts(campaign).find((entry) => entry.org === org && entry.conflict === war);
        expect(callable?.called).toBe(false);
        const result = callCompact(campaign, org, war);
        if (!result.ok)
            throw new Error(result.reason);
        expect(result.packet.effects).toContainEqual({ kind: "metric", deltas: { standing: -0.01 } });
        const after = apply(campaign, result.packet);
        expect(after.player.flags[usCallFlag(org, war)]).toBe(true);
        expect(selectCallableCompacts(after).find((entry) => entry.org === org)?.called).toBe(true);
        expect(callCompact(after, org, war).ok).toBe(false);
    });
    it("has every member answer through its own weighing, with the obligation the call raised, and stamps a refusal", () => {
        const { campaign, org, war } = usAttacked("us-call-answer");
        const result = callCompact(campaign, org, war);
        if (!result.ok)
            throw new Error(result.reason);
        const called = apply(campaign, result.packet);
        const conflict = called.conflicts[war];
        const answers = weekOfJoins(called, conflict, createRngStreams(called.seed)).filter((decision) => decision.reading.calledBody === org);
        expect(answers.length).toBeGreaterThan(0);
        for (const answer of answers) {
            expect(answer.reading.question).toBe("answer-call");
            expect(answer.willingness.threshold).toBe(CALL_THRESHOLD);
            expect(answer.reading.terms.find((term) => term.key === "call-raised")?.value).toBeGreaterThan(0);
        }
        const stamped = joinDecisionPackets(called, conflict, createRngStreams(called.seed)).filter((packet) => packet.provenance?.decision?.question === "answer-call");
        const refused = answers.filter((answer) => !answer.willingness.acts).length;
        const joined = answers.filter((answer) => answer.joins).length;
        expect(stamped.length).toBe(refused + joined);
        for (const packet of stamped.filter((each) => each.provenance.decision.acts === false)) {
            expect(packet.provenance.decision.visibility).toBe("public");
            expect(packet.narration.summary).toContain("declines the call");
        }
    });
    it("forecasts each member's answer before the call, without making it", () => {
        const { campaign, org, war } = usAttacked("us-call-forecast");
        const forecast = projectCallAnswers(campaign, org, war);
        expect(forecast.length).toBeGreaterThan(0);
        expect(campaign.player.flags[usCallFlag(org, war)]).toBeUndefined();
    });
});
describe("answers from the other members", () => {
    it("counts a member fighting beside the ally as having answered, not only the President", () => {
        const { campaign, ally, outsider } = seatedInAlliance("compact-npc-answer");
        const opened = campaign.turn;
        const warring = atWar(campaign, outsider, ally, opened);
        const call = selectCompactCalls(warring)[0];
        const member = call.watching[0];
        expect(answeredCall(warring, outsider, opened, member)).toBe(false);
        const id = `war:${outsider}:${ally}:${opened}`;
        const fighting = {
            ...warring,
            conflicts: { ...warring.conflicts, [id]: { ...warring.conflicts[id], joined: { aggressor: [], defender: [member] } } },
        };
        expect(answeredCall(fighting, outsider, opened, member)).toBe(true);
        expect(selectCompactCalls(fighting)[0].answeredBy).toContain(member);
        expect(answeredCall(fighting, outsider, opened)).toBe(false);
    });
});
