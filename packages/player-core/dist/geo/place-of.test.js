import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { PINNABLE_KINDS, pinnableItems, placeOf } from "./place-of";
const usa = "USA";
function condition(id, extra = {}) {
    return { id, nation: usa, kind: "wildfire", scope: "region", severity: 0.4, startedTurn: 1, status: "active", beats: [], ...extra };
}
function emergency(id, state, extra = {}) {
    return { id, scope: state ? { kind: "state", state } : { kind: "nation" }, cause: "wildfire", declaredTurn: 1, renewedTurn: 1, reason: "fire", ...extra };
}
const mark = { turn: 1, signature: "aid-withheld", weight: 0.4, valence: -1, decayRate: 0.05, reason: "Aid was withheld." };
const claim = { signature: "levee", openedTurn: 1, expiresTurn: 6, weight: 0.3, reason: "A levee answer was promised." };
const order = (id, subject) => ({ id, order: "order-border-controls", subject, turn: 1, contested: false, challengeChance: 0 });
describe("placeOf", () => {
    it("pins a city-scoped condition on its city", () => {
        const place = placeOf({ kind: "condition", record: condition("c1", { scope: "city", state: "PA", city: "CITY-USA-pittsburgh" }) });
        expect(place).toMatchObject({ level: "city", city: "CITY-USA-pittsburgh", state: "PA" });
    });
    it("puts every kind of item about one state on that state's one point", () => {
        const points = [
            placeOf({ kind: "condition", record: condition("c1", { state: "OH" }) }),
            placeOf({ kind: "emergency", nation: usa, record: emergency("e1", "OH") }),
            placeOf({ kind: "mark", nation: usa, state: "OH", record: mark }),
            placeOf({ kind: "claim", nation: usa, state: "OH", record: claim }),
            placeOf({ kind: "order", nation: usa, record: order("state:1", { kind: "state", state: "OH", cause: "wildfire", declarationId: "stafford:OH", billId: "bill:recovery", amount: 10 }) }),
        ];
        for (const point of points)
            expect(point).toMatchObject({ level: "state", state: "OH" });
        expect(new Set(points.map((point) => `${point.lat},${point.lon}`)).size).toBe(1);
    });
    it("pins a nation-scope condition and a national emergency at the nation", () => {
        expect(placeOf({ kind: "condition", record: condition("c1", { scope: "nation" }) })).toMatchObject({ level: "nation", nation: usa });
        expect(placeOf({ kind: "emergency", nation: usa, record: emergency("e1") })).toMatchObject({ level: "nation", nation: usa });
    });
    it("places foreign orders at their subject and leaves construction orders unplaced", () => {
        expect(placeOf({ kind: "order", nation: usa, record: order("foreign:1", { kind: "foreign", nation: "FRA", declarationId: "d1" }) }))
            .toMatchObject({ level: "nation", nation: "FRA" });
        expect(placeOf({ kind: "order", nation: usa, record: order("construction:1", { kind: "construction", sourceId: "x", declarationId: "d1", amount: 1 }) })).toBeUndefined();
    });
    it("declares every kind it answers for", () => {
        expect([...PINNABLE_KINDS].sort()).toEqual(["claim", "condition", "emergency", "mark", "order"]);
    });
});
describe("pinnableItems", () => {
    const base = openingCampaign();
    it("lists live conditions, standing emergencies and each state's marks and claims, in a declared order", () => {
        const campaign = {
            ...base,
            conditions: {
                "c-b": condition("c-b", { state: "TX" }),
                "c-a": condition("c-a", { state: "CA" }),
                "c-old": condition("c-old", { status: "resolved", endedTurn: 2 }),
            },
            emergencies: { "e-live": emergency("e-live", "TX"), "e-ended": emergency("e-ended", "CA", { endedTurn: 3 }) },
            orders: [order("z-order", { kind: "state", state: "TX", cause: "wildfire", declarationId: "stafford:TX", billId: "bill:recovery", amount: 10 }), order("construction", { kind: "construction", sourceId: "x", declarationId: "d1", amount: 1 }), order("a-order", { kind: "foreign", nation: "FRA", declarationId: "d1" })],
            states: {
                ...base.states,
                OH: { ...base.states.OH, marks: [mark], claims: [claim] },
                AL: { ...base.states.AL, marks: [mark], claims: [] },
            },
        };
        const items = pinnableItems(campaign);
        expect(items.map((item) => `${item.kind}:${"state" in item ? item.state : item.record.id}`)).toEqual([
            "condition:c-a",
            "condition:c-b",
            "emergency:e-live",
            "order:a-order",
            "order:z-order",
            "mark:AL",
            "mark:OH",
            "claim:OH",
        ]);
        expect(items.every((item) => placeOf(item) !== undefined)).toBe(true);
    });
});
