import { describe, expect, it } from "vitest";
import { apply, dayOneOrders, projectPressAction, pressSecretary, secretarySpentFlag, signOrder, createRngStreams } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { framingComparison, framingOffers, framingPacket, podiumReading, pressActComparison, pressActPacket, pressDesks, takeTheHitComparison, takeTheHitPacket, } from "./press-office";
const base = openingCampaign();
function withOrder(campaign) {
    const order = dayOneOrders(campaign)[0];
    if (!order)
        throw new Error("no order is offered on the first morning");
    const signed = signOrder(campaign, charterOf(campaign), order.id, createRngStreams(campaign.seed));
    if (!signed.ok)
        throw new Error(signed.reason);
    return apply(campaign, signed.packet);
}
describe("the podium", () => {
    it("names who briefs, what reporters will ask and how the corps stands", () => {
        const podium = podiumReading(base);
        expect(podium.subject).toMatch(/^Reporters will ask about /);
        expect(podium.standing.percent).toMatch(/^\d+%$/);
        if (podium.secretary)
            expect(podium.secretary.spent).toBe(false);
    });
});
describe("going in front of the press", () => {
    it("compares the three plays with no option to say nothing, and asks for a desk before an interview", () => {
        const blind = pressActComparison(base, undefined);
        expect(blind.columns.map((column) => column.id)).toEqual(["interview", "press-conference", "leak"]);
        expect(blind.columns[0].refusal).toMatch(/Choose the masthead/);
        expect(blind.columns[1].refusal).toBeUndefined();
        const desk = pressDesks(base)[0].id;
        expect(pressActComparison(base, desk).columns[0].refusal).toBeUndefined();
    });
    it("draws each play as a results row from the projection its commit rolls against", () => {
        const desk = pressDesks(base)[0].id;
        const comparison = pressActComparison(base, desk);
        const columns = comparison.columns;
        expect(comparison.waiting).toMatch(/reporters start writing about your silence/);
        for (const kind of ["interview", "press-conference", "leak"]) {
            const outcome = columns.find((column) => column.id === kind).outcome;
            const projection = projectPressAction(base, kind, kind === "press-conference" ? undefined : desk);
            expect(outcome.odds?.share).toBe(projection.successChance);
            const corps = outcome.effects.find((effect) => effect.metric === "press");
            expect(corps.ifWell).toBeCloseTo((projection.standingIfGood - base.press.standing) * 100, 0);
            expect(corps.ifBadly).toBeCloseTo((projection.standingIfBad - base.press.standing) * 100, 0);
            expect(corps.ifBadly).toBeLessThanOrEqual(corps.value);
            expect(corps.value).toBeLessThanOrEqual(corps.ifWell);
            expect(outcome.worstCase).toMatch(/^Press corps −/);
        }
        const conference = columns.find((column) => column.id === "press-conference").outcome;
        expect(conference.effects.find((effect) => effect.metric === "standing")).toMatchObject({ ifWell: 1, ifBadly: -1 });
        expect(conference.effects.some((effect) => effect.metric === "opinion:competence")).toBe(true);
    });
    it("books the play authorized, after which the week's slot is taken", () => {
        const booked = apply(base, pressActPacket(base, "press-conference", undefined));
        expect(Object.values(booked.issuedActs ?? {}).some((act) => act.kind === "press")).toBe(true);
        expect(pressActComparison(booked, undefined).columns.every((column) => column.refusal !== undefined)).toBe(true);
    });
});
describe("framing a recent order", () => {
    it("offers the orders signed in the window, each framing compared with the others", () => {
        const signed = withOrder(base);
        const offer = framingOffers(signed)[0];
        expect(offer.weeksLeft).toBeGreaterThan(0);
        const comparison = framingComparison(signed, offer.id);
        expect(comparison.columns.map((column) => column.id)).toEqual(["resolve", "restraint", "necessity", "regret"]);
        const framed = apply(signed, framingPacket(signed, offer.id, "resolve"));
        expect(framed.orders.find((record) => record.id === offer.id)?.framing?.framing).toBe("resolve");
        expect(framingOffers(framed).some((entry) => entry.id === offer.id)).toBe(false);
    });
});
describe("taking the hit", () => {
    it("is refused with no bad cycle to take, and spends the secretary once there is one", () => {
        expect(takeTheHitComparison(base).columns[0].refusal).toBeDefined();
        const secretary = pressSecretary(base);
        if (!secretary)
            return;
        const bad = {
            ...base,
            press: { ...base.press, engagements: [...base.press.engagements, { id: `press:press-conference:${base.turn}`, kind: "press-conference", turn: base.turn, wentWell: false, summary: "It went badly." }] },
        };
        const send = takeTheHitComparison(bad).columns[0];
        expect(send.refusal).toBeUndefined();
        const spent = apply(bad, takeTheHitPacket(bad));
        expect(spent.player.flags[secretarySpentFlag(secretary.id)]).toBe(true);
        expect(takeTheHitComparison(spent).columns[0].refusal).toMatch(/already taken one/);
    });
});
