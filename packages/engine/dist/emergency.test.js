import { createSave, loadSave } from "./save.js";
import { advanceOneDay } from "./day-step.js";
import { signBill } from "./legislation.js";
import { legislativeAct } from "./legislative-acts.js";
import { STANDING_REVERSION } from "./standing-settling.js";
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { addDays } from "./clock.js";
import { advanceTurn, defaultTurnPhases } from "./turn-loop.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { orderAvailability, EXECUTIVE_ORDERS } from "./orders.js";
import { emergencyAuthorityClock, authorityDeadline, emergencyExpiryPhase, selectDeclaredEmergencies, renewalIsOpen, weeksToLapse, declareEmergency, endEmergency, renewEmergency, underDeclaredEmergency, weeklyStandingCost, EMERGENCY_WEEKLY_STANDING_COST, } from "./emergency.js";
import { localeAvailability, localeAct } from "./locale-acts.js";
import { takeLocaleAct } from "./locale-act-effects.js";
import { governorAssents, LOCALE_REFUSALS } from "./locale-missions.js";
const { campaign: base, charter } = foundedForBalance("emergency");
const MI = "MI";
function withCondition(campaign, over = {}) {
    const condition = {
        id: "condition:flood:USA:1",
        nation: campaign.founding.nation,
        kind: "flood",
        scope: "region",
        severity: 0.6,
        startedTurn: campaign.turn,
        status: "active",
        beats: [],
        state: MI,
        ...over,
    };
    return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}
function declared(campaign, scope = { kind: "nation" }) {
    const result = declareEmergency(campaign, scope, "flood");
    if (!result.ok)
        throw new Error(result.reason);
    return apply(campaign, result.packet);
}
function act(campaign, effects, summary) {
    return apply(campaign, { source: "action", actor: "player", turn: campaign.turn, narration: { summary }, effects });
}
describe("the emergency is declared, not ambient", () => {
    it("is not in force merely because the country has an emergency running", () => {
        // The defect this replaces: a wildfire in one city used to confer the power
        // to suspend habeas corpus, with no act of the presidency behind it.
        expect(underDeclaredEmergency(withCondition(base))).toBe(false);
    });
    it("refuses a declaration over an emergency that is not happening", () => {
        expect(declareEmergency(base, { kind: "nation" }, "flood").ok).toBe(false);
    });
    it("is in force once the president actually declares it", () => {
        expect(underDeclaredEmergency(declared(withCondition(base)))).toBe(true);
    });
    it("refuses a second declaration over the same ground", () => {
        expect(declareEmergency(declared(withCondition(base)), { kind: "nation" }, "flood").ok).toBe(false);
    });
});
describe("scope", () => {
    it("does not let a declaration over one state authorize acts in another", () => {
        const campaign = declared(withCondition(base), { kind: "state", state: MI });
        expect(underDeclaredEmergency(campaign, MI)).toBe(true);
        expect(underDeclaredEmergency(campaign, "CA")).toBe(false);
    });
    it("lets a national declaration reach every state", () => {
        const campaign = declared(withCondition(base, { scope: "nation", state: undefined }));
        expect(underDeclaredEmergency(campaign, "CA")).toBe(true);
    });
});
describe("the heaviest orders", () => {
    const heavy = EXECUTIVE_ORDERS.filter((order) => order.requires.needsEmergency);
    it("are the two that statute ties to a declared national emergency", () => {
        expect(heavy.map((order) => order.id).sort()).toEqual(["order-asset-seizure", "order-emergency-construction"]);
    });
    it("are shut while an emergency runs but no matching statutory finding exists", () => {
        const running = withCondition(base);
        for (const order of heavy) {
            const refusal = orderAvailability(running, order);
            expect(refusal.ok).toBe(false);
            if (!refusal.ok)
                expect(refusal.missing).toMatch(/national emergency|armed-forces/);
        }
    });
    it("stay shut after an unrelated domestic declaration", () => {
        const campaign = declared(withCondition(base));
        const blocking = heavy.find((order) => order.id === "order-asset-seizure");
        expect(orderAvailability(campaign, blocking).ok).toBe(false);
        expect(orderAvailability(campaign, heavy.find((order) => order.id === "order-emergency-construction")).ok).toBe(false);
    });
});
describe("holding the powers costs more than taking them", () => {
    it("charges more the longer the declaration has stood", () => {
        const campaign = declared(withCondition(base));
        const emergency = Object.values(campaign.emergencies)[0];
        expect(weeklyStandingCost(emergency, campaign.turn + 40)).toBeGreaterThan(weeklyStandingCost(emergency, campaign.turn + 1));
    });
    it("bills standing every week it stands", () => {
        // Read against the same three weeks with nothing declared, because the rest
        // of the turn moves standing too: a raw fall from the day of the declaration
        // was being carried by whatever else was draining standing that week, and
        // passed without the bill ever showing.
        const phases = campaignTurnPhases(charter);
        const threeWeeks = (from) => {
            let campaign = from;
            for (let week = 0; week < 3; week += 1)
                campaign = advanceTurn(campaign, phases);
            return campaign.player.metrics.standing;
        };
        const held = threeWeeks(declared(withCondition(base)));
        const undeclared = threeWeeks(withCondition(base));
        // Standing settles back toward its usual weight a fiftieth of the gap a week,
        // so three weeks of the bill land a little short of three full charges.
        expect(undeclared - held).toBeGreaterThanOrEqual(3 * EMERGENCY_WEEKLY_STANDING_COST * (1 - 3 * STANDING_REVERSION));
    });
    it("lapses on its own when nobody renews it", () => {
        const campaign = declared(withCondition(base));
        const late = { ...campaign, calendar: addDays(campaign.calendar, 365) };
        expect(underDeclaredEmergency(late)).toBe(false);
        expect(renewEmergency(late, Object.values(campaign.emergencies)[0].id).ok).toBe(false);
    });
    it("can be given back", () => {
        const campaign = declared(withCondition(base));
        const result = endEmergency(campaign, Object.values(campaign.emergencies)[0].id);
        if (!result.ok)
            throw new Error(result.reason);
        expect(underDeclaredEmergency(apply(campaign, result.packet))).toBe(false);
    });
    it("hands back a packet the ledger can read, so the act is on the record in the engine's words", () => {
        const campaign = withCondition(base);
        const declaration = declareEmergency(campaign, { kind: "state", state: MI }, "flood");
        if (!declaration.ok)
            throw new Error(declaration.reason);
        expect(declaration.packet.narration.summary).toContain("Michigan");
        expect(declaration.packet.provenance?.locales).toEqual([MI]);
        const after = apply(campaign, declaration.packet);
        expect(after.ledger.at(-1).description).toBe(declaration.packet.narration.summary);
        // The continuation is a public act with a season on it — the ninety days
        // before the anniversary — so it is refused now and open then.
        const id = Object.values(after.emergencies)[0].id;
        expect(renewEmergency(after, id).ok).toBe(false);
        const anniversary = { ...after, calendar: addDays(after.calendar, 275) };
        const renewal = renewEmergency(anniversary, id);
        if (!renewal.ok)
            throw new Error(renewal.reason);
        expect(renewal.packet.narration.summary).toContain("continued for another year");
    });
});
describe("the governor stands between the president and the Guard", () => {
    it("reads assent off the standing founding already seats", () => {
        expect(governorAssents(undefined)).toBe(false);
        expect(governorAssents({ person: "p", party: "democrat", disposition: 0.9 })).toBe(true);
        expect(governorAssents({ person: "p", party: "democrat", disposition: 0.1 })).toBe(false);
    });
    it("refuses federal service even with a declaration because a declaration is not one of the statute's occasions", () => {
        const running = withCondition(base);
        const federalize = localeAct("federalize");
        expect(localeAvailability(running, MI, federalize, "unrest").ok).toBe(false);
        expect(localeAvailability(declared(running), MI, federalize, "unrest").ok).toBe(false);
    });
    it("refuses to federalize over a disaster, which is not one of the statute's three predicates", () => {
        // 10 U.S.C. § 12406 opens federal service on invasion, rebellion, or laws
        // the regular forces cannot execute. A flood is none of them, and the
        // lawful road for it — the governor's own Guard, on the governor's own
        // orders — is the act sitting next to this one in the same catalogue.
        const declaredFlood = declared(withCondition(base));
        const federalize = localeAct("federalize");
        const refusal = localeAvailability(declaredFlood, MI, federalize, "flood");
        expect(refusal.ok).toBe(false);
        if (refusal.ok)
            return;
        expect(refusal.missing).toContain(LOCALE_REFUSALS.federalize);
    });
    it("charges federalizing far more standing than asking nicely", () => {
        expect(localeAct("federalize").standingCost).toBeGreaterThan(localeAct("request-deployment").standingCost);
    });
});
describe("acts that reach one place", () => {
    function asked() {
        return advanceTurn(withCondition(base), campaignTurnPhases(charter));
    }
    it("answers the state's claim when it is a real answer", () => {
        const campaign = asked();
        expect(campaign.states[MI].claims.length).toBeGreaterThan(0);
        const result = takeLocaleAct(campaign, MI, "relief", "flood");
        if (!result.ok)
            throw new Error(result.reason);
        const after = act(campaign, result.packet.effects, "relief");
        expect(after.states[MI].claims.some((c) => c.signature === "relief:flood")).toBe(false);
    });
    it("leaves the obligation standing after a waiver, because a waiver is not an answer", () => {
        const campaign = asked();
        const result = takeLocaleAct(campaign, MI, "waiver", "flood");
        if (!result.ok)
            throw new Error(result.reason);
        const after = act(campaign, result.packet.effects, "waiver");
        expect(after.states[MI].claims.some((c) => c.signature === "relief:flood")).toBe(true);
    });
    it("buys time with a review rather than settling the matter", () => {
        const campaign = asked();
        const before = campaign.states[MI].claims.find((c) => c.signature === "relief:flood");
        const result = takeLocaleAct(campaign, MI, "review", "flood");
        if (!result.ok)
            throw new Error(result.reason);
        const after = act(campaign, result.packet.effects, "review");
        const moved = after.states[MI].claims.find((c) => c.signature === "relief:flood");
        expect(moved.expiresTurn).toBeGreaterThan(before.expiresTurn);
    });
    it("makes a targeted answer recover the condition faster than governing in general", () => {
        // The stand-in this replaces: any signed order used to buy every condition
        // in the country the fully-attended rate.
        const campaign = asked();
        const result = takeLocaleAct(campaign, MI, "relief", "flood");
        if (!result.ok)
            throw new Error(result.reason);
        const answered = act(campaign, result.packet.effects, "relief");
        const phases = campaignTurnPhases(charter);
        const ignoredNext = advanceTurn(campaign, phases).conditions["condition:flood:USA:1"];
        const answeredNext = advanceTurn(answered, phases).conditions["condition:flood:USA:1"];
        expect(answeredNext.severity).toBeLessThan(ignoredNext.severity);
    });
});
describe("the enacted authority clock", () => {
    function limit(campaign) {
        const definition = legislativeAct("act-emergency-powers-limitation");
        const bill = { id: "bill:limit", act: definition.id, title: definition.title, sponsor: definition.sponsor,
            status: "on-the-desk", introducedTurn: campaign.turn, presentedOn: campaign.calendar, passage: [] };
        const desk = { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
        const result = signBill(desk, bill.id);
        if (!result.ok)
            throw new Error(result.reason);
        return apply(desk, result.packet);
    }
    function date(campaign, days) {
        return { ...campaign, calendar: addDays(base.calendar, days) };
    }
    it("ends authority at day 90, even between weekly phases, with a no-law control", () => {
        const declaration = declared(withCondition(base));
        const constrained = limit(declaration);
        const before = date(constrained, 89);
        expect(underDeclaredEmergency(before)).toBe(true);
        const ended = advanceOneDay(before, defaultTurnPhases);
        expect(underDeclaredEmergency(ended)).toBe(false);
        expect(Object.values(ended.emergencies)[0]?.endedTurn).toBeDefined();
        expect(underDeclaredEmergency(date(declaration, 90))).toBe(true);
        expect(emergencyExpiryPhase(ended)).toHaveLength(0);
        expect(ended.ledger.at(-1)?.description).toContain("authority has expired");
    });
    it("reads an enacted limit immediately when an older emergency already exceeds it", () => {
        const old = date(declared(withCondition(base)), 120);
        expect(underDeclaredEmergency(old)).toBe(true);
        expect(underDeclaredEmergency(limit(old))).toBe(false);
    });
    it("does not let continuation or a scoped re-declaration evade the ceiling", () => {
        const constrained = limit(declared(withCondition(base)));
        const record = Object.values(constrained.emergencies)[0];
        expect(renewEmergency(date(constrained, 80), record.id).ok).toBe(false);
        const ended = endEmergency(date(constrained, 80), record.id);
        if (!ended.ok)
            throw new Error(ended.reason);
        const same = declareEmergency(apply(date(constrained, 80), ended.packet), { kind: "state", state: MI }, "flood");
        if (!same.ok)
            throw new Error(same.reason);
        const reissued = apply(date(constrained, 80), same.packet);
        expect(Object.values(reissued.authorityClocks ?? {})).toHaveLength(1);
        expect(underDeclaredEmergency(date(reissued, 90))).toBe(false);
        expect(declareEmergency(date(apply(constrained, ended.packet), 100), { kind: "nation" }, "flood").ok).toBe(false);
    });
    it("allows a genuinely later condition after the old one ends", () => {
        const constrained = limit(declared(withCondition(base)));
        const expired = emergencyExpiryPhase(date(constrained, 91)).reduce(apply, date(constrained, 91));
        const later = withCondition({ ...expired, turn: base.turn + 14, conditions: {} }, { id: "condition:flood:later", startedTurn: base.turn + 14 });
        const next = declared(later);
        expect(underDeclaredEmergency(next)).toBe(true);
        expect(Object.values(next.authorityClocks ?? {})).toHaveLength(2);
        expect(underDeclaredEmergency({ ...next, calendar: addDays(next.calendar, 90) })).toBe(false);
    });
    it("keeps every original predicate when a national declaration narrows to either state", () => {
        const floods = withCondition(withCondition(base), { id: "condition:flood:USA:2", state: "CA" });
        const national = limit(declared(floods));
        const record = Object.values(national.emergencies)[0];
        const ended = endEmergency(national, record.id);
        if (!ended.ok)
            throw new Error(ended.reason);
        const saved = loadSave(JSON.parse(JSON.stringify(createSave(apply(national, ended.packet)))));
        for (const state of ["MI", "CA"]) {
            const timely = declareEmergency(date(saved, 80), { kind: "state", state }, "flood");
            if (!timely.ok)
                throw new Error(timely.reason);
            const next = apply(date(saved, 80), timely.packet);
            expect(Object.values(next.authorityClocks ?? {})).toHaveLength(1);
            expect(underDeclaredEmergency(date(next, 90), state)).toBe(false);
            expect(declareEmergency(date(saved, 90), { kind: "state", state }, "flood").ok).toBe(false);
        }
    });
    it("recovers all covered predicates from older single-predicate and turn-only declarations", () => {
        const floods = withCondition(withCondition(base), { id: "condition:flood:USA:2", state: "CA" });
        const national = limit(declared(floods));
        const record = Object.values(national.emergencies)[0];
        const clock = emergencyAuthorityClock(national, record);
        const oldClock = { id: clock.id, authority: clock.authority, predicate: clock.predicate,
            openedDate: clock.openedDate, expiresDate: clock.expiresDate };
        const variants = [
            { ...national, authorityClocks: { [clock.id]: oldClock } },
            { ...national, authorityClocks: {}, emergencies: { [record.id]: { ...record, authorityClockId: undefined } } },
        ];
        for (const legacy of variants) {
            expect(declareEmergency(date(legacy, 90), { kind: "state", state: "CA" }, "flood").ok).toBe(false);
        }
    });
    it("keeps every predicate covered nationally when a later declaration narrows the scope", () => {
        const floods = withCondition(withCondition(base, { id: "a:michigan" }), { id: "z:california", state: "CA" });
        const national = limit(declared(floods));
        const original = Object.values(national.emergencies)[0];
        const ended = endEmergency(date(national, 80), original.id);
        if (!ended.ok)
            throw new Error(ended.reason);
        const before = apply(date(national, 80), ended.packet);
        const narrower = declareEmergency(before, { kind: "state", state: "CA" }, "flood");
        if (!narrower.ok)
            throw new Error(narrower.reason);
        const reissued = apply(before, narrower.packet);
        expect(selectDeclaredEmergencies(reissued)[0]?.authorityClockId).toBe(original.authorityClockId);
        expect(underDeclaredEmergency(date(reissued, 90))).toBe(false);
        const loaded = loadSave(JSON.parse(JSON.stringify(createSave(date(national, 90)))));
        expect(declareEmergency(loaded, { kind: "state", state: "CA" }, "flood").ok).toBe(false);
    });
    it("recovers all original predicates from a singular-clock save without absorbing later floods", () => {
        const floods = withCondition(withCondition(base, { id: "a:michigan" }), { id: "z:california", state: "CA" });
        const national = limit(declared(floods));
        const original = Object.values(national.authorityClocks ?? {})[0];
        const oldClock = { id: original.id, authority: original.authority, predicate: original.predicate,
            openedDate: original.openedDate, expiresDate: original.expiresDate };
        const oldSave = { ...date(national, 90), authorityClocks: { [oldClock.id]: oldClock } };
        expect(declareEmergency(oldSave, { kind: "state", state: "CA" }, "flood").ok).toBe(false);
        const later = withCondition({ ...oldSave, turn: base.turn + 14, conditions: {} }, { id: "later:california", state: "CA" });
        expect(declareEmergency(later, { kind: "state", state: "CA" }, "flood").ok).toBe(true);
    });
    it("keeps the annual anniversary after early notice, including a leap year", () => {
        const opened = { ...withCondition(base), calendar: { year: 2031, month: 7, day: 1 } };
        const campaign = declared(opened);
        const record = Object.values(campaign.emergencies)[0];
        const deadline = { year: 2032, month: 7, day: 1 };
        expect(emergencyAuthorityClock(campaign, record).expiresDate).toEqual(deadline);
        expect(renewEmergency({ ...campaign, calendar: addDays(deadline, -91) }, record.id).ok).toBe(false);
        const timely = { ...campaign, calendar: addDays(deadline, -90) };
        const result = renewEmergency(timely, record.id);
        if (!result.ok)
            throw new Error(result.reason);
        const renewed = apply(timely, result.packet);
        expect(emergencyAuthorityClock(renewed, renewed.emergencies[record.id]).expiresDate).toEqual({ year: 2033, month: 7, day: 1 });
        expect(renewEmergency({ ...campaign, calendar: deadline }, record.id).ok).toBe(false);
    });
    it("shows the effective clock through the existing emergency reading helpers", () => {
        const campaign = date(limit(declared(withCondition(base))), 80);
        const reading = selectDeclaredEmergencies(campaign)[0];
        expect(weeksToLapse(reading, campaign.turn) * 7).toBe(10);
        expect(renewalIsOpen(reading, campaign.turn)).toBe(false);
        expect(authorityDeadline(campaign, emergencyAuthorityClock(campaign, reading))).toEqual(addDays(base.calendar, 90));
    });
    it("preserves provenance and the same next-day lapse through save/reload", () => {
        const campaign = date(limit(declared(withCondition(base))), 89);
        const loaded = loadSave(JSON.parse(JSON.stringify(createSave(campaign))));
        expect(Object.values(loaded.authorityClocks ?? {})[0]?.causedBy).toBeDefined();
        expect(advanceOneDay(loaded, defaultTurnPhases)).toEqual(advanceOneDay(loadSave(createSave(campaign)), defaultTurnPhases));
        expect(underDeclaredEmergency(advanceOneDay(loaded, defaultTurnPhases))).toBe(false);
    });
});
