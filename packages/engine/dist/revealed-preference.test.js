import { describe, it, expect } from "vitest";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { readPlayerCommitments } from "./ledger-reading.js";
import { describeRevealedPreference, probePricingMultiplier, revealedPreference } from "./revealed-preference.js";
const PLAYER = nationA.id;
const OTHER = nationB.id;
function withLedger(campaign, entries) {
    return { ...campaign, ledger: [...campaign.ledger, ...entries] };
}
function committed(turn, rungName, landed) {
    return {
        turn,
        actor: "player",
        description: landed
            ? `United States uses ${rungName} against Alpland, and it lands.`
            : `United States attempts ${rungName} against Alpland. Alpland rebuffs the approach and nothing moves.`,
    };
}
function pursuitAgainstPlayer(openedTurn) {
    return {
        id: `pursuit:${OTHER}:${PLAYER}:${openedTurn}`,
        actor: OTHER,
        target: PLAYER,
        aim: "security",
        openedTurn,
        commitment: 0.5,
        progress: 0,
        rungReached: 2,
        overt: true,
        lastActedTurn: openedTurn,
        status: "active",
        beats: [],
    };
}
function underPressure(campaign, openedTurn = 1) {
    const pursuit = pursuitAgainstPlayer(openedTurn);
    return { ...campaign, pursuits: { [pursuit.id]: pursuit } };
}
const traits = nationA.traits;
describe("revealedPreference", () => {
    it("reads nothing off an empty record: every scalar neutral, no evidence", () => {
        const profile = revealedPreference(buildCampaign());
        expect(profile.concedesUnderPressure).toBe(0.5);
        expect(profile.escalatesWhenTested).toBe(0.5);
        expect(profile.honorsFriends).toBe(0.5);
        expect(profile.evidence).toEqual({ pressedCommitments: 0, friendshipTests: 0 });
        expect(describeRevealedPreference(profile)).toEqual([]);
    });
    it("derives deterministically: the same record twice is the same profile", () => {
        const campaign = underPressure(withLedger(buildCampaign(), [committed(2, "Private Warning", true)]));
        expect(revealedPreference(campaign)).toEqual(revealedPreference(campaign));
    });
    it("reads a record of soft answers under pressure as a government that concedes", () => {
        const campaign = underPressure(withLedger(buildCampaign(), [
            committed(2, "Private Warning", true),
            committed(3, "Trade Advisory", true),
            committed(4, "Public Statement", false),
        ]));
        const profile = revealedPreference(campaign);
        expect(profile.evidence.pressedCommitments).toBe(3);
        expect(profile.concedesUnderPressure).toBeGreaterThan(0.5);
        expect(profile.escalatesWhenTested).toBe(0);
    });
    it("reads a record of heavy answers as the opposite reading, on the same evidence base", () => {
        const campaign = underPressure(withLedger(buildCampaign(), [
            committed(2, "Limited Strike", true),
            committed(3, "Sabotage", false),
            committed(4, "Full Embargo", true),
        ]));
        const profile = revealedPreference(campaign);
        expect(profile.escalatesWhenTested).toBe(1);
        expect(profile.concedesUnderPressure).toBe(0);
    });
    it("counts only commitments made while that counterpart was actually pressing", () => {
        const answered = withLedger(buildCampaign(), [committed(2, "Private Warning", true)]);
        expect(revealedPreference(answered).evidence.pressedCommitments).toBe(0);
        expect(revealedPreference(underPressure(answered, 5)).evidence.pressedCommitments).toBe(0);
        expect(revealedPreference(underPressure(answered, 1)).evidence.pressedCommitments).toBe(1);
    });
    it("ignores a pre-migration entry it cannot honestly read, rather than guessing at it", () => {
        const dressed = withLedger(buildCampaign(), [
            { turn: 2, actor: "player", description: "The ambassador leaves by a side door and the cameras miss it." },
        ]);
        expect(readPlayerCommitments(dressed)).toEqual([]);
        expect(revealedPreference(underPressure(dressed)).evidence.pressedCommitments).toBe(0);
    });
    it("counts an entry an authored consequence dressed, because the entry states its own commitment", () => {
        // The same prose the case above cannot read a thing off. The difference is
        // the structured record beneath it, which is the whole point of carrying one.
        const prose = "The ambassador leaves by a side door and the cameras miss it.";
        const dressed = withLedger(buildCampaign(), [
            {
                turn: 2,
                actor: "player",
                description: prose,
                commitment: { instrument: "economic", rung: 5, target: OTHER, landed: true },
            },
        ]);
        expect(readPlayerCommitments(dressed)).toEqual([
            { turn: 2, instrument: "economic", rung: 5, target: OTHER, landed: true },
        ]);
        const profile = revealedPreference(underPressure(dressed));
        expect(profile.evidence.pressedCommitments).toBe(1);
        expect(profile.escalatesWhenTested).toBe(1);
    });
    it("holds a government that turns an instrument on a treaty partner against it", () => {
        const base = buildCampaign();
        const signed = {
            ...base,
            relationships: {
                ...base.relationships,
                [`${PLAYER}:${OTHER}`]: { ...base.relationships[`${PLAYER}:${OTHER}`], treaties: ["pact"] },
            },
        };
        const betrayed = withLedger(signed, [committed(2, "Asset Freeze", true)]);
        const honored = withLedger(signed, [committed(2, "Private Warning", true)]);
        expect(revealedPreference(betrayed).honorsFriends).toBe(0);
        expect(revealedPreference(honored).honorsFriends).toBe(1);
    });
    it("counts a friend left to a war it did not start as a friendship the record failed", () => {
        const base = buildCampaign();
        const war = {
            id: "war:THIRD:ALP:2",
            aggressor: "THIRD",
            defender: OTHER,
            joined: { aggressor: [], defender: [] },
            startedTurn: 2,
            cause: "border",
            intensity: 0.5,
            warSupport: { aggressor: 0.5, defender: 0.5 },
            exhaustion: { aggressor: 0, defender: 0 },
            status: "active",
            beats: [],
        };
        const allied = {
            ...base,
            relationships: {
                ...base.relationships,
                [`${PLAYER}:${OTHER}`]: { ...base.relationships[`${PLAYER}:${OTHER}`], treaties: ["pact"] },
            },
            conflicts: { [war.id]: war },
        };
        const profile = revealedPreference(allied);
        expect(profile.evidence.friendshipTests).toBe(1);
        expect(profile.honorsFriends).toBe(0);
    });
    it("prints a readout only for the scalars the record established", () => {
        const campaign = underPressure(withLedger(buildCampaign(), [committed(2, "Private Warning", true)]));
        const lines = describeRevealedPreference(revealedPreference(campaign));
        expect(lines).toHaveLength(2);
        expect(lines[0]).toContain("pay");
    });
});
describe("probePricingMultiplier", () => {
    const neutral = revealedPreference(buildCampaign());
    it("prices nothing off a file that says nothing", () => {
        expect(probePricingMultiplier(neutral, traits)).toBe(1);
    });
    it("stays inside its bounds at every extreme of profile and traits", () => {
        const extremes = [0, 0.5, 1];
        const opinionated = [
            { ...traits, opportunism: 0, vengefulness: 0 },
            { ...traits, opportunism: 1, vengefulness: 1 },
        ];
        for (const concedes of extremes) {
            for (const escalates of extremes) {
                for (const honors of extremes) {
                    for (const counterpart of opinionated) {
                        const value = probePricingMultiplier({ ...neutral, concedesUnderPressure: concedes, escalatesWhenTested: escalates, honorsFriends: honors }, counterpart);
                        expect(value).toBeGreaterThanOrEqual(0.7);
                        expect(value).toBeLessThanOrEqual(1.4);
                    }
                }
            }
        }
    });
    it("moves the right way in each reading", () => {
        const opportunist = { ...traits, opportunism: 1, vengefulness: 1 };
        const pays = probePricingMultiplier({ ...neutral, concedesUnderPressure: 1 }, opportunist);
        const doesNot = probePricingMultiplier({ ...neutral, concedesUnderPressure: 0 }, opportunist);
        expect(pays).toBeGreaterThan(doesNot);
        const abandons = probePricingMultiplier({ ...neutral, honorsFriends: 0 }, opportunist);
        const stands = probePricingMultiplier({ ...neutral, honorsFriends: 1 }, opportunist);
        expect(abandons).toBeGreaterThan(stands);
        const climbs = probePricingMultiplier({ ...neutral, escalatesWhenTested: 1 }, opportunist);
        const holds = probePricingMultiplier({ ...neutral, escalatesWhenTested: 0 }, opportunist);
        expect(climbs).toBeLessThan(holds);
    });
    it("weights rather than decides: an indifferent nation prices the same file at par", () => {
        const indifferent = { ...traits, opportunism: 0, vengefulness: 0 };
        const value = probePricingMultiplier({ ...neutral, concedesUnderPressure: 1, honorsFriends: 0 }, indifferent);
        expect(value).toBe(1);
    });
});
