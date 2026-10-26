import { describe, expect, it } from "vitest";
import { preOathSelection, termYears, windowSelection, worldDataset } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { addDays } from "./clock.js";
import { apply } from "./effects.js";
import { foreignLeaderFor, leaderOffset, leadRoleFor, tableIncumbentId } from "./foreign-leader.js";
import { confidenceRate, coupMatters, foreignPoliticsPhase, interregnum, selectForeignSeat, selectLeadershipChanges, succeedAfterDefeat, } from "./foreign-politics.js";
import { chooseGovernmentProgram, programOfNewGovernment, purseContext, worldNorms } from "./governance.js";
import { createRngStreams } from "./rng.js";
import { openConflict } from "./conflicts.js";
import { settle } from "./war-tick.js";
import { OUTCOME_LINES, settlementEffects } from "./war-outcomes.js";
// Who governs abroad, on the calendar's dates: the seal's catch-up, the week's
// selections, a parliament bringing a government down, a coup weighed and
// stamped, and a succession after a lost war. Founded for real, because every
// claim here is about the cast and the calendar the founding deals.
const founded = foundedForBalance("foreign-politics").campaign;
function runWeek(state) {
    return foreignPoliticsPhase(state).reduce((acc, packet) => apply(acc, packet), state);
}
function withSeat(state, nation, seat) {
    return { ...state, foreignPolitics: { ...state.foreignPolitics, seats: { ...state.foreignPolitics.seats, [nation]: seat } } };
}
function withPolitics(state, nation, politics) {
    const runtime = state.nations[nation];
    return {
        ...state,
        nations: { ...state.nations, [nation]: { ...runtime, stats: { ...runtime.stats, politics: { ...runtime.stats.politics, ...politics } } } },
    };
}
const dateKey = (date) => `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
describe("the selections between the table's date and the oath", () => {
    it("resolves every one of them at the seal, and leaves every other capital on its table incumbent", () => {
        const preOath = worldDataset.nations.filter((nation) => preOathSelection(nation.id) !== null);
        // The leader table's README counts 77; the calendar's own column, read at
        // the day rule, holds these. The count is reported, not tuned.
        expect(preOath.length).toBeGreaterThanOrEqual(77);
        expect(preOath.length).toBeLessThanOrEqual(81);
        for (const nation of worldDataset.nations) {
            if (nation.playable)
                continue;
            const seat = founded.foreignPolitics.seats[nation.id];
            const pre = preOathSelection(nation.id);
            expect(seat, nation.id).toBeDefined();
            if (!pre) {
                expect(seat.provenance, nation.id).toBe("table");
                expect(seat.offset, nation.id).toEqual({});
                continue;
            }
            expect(seat.mandate, nation.id).toEqual(pre.date);
            expect(["table", "projected"], nation.id).toContain(seat.provenance);
        }
    });
    it("seats each change through the chair on the record, with the projected provenance and a fresh offset", () => {
        const changed = selectLeadershipChanges(founded).filter((change) => change.projected);
        expect(changed.length).toBeGreaterThan(0);
        for (const change of changed) {
            const seat = founded.foreignPolitics.seats[change.nation];
            if (seat.person !== change.person)
                continue;
            expect(seat.provenance).toBe("projected");
            expect(foreignLeaderFor(founded, change.nation)?.person).toBe(change.person);
            const lead = leadRoleFor(founded, change.nation);
            const baseline = founded.people[tableIncumbentId(change.nation, lead)]?.base;
            expect(seat.offset).toEqual(leaderOffset(founded.people[change.person].base, baseline));
        }
    });
    it("simulates nothing else about the two years, and stays inside the founding's budget", () => {
        const bare = { ...founded, foreignPolitics: undefined };
        const started = performance.now();
        const sealed = interregnum(bare);
        expect(performance.now() - started).toBeLessThan(400);
        expect(sealed.conflicts).toBe(bare.conflicts);
        expect(sealed.relationships).toBe(bare.relationships);
        expect(sealed.turn).toBe(bare.turn);
    });
    it("seats the same winners from the same seed", () => {
        const again = foundedForBalance("foreign-politics").campaign;
        expect(again.foreignPolitics).toEqual(founded.foreignPolitics);
    });
});
describe("a scheduled selection", () => {
    const nation = "DEU";
    it("resolves on its date, draws its result from the nation's own dated stream, and carries the seat a term on", () => {
        const seat = selectForeignSeat(founded, nation);
        const due = withSeat(founded, nation, { ...seat, next: founded.calendar });
        const after = runWeek(due);
        const change = selectLeadershipChanges(after, nation)[0];
        expect(change.kind).toBe("election");
        expect(change.date).toEqual(founded.calendar);
        const next = after.foreignPolitics.seats[nation].next;
        expect(next).toEqual({ ...founded.calendar, year: founded.calendar.year + termYears("DEU") });
        // The same seed and the same day seat the same winner, however often the week is run.
        expect(foreignPoliticsPhase(due)).toEqual(foreignPoliticsPhase(due));
    });
    it("does not happen before its date", () => {
        const seat = selectForeignSeat(founded, nation);
        const later = withSeat(founded, nation, { ...seat, next: addDays(founded.calendar, 30) });
        expect(selectLeadershipChanges(runWeek(later), nation).filter((change) => !change.projected)).toEqual([]);
    });
    it("is a feed item and never a matter on the desk", () => {
        const seat = selectForeignSeat(founded, nation);
        const after = runWeek(withSeat(founded, nation, { ...seat, next: founded.calendar }));
        expect(after.feed.some((item) => item.kind === "governance" && item.actor === nation)).toBe(true);
        expect(coupMatters(after, after.calendar).filter((matter) => matter.actor === nation)).toEqual([]);
    });
    it("carries the calendar's first date on or after the oath as the seat's next", () => {
        for (const id of ["BEL", "CAN", "KOR"]) {
            expect(selectForeignSeat(founded, id)?.next, id).toEqual(windowSelection(id)?.date);
        }
    });
});
describe("a government falling between elections", () => {
    it("can happen only where the government answers to a parliament", () => {
        const parliamentary = Object.values(founded.nations).find((runtime) => confidenceRate(runtime) > 0);
        expect(parliamentary).toBeDefined();
        expect(confidenceRate(founded.nations["CHN"])).toBe(0);
    });
    it("brings a weak parliamentary government down on a week the dated draw falls under its rate, and calls a snap election", () => {
        const nation = Object.keys(founded.nations).find((id) => confidenceRate(founded.nations[id]) > 0);
        const weak = withPolitics(founded, nation, { legitimacy: 0, factionalism: 1 });
        const rate = confidenceRate(weak.nations[nation]);
        let date = weak.calendar;
        for (let offset = 0; offset < 40_000; offset += 7) {
            date = addDays(weak.calendar, offset);
            if (createRngStreams(weak.seed).stream("foreign-election", nation, "confidence", dateKey(date)).next() < rate)
                break;
        }
        // Returned long enough ago to be brought down, and far enough from its next election that the chamber still bothers.
        const seat = selectForeignSeat(weak, nation);
        const week = withSeat({ ...weak, calendar: date }, nation, { ...seat, mandate: addDays(date, -400), next: addDays(date, 800) });
        // Only this government's packet: a date decades on falls due for every
        // other capital's election too, and their changes would crowd this one out
        // of the record's window.
        const own = foreignPoliticsPhase(week).filter((packet) => packet.provenance?.entities?.[0] === nation);
        const after = own.reduce((acc, packet) => apply(acc, packet), week);
        const change = selectLeadershipChanges(after, nation)[0];
        expect(change.kind).toBe("resignation");
        expect(change.cause).toBe("confidence");
        expect(after.foreignPolitics.seats[nation].next).toEqual(addDays(week.calendar, 42));
    });
});
describe("a coup", () => {
    const nation = "MLI";
    it("is weighed on the regime's survival, its rivals' ambition and how destabilized it is, and stamps its decision when it fires", () => {
        const fragile = withPolitics(founded, nation, { regimeStability: 0 });
        // At zero stability a junta's regime term alone is past 0.009 a week, so a
        // draw above 0.995 clears the threshold whatever the other two terms read.
        let date;
        for (let offset = 0; offset < 40_000 && !date; offset += 7) {
            const candidate = addDays(fragile.calendar, offset);
            if (createRngStreams(fragile.seed).stream("coup", nation, dateKey(candidate)).next() > 0.995)
                date = candidate;
        }
        const seat = selectForeignSeat(fragile, nation);
        const week = withSeat({ ...fragile, calendar: date }, nation, { ...seat, next: addDays(date, 2000) });
        const packets = foreignPoliticsPhase(week);
        const coup = packets.find((packet) => packet.provenance?.decision?.question === "coup-hazard");
        expect(coup).toBeDefined();
        const decision = coup.provenance.decision;
        expect(decision.acts).toBe(true);
        expect(decision.visibility).toBe("intelligence");
        expect(decision.terms.map((term) => term.key)).toEqual(["regime-survival", "rivals-ambition", "destabilized"]);
        // The coup's packet alone, for the reason the confidence vote above gives.
        const after = apply(week, coup);
        const change = selectLeadershipChanges(after, nation)[0];
        expect(change.kind).toBe("coup");
        expect(after.foreignPolitics.seats[nation].party).toBeUndefined();
        expect(foreignLeaderFor(after, nation)?.person).toBe(change.person);
        expect(coupMatters(after, after.calendar).filter((matter) => matter.actor === nation).map((matter) => matter.source)).toEqual(["coup"]);
    });
    it("is off the table for a stable government", () => {
        const stable = withPolitics(founded, "NOR", { regimeStability: 0.9 });
        const packets = foreignPoliticsPhase(stable);
        expect(packets.some((packet) => packet.provenance?.decision?.question === "coup-hazard" && packet.provenance.entities?.[0] === "NOR")).toBe(false);
    });
});
describe("a succession after a lost war", () => {
    it("seats a successor through the same chair and resets the offset against the table's leader", () => {
        const nation = "BRA";
        const before = foreignLeaderFor(founded, nation);
        const after = succeedAfterDefeat(founded, nation);
        const now = foreignLeaderFor(after, nation);
        expect(now.person).not.toBe(before.person);
        const seat = after.foreignPolitics.seats[nation];
        expect(seat.person).toBe(now.person);
        expect(seat.provenance).toBe("played");
        const lead = leadRoleFor(after, nation);
        expect(seat.offset).toEqual(leaderOffset(after.people[now.person].base, after.people[tableIncumbentId(nation, lead)]?.base));
        const change = selectLeadershipChanges(after, nation)[0];
        expect(change).toMatchObject({ kind: "succession", cause: "defeat", person: now.person });
    });
});
describe("a save that stored no seats, loaded mid-term", () => {
    it("holds no selection that fell due before it was loaded, and schedules the next one a term on", () => {
        const later = { ...founded, calendar: { ...founded.calendar, year: founded.calendar.year + 3 } };
        const { foreignPolitics: _stored, ...unstored } = later;
        const loaded = unstored;
        const packets = foreignPoliticsPhase(loaded);
        expect(packets.some((packet) => packet.provenance?.origin === "scheduled")).toBe(false);
        const nation = worldDataset.nations.find((entry) => {
            const window = windowSelection(entry.id);
            return !entry.playable && window !== null && termYears(entry.id) !== null && window.date.year < loaded.calendar.year;
        });
        expect(nation).toBeDefined();
        const seat = selectForeignSeat(loaded, nation.id);
        const window = windowSelection(nation.id).date;
        expect(seat.next).toBeDefined();
        expect(dateKey(seat.next) >= dateKey(loaded.calendar)).toBe(true);
        expect((seat.next.year - window.year) % termYears(nation.id)).toBe(0);
    });
});
describe("a decisive defeat's settlement", () => {
    it("seats the successor the record names and runs the new government's program", () => {
        const found = ["BRA", "DEU", "GBR", "FRA", "JPN", "IND", "CAN", "AUS", "ITA", "ESP", "MEX", "ZAF"].find((nation) => {
            const lost = settle(openConflict(nation, founded.founding.nation, founded.turn, "A test war."), founded.turn, "defender-victory", OUTCOME_LINES.decisiveRepulse);
            return settlementEffects(founded, lost, { decisive: true }).some((effect) => effect.kind === "policy" && effect.nation === nation);
        });
        expect(found).toBeDefined();
        const nation = found;
        const before = foreignLeaderFor(founded, nation);
        const lost = settle(openConflict(nation, founded.founding.nation, founded.turn, "A test war."), founded.turn, "defender-victory", OUTCOME_LINES.decisiveRepulse);
        const after = apply(founded, { source: "simulate", actor: "world", turn: founded.turn, narration: { summary: "The war ends." }, effects: [...settlementEffects(founded, lost, { decisive: true })] });
        const seat = after.foreignPolitics.seats[nation];
        const now = foreignLeaderFor(after, nation);
        expect(now.person).not.toBe(before.person);
        expect(now.person).toBe(seat.person);
        expect(after.governments[nation]).not.toEqual(founded.governments[nation]);
        expect(after.feed.some((item) => item.kind === "governance" && item.actor === nation && item.facts?.instrument === "Change of government")).toBe(true);
    });
});
describe("a change of governing party", () => {
    it("re-runs the program on the new party's platform, the week it is seated", () => {
        const norms = worldNorms(founded.nations);
        const found = Object.entries(founded.nations).find(([id, runtime]) => {
            if (id === founded.founding.nation)
                return false;
            const parties = runtime.base.partySystem.parties;
            if (parties.length < 2)
                return false;
            const held = founded.governments[id];
            const other = chooseGovernmentProgram(runtime, norms, purseContext(founded, id), parties[1].id);
            return JSON.stringify(other) !== JSON.stringify(held);
        });
        expect(found).toBeDefined();
        const [id, runtime] = found;
        const party = runtime.base.partySystem.parties[1].id;
        const effects = programOfNewGovernment(founded, id, party);
        const after = apply(founded, { source: "simulate", actor: "world", turn: founded.turn, narration: { summary: "A new government." }, effects });
        expect(after.governments[id]).toEqual(chooseGovernmentProgram(runtime, norms, purseContext(founded, id), party));
        expect(after.feed.some((item) => item.kind === "governance" && item.actor === id)).toBe(true);
    });
});
describe("a leader who dies in office", () => {
    // Every government whose cast has nobody else eligible for the chair: without
    // a stand-in, a death there left the dead leader holding it.
    const lone = Object.keys(founded.nations).filter((nation) => {
        const lead = leadRoleFor(founded, nation);
        const holder = selectForeignSeat(founded, nation)?.person;
        return nation !== founded.founding.nation && lead && holder && !Object.values(founded.people).some((runtime) => runtime.alive && runtime.base.nationality === nation && runtime.base.id !== holder && runtime.base.eligibleRoles.includes(lead));
    });
    it("is succeeded even where the cast drew nobody else for the chair, by someone in government", () => {
        expect(lone.length).toBeGreaterThan(0);
        for (const nation of lone.slice(0, 10)) {
            const holder = selectForeignSeat(founded, nation).person;
            const dead = { ...founded, people: { ...founded.people, [holder]: { ...founded.people[holder], alive: false } } };
            const after = runWeek(dead);
            const seat = selectForeignSeat(after, nation);
            expect(seat.person).not.toBe(holder);
            const successor = after.people[seat.person];
            expect(successor.alive).toBe(true);
            expect(successor.base.nationality).toBe(nation);
            expect(successor.base.eligibleRoles.some((role) => role !== "role-journalist" && role !== "role-opposition-leader")).toBe(true);
            expect(selectLeadershipChanges(after, nation)[0]).toMatchObject({ kind: "succession", cause: "death", predecessor: holder });
        }
    });
});
