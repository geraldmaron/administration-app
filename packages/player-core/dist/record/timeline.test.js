import { describe, expect, it } from "vitest";
import { apply } from "@admin/engine";
import { worldSettlements } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { eventPlace } from "./event-place";
import { recordEntry } from "./record-entry";
import { recordTimeline } from "./timeline";
function act(campaign, summary, over = {}, approval = 0) {
    return {
        source: "action",
        actor: "player",
        turn: campaign.turn,
        narration: { summary },
        effects: [{ kind: "metric", deltas: { stability: 0.001 } }, { kind: "opinion", deltas: { unity: approval } }],
        provenance: { origin: "decision", systems: ["trade"], locales: ["MI"] },
        ...over,
    };
}
const opening = openingCampaign();
const tariff = apply(opening, act(opening, "Signed the tariff order.", {}, -0.02));
const tariffId = tariff.ledger.at(-1).causal.eventId;
const answer = apply(tariff, act(tariff, "Michigan plants answered the tariff.", { actor: "world", provenance: { origin: "world", causeIds: [tariffId], systems: ["macro"], locales: ["MI"] } }, 0.01));
const answerId = answer.ledger.at(-1).causal.eventId;
const delayed = apply(answer, act(answer, "Signed the farm bill.", { provenance: { origin: "decision", systems: ["congress"], effectiveDate: { year: 2099, month: 1, day: 2 } } }));
const delayedId = delayed.ledger.at(-1).causal.eventId;
describe("the Record's timeline", () => {
    it("lists every entry newest first with its domain and how it came out", () => {
        const timeline = recordTimeline(delayed);
        const row = timeline.rows.find((candidate) => candidate.id === tariffId);
        expect(row.domains).toEqual(["Economy"]);
        expect(row.outcomes).toContain("hurt");
        expect(timeline.rows.findIndex((candidate) => candidate.id === delayedId)).toBeLessThan(timeline.rows.findIndex((candidate) => candidate.id === tariffId));
        expect(timeline.total).toBe(timeline.rows.length);
    });
    it("filters by domain, outcome and subject, and counts what each option would keep", () => {
        const economy = recordTimeline(delayed, { domain: "Economy" });
        expect(economy.rows.every((row) => row.domains.includes("Economy"))).toBe(true);
        expect(economy.domains.find((option) => option.value === "Economy").count).toBe(economy.rows.length);
        const underWay = recordTimeline(delayed, { outcome: "under-way" });
        expect(underWay.rows.map((row) => row.id)).toEqual([delayedId]);
        const michigan = recordTimeline(delayed, { subject: "state:MI" });
        expect(michigan.rows.length).toBeGreaterThan(0);
        expect(michigan.rows.every((row) => row.subject?.id === "state:MI")).toBe(true);
        expect(recordTimeline(delayed, { subject: "state:XX" }).rows).toEqual([]);
    });
    it("searches the words of an entry, its place and its domain, every word required", () => {
        expect(recordTimeline(delayed, { query: "tariff" }).rows.map((row) => row.id).sort()).toEqual([answerId, tariffId].sort());
        expect(recordTimeline(delayed, { query: "  TARIFF  michigan " }).rows.map((row) => row.id)).toContain(answerId);
        expect(recordTimeline(delayed, { query: "farm" }).rows.map((row) => row.id)).toEqual([delayedId]);
        expect(recordTimeline(delayed, { query: "congress and law" }).rows.map((row) => row.id)).toEqual([delayedId]);
        expect(recordTimeline(delayed, { query: "tariff farm" }).rows).toEqual([]);
        expect(recordTimeline(delayed, { query: "   " }).rows).toHaveLength(recordTimeline(delayed).total);
    });
    it("reads the rows once per campaign state", () => {
        const find = (rows) => rows.find((row) => row.id === tariffId);
        expect(find(recordTimeline(delayed).rows)).toBe(find(recordTimeline(delayed, { query: "tariff" }).rows));
    });
    it("places an entry at its state's point and falls back to the country when the stamp names no place", () => {
        const place = eventPlace(delayed, delayed.ledger.find((entry) => entry.causal?.eventId === tariffId));
        expect(place.camera).toBe("state:MI");
        expect(place.pin?.where).toMatch(/Michigan/);
        const nowhere = eventPlace(delayed, delayed.ledger.find((entry) => entry.causal?.eventId === delayedId));
        expect(nowhere).toEqual({ camera: "us" });
    });
    it("pins an entry at the city its stamp names inside that state, and at the state's seat for a city elsewhere", () => {
        const inCity = apply(delayed, act(delayed, "Answered the Detroit plant.", { provenance: { origin: "decision", locales: ["MI", "CITY-USA-detroit"] } }));
        const place = eventPlace(inCity, inCity.ledger.at(-1));
        expect(place.camera).toBe("state:MI");
        expect(place.pin?.where).toBe("Detroit, Michigan");
        const elsewhere = apply(delayed, act(delayed, "Answered the mismatched stamp.", { provenance: { origin: "decision", locales: ["MI", "CITY-USA-houston"] } }));
        expect(eventPlace(elsewhere, elsewhere.ledger.at(-1)).pin?.where).toBe(eventPlace(delayed, delayed.ledger.find((entry) => entry.causal?.eventId === tariffId)).pin?.where);
    });
    it("retains the sourced locality on the Record map instead of moving it to the state's metro", () => {
        const point = worldSettlements.find((entry) => entry.commercialPort);
        const state = apply(delayed, act(delayed, "Answered the port request.", { provenance: { origin: "decision", locales: ["NJ", point.id] } }));
        expect(eventPlace(state, state.ledger.at(-1))).toMatchObject({ camera: "state:NJ", pin: { where: "Newark, New Jersey", lat: point.lat, lon: point.lon } });
        const mismatch = apply(delayed, act(delayed, "Mismatched location.", { provenance: { origin: "decision", locales: ["MI", point.id] } }));
        expect(eventPlace(mismatch, mismatch.ledger.at(-1)).pin?.where).toMatch(/Michigan/);
    });
});
describe("a Record entry's chain", () => {
    it("walks origins up to the root and counts everything downstream", () => {
        const root = recordEntry(delayed, tariffId);
        expect(root.downstreamCount).toBe(1);
        expect(root.roots).toEqual([]);
        const effect = recordEntry(delayed, answerId);
        expect(effect.roots.map((link) => link.id)).toEqual([tariffId]);
        expect(effect.causes.map((link) => link.id)).toEqual([tariffId]);
    });
    it("stages a delayed entry as issued, under way and not yet resolved, and an immediate one as resolved", () => {
        expect(recordEntry(delayed, delayedId).stages.map((stage) => [stage.key, stage.reached, stage.current])).toEqual([
            ["issued", true, false],
            ["under-way", true, true],
            ["resolved", false, false],
        ]);
        expect(recordEntry(delayed, tariffId).stages.map((stage) => stage.key)).toEqual(["issued", "resolved"]);
        expect(recordEntry(delayed, tariffId).stages.at(-1).current).toBe(true);
    });
});
it("finds every decision about a persistent narrative subject through the existing Record filter", () => {
    const campaign = openingCampaign();
    const subject = { key: "yard", id: "entity:voss-shipyard", kind: "organization", name: "Voss Shipyard",
        description: "Recurring narrative identity only", nation: campaign.founding.nation, originCase: "scenario:original", originScenario: "original", originTurn: campaign.turn };
    const one = apply(campaign, act(campaign, "The guarantee was authorized.", { subjects: [subject] }));
    const two = apply(one, act(one, "The guarantee was reviewed.", { subjects: [subject] }));
    expect(recordTimeline(two, { subject: subject.id }).rows).toHaveLength(2);
    expect(recordTimeline(two, { query: "Voss Shipyard" }).rows).toHaveLength(2);
    expect(recordTimeline(two).subjects.find((option) => option.value === subject.id)?.count).toBe(2);
});
