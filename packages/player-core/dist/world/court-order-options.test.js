import { describe, expect, it } from "vitest";
import { COURT_ORDER_KIND_IDS, COURT_ORDER_REFUSALS, apply, courtOrderDecideTurn, courtOrderProjection, courtRulingFlag, flagMarker, } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { courtOrderDesk, courtOrderOptions } from "./court-order-options";
const base = openingCampaign();
const CO = "CO";
function withUnrest(campaign, severity) {
    const unrest = { id: "condition:unrest:USA:co", nation: campaign.founding.nation, kind: "unrest", scope: "nation", state: CO,
        severity, startedTurn: campaign.turn, status: "active", beats: [] };
    return { ...campaign, conditions: { ...campaign.conditions, [unrest.id]: unrest } };
}
/** An application filed this week on odds that make the answer certain, with the ruling the court would stamp the week it answers. */
function ruled(campaign, kind, outcome) {
    const odds = outcome === "granted" ? "g100:n0" : outcome === "narrowed" ? "g0:n100" : "g0:n0";
    const applied = `court-application:${kind}:CO:${odds}`;
    const decideTurn = courtOrderDecideTurn(campaign, kind, CO, campaign.turn);
    const ruling = courtRulingFlag(kind, CO, outcome);
    const filed = { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags,
                [applied]: true, [flagMarker(applied, campaign.turn)]: true } } };
    const decided = { ...filed, turn: decideTurn, player: { ...filed.player, flags: { ...filed.player.flags,
                [ruling]: true, [flagMarker(ruling, decideTurn)]: true } } };
    return { filed, decided };
}
const RULING = /^(flagset:)?court-order-(granted|narrowed|denied):/;
describe("courtOrderOptions", () => {
    it("offers every kind the engine knows, in its order, each citing a law the registry holds", () => {
        const options = courtOrderOptions(base, CO);
        expect(options.map((option) => option.kind)).toEqual(COURT_ORDER_KIND_IDS);
        for (const option of options) {
            expect(option.authority.recordId).toBeTruthy();
            expect(option.odds.granted + option.odds.narrowed + option.odds.denied).toBe(100);
        }
    });
    it("locks every domestic kind in a quiet state on its own legal predicate, with nothing to file", () => {
        const options = courtOrderOptions(base, CO);
        for (const kind of ["search-warrant", "title-iii-order", "injunction-enforcement"]) {
            const option = options.find((entry) => entry.kind === kind);
            expect(option.locked).toBe(`This needs ${COURT_ORDER_REFUSALS[kind]}.`);
            expect(option.packet).toBeUndefined();
            expect(option.odds).toEqual({ granted: 0, narrowed: 0, denied: 100 });
        }
    });
    it("shows the engine's odds in whole percents, with the evidence behind them", () => {
        const unrest = withUnrest(base, 0.55);
        const warrant = courtOrderOptions(unrest, CO).find((option) => option.kind === "search-warrant");
        const projection = courtOrderProjection(unrest, CO, "search-warrant");
        expect(warrant.odds.granted).toBe(Math.round(projection.odds.granted * 100));
        expect(warrant.evidence.predicate).toBe(Math.round(projection.evidence.predicate * 100));
        expect(warrant.evidence.lines[0]).toMatch(/^FBI capability: \d+%$/);
        expect(warrant.decisionWeeks).toEqual(projection.decisionWeeks);
        expect(warrant.termWeeks).toBe(projection.termWeeks);
    });
    it("files on a packet that carries the odds and never the court's answer", () => {
        const unrest = withUnrest(base, 0.55);
        const warrant = courtOrderOptions(unrest, CO).find((option) => option.kind === "search-warrant");
        if (!warrant.packet) {
            expect(warrant.locked ?? warrant.attorneyGeneral).toBeTruthy();
            return;
        }
        const flags = warrant.packet.effects.flatMap((effect) => (effect.kind === "flag" ? effect.set ?? [] : []));
        expect(flags.some((flag) => RULING.test(flag))).toBe(false);
        const after = apply(unrest, warrant.packet);
        const desk = courtOrderDesk(after, CO);
        if (warrant.attorneyGeneral === "carried") {
            expect(desk.applications[0]).toMatchObject({ kind: "search-warrant", status: "pending" });
            expect(desk.live).toEqual([]);
        }
    });
});
describe("courtOrderDesk", () => {
    it("says pending until the court's week, then the answer the court gave", () => {
        const { filed, decided } = ruled(withUnrest(base, 0.55), "title-iii-order", "granted");
        const before = courtOrderDesk(filed, CO);
        expect(before.applications).toEqual([expect.objectContaining({ kind: "title-iii-order", status: "pending" })]);
        expect(before.applications[0].enables).toBeUndefined();
        const after = courtOrderDesk(decided, CO);
        expect(after.live).toEqual([expect.objectContaining({ kind: "title-iii-order", status: "granted" })]);
        expect(after.live[0].enables).toMatch(/intercept/);
        expect(after.options.find((option) => option.kind === "title-iii-order").latest?.status).toBe("granted");
    });
    it("names a narrowed order as narrower than asked, and a denial with its wait", () => {
        const narrowed = courtOrderDesk(ruled(withUnrest(base, 0.55), "title-iii-order", "narrowed").decided, CO);
        expect(narrowed.live[0].statusText).toMatch(/narrower than Justice asked/);
        const denied = courtOrderDesk(ruled(withUnrest(base, 0.55), "search-warrant", "denied").decided, CO);
        expect(denied.live).toEqual([]);
        expect(denied.applications[0]).toMatchObject({ status: "denied" });
        expect(denied.applications[0].statusText).toMatch(/^Denied\. Justice can file again in \d+ weeks?\.$/);
        expect(denied.options.find((option) => option.kind === "search-warrant").locked).toMatch(/new showing/);
    });
    it("stops enabling anything once the term has run", () => {
        const { decided } = ruled(withUnrest(base, 0.55), "title-iii-order", "granted");
        const lapsed = courtOrderDesk({ ...decided, turn: decided.turn + 52 }, CO);
        expect(lapsed.live).toEqual([]);
        expect(lapsed.applications[0]).toMatchObject({ status: "expired" });
        expect(lapsed.applications[0].enables).toBeUndefined();
    });
});
