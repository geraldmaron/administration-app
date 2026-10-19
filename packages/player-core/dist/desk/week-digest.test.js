import { describe, expect, it } from "vitest";
import { advanceUntilAttention, campaignTurnPhases, selectDateOfTurn } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { digestWeeks, weekDigest } from "./week-digest";
const OPENING = openingCampaign();
const RAN = advanceUntilAttention(OPENING, { phases: campaignTurnPhases(charterOf(OPENING)), matterSources: [], horizonDays: 28 }).campaign;
describe("the weekly digest", () => {
    it("has no week to read before the first one closes", () => {
        expect(digestWeeks(OPENING)).toEqual([]);
        expect(weekDigest(OPENING, 1)).toBeUndefined();
    });
    it("lists every closed week, newest first, dated from the day each opened", () => {
        const weeks = digestWeeks(RAN);
        expect(weeks.map((tab) => tab.week)).toEqual(Array.from({ length: RAN.turn - 1 }, (_, i) => RAN.turn - 1 - i));
        expect(weeks[0]?.from).toEqual(selectDateOfTurn(RAN, RAN.turn - 1));
    });
    it("refuses the open week and anything that is not a week", () => {
        expect(weekDigest(RAN, RAN.turn)).toBeUndefined();
        expect(weekDigest(RAN, 0)).toBeUndefined();
        expect(weekDigest(RAN, 1.5)).toBeUndefined();
    });
    it("reads a closed week's figures as the move from the row it opened on to the row the next one opened on", () => {
        const history = RAN.player.metricHistory;
        const week = RAN.turn - 2;
        const digest = weekDigest(RAN, week);
        const before = history[history.length - 2];
        const after = history[history.length - 1];
        expect(digest.scrolledOut).toBe(false);
        expect(digest.approvalDelta).toBeCloseTo(after.approval - before.approval, 10);
        for (const move of digest.moves)
            expect(move.delta).toBeCloseTo(after[move.key] - before[move.key], 10);
    });
    it("reads the most recent closed week up to today where the open week's opening was not kept, as the Brief's week does", () => {
        const { week, ...open } = RAN;
        void week;
        const last = RAN.player.metricHistory[RAN.player.metricHistory.length - 1];
        const digest = weekDigest(open, open.turn - 1);
        expect(digest.approvalDelta).toBeCloseTo(open.player.metrics.approval - last.approval, 10);
    });
    it("files the wire the week's close produced under that week", () => {
        const week = RAN.turn - 1;
        const digest = weekDigest(RAN, week);
        expect(digest.wire.every((item) => item.turn === week + 1)).toBe(true);
        expect(digest.wire.length).toBe(RAN.feed.filter((item) => item.turn === week + 1).length);
    });
    it("keeps concealed graft out of the Digest, then groups the disclosed act with this administration", () => {
        const week = RAN.turn - 2;
        const person = RAN.player.cabinet["role-defense-minister"];
        const id = `ev-${week + 1}-graft`;
        const date = selectDateOfTurn(RAN, week + 1);
        const event = {
            turn: week + 1, actor: "world", background: true,
            description: "The Defense Secretary steered a procurement award.",
            causal: { origin: "world", eventId: id, createdDate: date, systems: ["cabinet", "graft"],
                graft: { person, role: "role-defense-minister", institution: "INST-DOD", fiscalYear: 2030,
                    account: "military", annualShare: 0.04, departmentShare: 1, annualPurchasing: 1000,
                    purchasingReach: 1, oversightPressure: 0 } },
        };
        const matter = {
            id: `matter:ig:INST-DOD:graft:${id}`, causeId: id,
            origin: { kind: "inspector-general", institution: "INST-DOD" },
            direction: "received", subject: "suspected Defense purchasing irregularities",
            openedTurn: week + 1, stage: "opened", public: false, obstructed: false,
            beats: [{ turn: week + 1, description: "The inspector general opened an audit." }],
        };
        const concealed = { ...RAN, ledger: [...RAN.ledger, event], oversight: {
                ...RAN.oversight, matters: [...RAN.oversight.matters, matter],
            } };
        const before = weekDigest(concealed, week);
        expect([...before.acts, ...before.world].some((row) => row.id === id)).toBe(false);
        const reported = { ...concealed, oversight: { ...concealed.oversight, matters: [
                    ...RAN.oversight.matters, { ...matter, stage: "reported", public: true,
                        finding: "The inspector general found the Defense Secretary steered contracts." },
                ] } };
        const after = weekDigest(reported, week);
        expect(after.acts.find((row) => row.id === id)).toMatchObject({ actor: "player", date });
        expect(after.world.some((row) => row.id === id)).toBe(false);
        expect(after.world.map((row) => row.id)).toEqual(before.world.map((row) => row.id));
    });
    it("names the states that moved most on each side, and only states that moved that way", () => {
        const digest = weekDigest(RAN, RAN.turn - 2);
        expect(digest.risers.length).toBeLessThanOrEqual(5);
        expect(digest.fallers.length).toBeLessThanOrEqual(5);
        expect(digest.risers.every((move) => move.delta > 0 && move.href === `/nation/state/${move.id}`)).toBe(true);
        expect(digest.fallers.every((move) => move.delta < 0)).toBe(true);
        const risers = digest.risers.map((move) => move.delta);
        expect(risers).toEqual([...risers].sort((a, b) => b - a));
    });
});
