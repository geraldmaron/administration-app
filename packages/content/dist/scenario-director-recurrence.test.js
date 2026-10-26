import { describe, expect, it } from "vitest";
import { addDays, flagMarker, selectDateOfTurn } from "@admin/engine";
import { CORE_SCENARIOS } from "./packs/core.js";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { CLASS_COOLDOWN, RECURRING_REST_DAYS, rankCandidates, recurrenceAllows } from "./scenario-director.js";
import { scenarioFiredFlag } from "./scenario.js";
const PRIOR = 5;
const NOW = 20;
const homeFlood = {
    ...CORE_SCENARIOS[0],
    id: "bound-flood-probe",
    once: false,
    family: undefined,
    cast: { pick: "none" },
    conditions: [{ kind: "conditionActive", condition: "flood" }],
    locus: { site: "interior", ground: "home", descriptor: "the flooded district", bind: "condition" },
};
function flood(campaign, nation, startedTurn, severity) {
    const condition = {
        id: `condition:flood:${nation}:${startedTurn}`,
        nation,
        kind: "flood",
        scope: "nation",
        severity,
        startedTurn,
        status: "active",
        beats: [],
    };
    return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}
function board() {
    const base = sealedCampaign();
    return flood({ ...base, turn: NOW }, base.founding.nation, 1, 0.8);
}
describe("an episode-bound scenario that follows a condition", () => {
    const home = board().founding.nation;
    const allows = (campaign) => recurrenceAllows(campaign, homeFlood, home, PRIOR);
    it("rests while the episode it answered is the only one it could bind", () => {
        expect(NOW - PRIOR).toBeGreaterThanOrEqual(CLASS_COOLDOWN);
        expect(allows(board())).toBe(false);
    });
    it("is not reopened by a flood in another nation", () => {
        const foreign = home === "FRA" ? "DEU" : "FRA";
        expect(allows(flood(board(), foreign, 19, 0.9))).toBe(false);
    });
    it("returns for a genuinely new home flood that outranks the old one", () => {
        expect(allows(flood(board(), home, 19, 0.95))).toBe(true);
    });
    it("returns for a new home flood once the old one has ended", () => {
        const base = board();
        const old = Object.values(base.conditions)[0];
        const ended = { ...base, conditions: { ...base.conditions, [old.id]: { ...old, status: "resolved" } } };
        expect(allows(flood(ended, home, 19, 0.3))).toBe(true);
    });
    it("is not reopened by a weaker new home flood while it still binds the older, more severe one", () => {
        expect(allows(flood(board(), home, 19, 0.3))).toBe(false);
    });
});
describe("recurring business rests from the later of its last raise and its last answer", () => {
    const routine = { ...CORE_SCENARIOS[0], id: "rest-probe", once: false, family: undefined, cast: { pick: "none" }, conditions: [], weight: 1 };
    const unique = { ...routine, id: "rest-unique", once: true };
    function onDay(base, days) {
        return { ...base, turn: base.turn + Math.floor(days / 7), calendar: addDays(base.calendar, days) };
    }
    function caseFor(base, scenarioId, history) {
        return {
            id: `scenario:${scenarioId}`, kind: "authored-scenario", status: "acted", title: scenarioId,
            raisedAt: base.calendar, lastTouchedAt: base.calendar, causeIds: [],
            contentPin: { scenarioId, digest: "d" },
            history: history.map(({ day, disposition }) => ({ at: addDays(base.calendar, day), from: "raised", to: "acted", disposition, actor: "player", narration: "" })),
        };
    }
    const act = { kind: "act", actionId: "hold" };
    const decline = { kind: "decline" };
    const defer = (base, day) => ({ kind: "defer", until: addDays(base.calendar, day) });
    const allowDefault = { kind: "allow-default" };
    function offered(base, cases, day, def = routine) {
        const withCases = { ...base, cases: Object.fromEntries(cases.map((item) => [item.id, item])) };
        return rankCandidates(onDay(withCases, day), [def]).length === 1;
    }
    const base = sealedCampaign();
    const answeredAt = (day) => [caseFor(base, routine.id, [{ day, disposition: act }])];
    it("rests thirteen weeks as ninety-one calendar days", () => {
        expect(RECURRING_REST_DAYS).toBe(91);
    });
    it("measures from a delayed answer, not from the raise", () => {
        expect(offered(base, answeredAt(60), 140)).toBe(false);
        expect(offered(base, answeredAt(60), 150)).toBe(false);
        expect(offered(base, answeredAt(60), 151)).toBe(true);
    });
    it("refuses day 90 and allows day 91 after an immediate answer, on any weekday", () => {
        for (let offset = 0; offset < 7; offset += 1) {
            const start = onDay(base, offset);
            const cases = [caseFor(start, routine.id, [{ day: 0, disposition: act }])];
            expect(offered(start, cases, 90)).toBe(false);
            expect(offered(start, cases, 91)).toBe(true);
        }
    });
    it("does not let repeated deferral restart the rest", () => {
        const cases = [caseFor(base, routine.id, [{ day: 14, disposition: defer(base, 30) }, { day: 30, disposition: defer(base, 60) }, { day: 60, disposition: defer(base, 85) }])];
        expect(offered(base, cases, 90)).toBe(false);
        expect(offered(base, cases, 91)).toBe(true);
    });
    it("keeps expiry and withdrawal on the raise date", () => {
        const cases = [caseFor(base, routine.id, [{ day: 70, disposition: allowDefault }])];
        expect(offered(base, cases, 91)).toBe(true);
    });
    it("counts an explicit decline as an answer", () => {
        const cases = [caseFor(base, routine.id, [{ day: 60, disposition: decline }])];
        expect(offered(base, cases, 150)).toBe(false);
        expect(offered(base, cases, 151)).toBe(true);
    });
    it("uses the latest of several occurrences", () => {
        const later = onDay(base, 100);
        const cases = [caseFor(base, routine.id, [{ day: 5, disposition: act }]), { ...caseFor(later, routine.id, [{ day: 20, disposition: act }]), id: "scenario:rest-probe@2" }];
        expect(offered(base, cases, 210)).toBe(false);
        expect(offered(base, cases, 211)).toBe(true);
    });
    it("never brings a unique incident back", () => {
        const cases = [caseFor(base, unique.id, [{ day: 0, disposition: act }])];
        expect(offered(base, cases, 700, unique)).toBe(false);
    });
    it("falls back to the raise date for a case with no dated transitions", () => {
        const legacy = { ...caseFor(base, routine.id, []), history: undefined };
        expect(offered(base, [legacy], 90)).toBe(false);
        expect(offered(base, [legacy], 91)).toBe(true);
    });
    it("remembers an answer given while no case was seated, from the end of its week", () => {
        const answeredWeek = base.turn + 2;
        const flags = { ...base.player.flags, [scenarioFiredFlag(routine.id)]: true, [flagMarker(scenarioFiredFlag(routine.id), answeredWeek)]: true };
        const flagged = { ...base, player: { ...base.player, flags } };
        const weekEnd = selectDateOfTurn(flagged, answeredWeek + 1);
        const at = (days) => ({ ...flagged, turn: answeredWeek + 20, calendar: addDays(weekEnd, days) });
        expect(rankCandidates(at(90), [routine])).toHaveLength(0);
        expect(rankCandidates(at(91), [routine])).toHaveLength(1);
    });
});
