import { describe, expect, it } from "vitest";
import { DAYS_PER_TURN, DISAPPROVAL_WINDOW_TURNS, SHUTDOWN_GRACE_TURNS, addDays, campaignDay, selectCampaignClock, } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { allReadings, dueClocks, dueSummonses, specFor, stopsTheWeek, summonsReading } from "./registry";
import { CLOCKS } from "./clocks";
import { dateLabel } from "./clock-math";
/** The clocks that stop the week rather than waiting in the inbox. */
function interrupting(campaign) {
    return dueClocks(campaign).filter(stopsTheWeek);
}
/**
 * What arms each clock, one clock at a time.
 *
 * The founding is the control: a presidency in its first week has no bill, no
 * nomination, no rule and no war, so every clock but the two the calendar
 * always carries is silent, and the acting authority the four political
 * offices open under while the President's picks wait on the Senate. Each case below adds exactly one subject to that
 * state and proves the one clock it belongs to woke up — which is the property
 * that keeps a summons a reading of the campaign rather than a list of things
 * the app knows how to say.
 */
const founding = openingCampaign();
/** The clocks a presidency carries from its first week, with nothing yet done. */
const ALWAYS_RUNNING = ["appropriation", "election-milestone", "acting-authority"];
function armed(campaign) {
    return dueSummonses(campaign).map((summons) => summons.spec.id);
}
function isArmed(campaign, id) {
    return specFor(id)?.due(campaign) !== undefined;
}
/** A campaign funded through a given week, viewed from a given week. */
function fundedThrough(throughTurn, turn) {
    return {
        ...founding,
        turn,
        congress: {
            ...founding.congress,
            appropriation: { enactedTurn: 2, throughTurn, onPriorYear: false, priorYear: [] },
        },
    };
}
function withRule(campaign, rule) {
    return { ...campaign, pendingRules: [rule] };
}
describe("what arms each clock", () => {
    it("carries only the calendar's own clocks at the founding", () => {
        expect([...armed(founding)].sort()).toEqual([...ALWAYS_RUNNING].sort());
    });
    it("leaves every other clock with nothing to say rather than an empty row", () => {
        for (const spec of CLOCKS) {
            if (ALWAYS_RUNNING.includes(spec.id))
                continue;
            expect(spec.due(founding), `${spec.id} armed with no subject`).toBeUndefined();
        }
    });
    describe("the money", () => {
        it("arms the appropriation the week the funding it authorized runs out", () => {
            expect(specFor("appropriation")?.due(fundedThrough(10, 11))?.urgency).toBe("due");
            expect(specFor("appropriation")?.due(fundedThrough(10, 10))?.urgency).toBe("closing");
        });
        it("names the stopgap for what it is when the government is running on one", () => {
            const onPriorYear = {
                ...fundedThrough(10, 9),
                congress: {
                    ...founding.congress,
                    appropriation: { enactedTurn: 2, throughTurn: 10, onPriorYear: true, priorYear: [] },
                },
            };
            expect(specFor("appropriation")?.compose(onPriorYear).title).toBe("Short-term funding runs out");
            expect(specFor("appropriation")?.compose(fundedThrough(10, 9)).title).toBe("Government funding runs out");
        });
        it("does not arm the shutdown while the grace window is still running", () => {
            const inGrace = fundedThrough(10, 10 + SHUTDOWN_GRACE_TURNS);
            expect(isArmed(inGrace, "shutdown")).toBe(false);
            expect(isArmed(inGrace, "appropriation")).toBe(true);
        });
        it("arms the shutdown once the grace window has run out", () => {
            const closed = fundedThrough(10, 10 + SHUTDOWN_GRACE_TURNS + 1);
            expect(specFor("shutdown")?.due(closed)?.urgency).toBe("due");
        });
        it("hands the Budget one clock at a time rather than badging it twice", () => {
            // The money running out and the doors closing are two readings of one
            // fact. The shutdown is the truer one once it is true, and it takes the
            // appropriation's place rather than standing beside it.
            const closed = fundedThrough(10, 14);
            expect(isArmed(closed, "shutdown")).toBe(true);
            expect(isArmed(closed, "appropriation")).toBe(false);
            expect(armed(closed).filter((id) => specFor(id)?.owner === "budget")).toEqual(["shutdown"]);
        });
        it("counts the shutdown up, in days closed, and names what has stopped", () => {
            const closed = fundedThrough(10, 15);
            const brief = specFor("shutdown")?.compose(closed);
            expect(brief?.title).toBe("The government is closed");
            expect(brief?.stance).toBe("adverse");
            // Funded through week 10 and a two-week grace puts the closure at week
            // 12, so week 15 is the fourth week of it — counted the engine's own way
            // rather than by the surface's own arithmetic.
            expect(brief?.figure).toBe("4 weeks");
            expect(Number(brief?.posture.find((cell) => cell.key === "bodies")?.figure)).toBeGreaterThan(0);
        });
        it("reads the last closure off the record rather than inventing one", () => {
            const closed = {
                ...fundedThrough(10, 15),
                lapses: [
                    { id: "lapse:1", begunTurn: 3, endedTurn: 5, endedBy: "continuing-resolution" },
                    { id: "lapse:12", begunTurn: 12 },
                ],
            };
            const prior = specFor("shutdown")?.compose(closed).history.find((line) => line.key === "prior");
            expect(prior?.detail).toBe(`${2 * DAYS_PER_TURN} days, ended ${dateLabel(closed, 5)} by a short-term funding bill.`);
        });
        it("says nothing about a prior closure when there has not been one", () => {
            const brief = specFor("shutdown")?.compose(fundedThrough(10, 15));
            expect(brief?.history.some((line) => line.key === "prior")).toBe(false);
        });
        it("interrupts the week the government is closed", () => {
            expect(interrupting(fundedThrough(10, 15)).map((s) => s.spec.id)).toContain("shutdown");
        });
    });
    describe("the desk and the chamber", () => {
        it("arms the bill desk on a bill awaiting signature", () => {
            const bill = {
                id: "bill:test:4",
                act: "act-test",
                title: "A Bill To Do Something",
                sponsor: "bipartisan",
                introducedTurn: 4,
                status: "on-the-desk",
                passage: [{ chamber: "house", yeas: 240, nays: 190, required: 218, passed: true }],
            };
            const withBill = { ...founding, turn: 5, bills: { [bill.id]: bill } };
            expect(isArmed(withBill, "bill-desk")).toBe(true);
            expect(specFor("bill-desk")?.compose(withBill).title).toBe(bill.title);
        });
        it("arms the AUMF on an authorization that has not yet expired", () => {
            const withAumf = {
                ...founding,
                congress: {
                    ...founding.congress,
                    authorizations: [
                        {
                            id: "aumf:test:1",
                            title: "Authorization for the Use of Military Force",
                            target: founding.founding.nation,
                            enactedTurn: 1,
                            expiresTurn: 5,
                            vote: [],
                        },
                    ],
                },
            };
            expect(specFor("aumf-expiry")?.due(withAumf)?.dueTurn).toBe(5);
            expect(isArmed({ ...withAumf, turn: 6 }, "aumf-expiry")).toBe(false);
        });
        it("arms ratification on a treaty the Senate has not taken up", () => {
            const treaty = {
                id: "treaty:trade:X:2",
                treaty: "trade",
                title: "A Trade Agreement",
                kind: "trade",
                counterpart: founding.founding.nation,
                signedTurn: 2,
                status: "signed",
            };
            const withTreaty = { ...founding, turn: 8, treaties: { [treaty.id]: treaty } };
            expect(isArmed(withTreaty, "treaty-ratification")).toBe(true);
            // Six weeks on the Senate's desk reads as closing, not as calendar.
            expect(specFor("treaty-ratification")?.due(withTreaty)?.urgency).toBe("closing");
        });
    });
    describe("the rules the orders become", () => {
        const rule = {
            id: "order-border-controls:2",
            order: "order-border-controls",
            signedTurn: 2,
            effectiveTurn: 10,
            status: "pending",
        };
        it("arms the effective-date clock on a proceeding that is running", () => {
            const campaign = withRule({ ...founding, turn: 9 }, rule);
            expect(specFor("rule-effective")?.due(campaign)?.dueTurn).toBe(10);
            expect(specFor("rule-effective")?.due(campaign)?.urgency).toBe("closing");
        });
        it("stands the effective-date clock down once the rule has landed", () => {
            const landed = withRule({ ...founding, turn: 11 }, { ...rule, status: "in-effect", resolvedTurn: 10 });
            expect(isArmed(landed, "rule-effective")).toBe(false);
        });
        it("names the order rather than its id", () => {
            const campaign = withRule({ ...founding, turn: 9 }, rule);
            const title = specFor("rule-effective")?.compose(campaign).title;
            expect(title).not.toContain("order-border-controls");
            expect(title?.startsWith("The rule behind ")).toBe(true);
        });
        it("reads what the same order's earlier proceedings came to", () => {
            const campaign = withRule({ ...founding, turn: 9 }, rule);
            const withPrior = {
                ...campaign,
                pendingRules: [
                    { ...rule, id: "order-border-controls:1", signedTurn: 1, status: "disapproved", resolvedTurn: 6 },
                    rule,
                ],
            };
            const history = specFor("rule-effective")?.compose(withPrior).history;
            expect(history?.find((line) => line.label === dateLabel(withPrior, 6))?.detail).toContain("Congress voted to cancel the rule");
        });
        it("arms the disapproval window on a rule that has just bound the country", () => {
            const landed = withRule({ ...founding, turn: 11 }, { ...rule, status: "in-effect", resolvedTurn: 10 });
            const due = specFor("rule-disapproval")?.due(landed);
            expect(due?.urgency).toBe("closing");
            expect(due?.dueTurn).toBe(10 + DISAPPROVAL_WINDOW_TURNS);
        });
        it("quiets the disapproval window to the calendar once Congress has moved on", () => {
            const older = withRule({ ...founding, turn: 15 }, { ...rule, status: "in-effect", resolvedTurn: 10 });
            expect(specFor("rule-disapproval")?.due(older)?.urgency).toBe("standing");
        });
        it("never paints the window adverse: it closing is the President's good news", () => {
            for (let turn = 10; turn <= 10 + DISAPPROVAL_WINDOW_TURNS; turn += 1) {
                const campaign = withRule({ ...founding, turn }, { ...rule, status: "in-effect", resolvedTurn: 10 });
                expect(specFor("rule-disapproval")?.due(campaign)?.urgency).not.toBe("due");
            }
        });
        it("stands down once the window has run out", () => {
            const past = withRule({ ...founding, turn: 10 + DISAPPROVAL_WINDOW_TURNS + 1 }, { ...rule, status: "in-effect", resolvedTurn: 10 });
            expect(isArmed(past, "rule-disapproval")).toBe(false);
        });
        it("hands the fact to the desk once a resolution is actually introduced", () => {
            // A resolution of disapproval is a bill, and a bill on the desk is the
            // desk clock's subject. Two clocks on one signature would badge Policy
            // and Congress for the same act.
            const landed = withRule({ ...founding, turn: 11 }, { ...rule, status: "in-effect", resolvedTurn: 10 });
            const resolution = {
                id: "bill:act-disapproval:11",
                act: "act-rule-disapproval",
                title: "Joint Resolution of Disapproval",
                sponsor: "opposition",
                introducedTurn: 11,
                status: "on-the-desk",
                passage: [],
                target: rule.order,
            };
            const contested = { ...landed, bills: { [resolution.id]: resolution } };
            expect(isArmed(contested, "rule-disapproval")).toBe(false);
            expect(isArmed(contested, "bill-desk")).toBe(true);
        });
    });
    describe("war powers, appointments and the courts", () => {
        // Dated off the campaign's own day count rather than off a literal, so the
        // 48-hour window is two days from the week under test whatever week that is.
        //
        // `extra` is typed rather than a bag of unknowns: the resolution names
        // three kinds of introduction and counts its sixty days against exactly one
        // of them, so a fixture free to invent a fourth proves a clock nobody runs.
        function withObligation(turn, extra = {}) {
            // Turn and calendar move together. Stored foundingDate made campaignDay
            // calendar-owned; bumping turn alone leaves the presidency on day zero
            // and the sixty-day termination clock never runs out.
            const weeks = turn - founding.turn;
            const base = {
                ...founding,
                turn,
                calendar: addDays(founding.calendar, weeks * DAYS_PER_TURN),
            };
            // Opened on the day the campaign under test is actually on, so the
            // 48-hour window below is two days from that day, not from inauguration.
            const openedDay = campaignDay(base);
            const obligation = {
                id: "wpr:test",
                target: founding.founding.nation,
                // An introduction into hostilities, unauthorized and still in place,
                // which is the only shape the sixty-day termination clock counts down.
                kind: "hostilities",
                rung: 4,
                openedDay,
                openedDate: base.calendar,
                dueDay: openedDay + 2,
                description: "Forces were committed against a hostile air defense network.",
                ...extra,
            };
            return {
                ...base,
                security: { ...base.security, warPowers: { obligations: [obligation] } },
            };
        }
        it("arms the report clock on an introduction nobody has reported", () => {
            const campaign = withObligation(2);
            expect(isArmed(campaign, "war-powers-report")).toBe(true);
            // Two days, which is what the statute says and what the figure must show:
            // rounding a 48-hour obligation to a week understates it.
            expect(specFor("war-powers-report")?.compose(campaign).figure).toBe("2 days");
            expect(campaignDay(campaign)).toBe(selectCampaignClock(campaign).ordinal);
        });
        it("stands the report clock down once the report is filed", () => {
            const filed = withObligation(2, {
                // Inside the forty-eight hours: the obligation opened on day 7 and was
                // owed on day 9.
                filing: {
                    filedDay: 8,
                    filedDate: founding.calendar,
                    authorityClaimed: "Article II",
                    scope: "Suppression of air defenses covering the corridor.",
                    estimatedWeeks: 3,
                },
            });
            expect(isArmed(filed, "war-powers-report")).toBe(false);
            // The termination clock keeps running: filing a report is not a vote.
            expect(isArmed(filed, "war-powers-termination")).toBe(true);
        });
        it("arms the termination clock and interrupts once the window has run out", () => {
            // Committed on day 7 and read in week 20: past sixty days with no vote,
            // which is the week the forces must come home.
            const past = withObligation(20, { openedDay: 7, dueDay: 9 });
            expect(specFor("war-powers-termination")?.due(past)?.urgency).toBe("due");
            expect(interrupting(past).map((s) => s.spec.id)).toContain("war-powers-termination");
        });
        it("arms the nomination clock on a name before the Senate", () => {
            const nomination = {
                id: "nom:test",
                office: Object.keys(founding.institutions).length > 0 ? "office-state" : "office-state",
                institution: "inst-state",
                nominee: "person-1",
                stage: "hearing-scheduled",
                stageEnteredDay: 5,
                openedDay: 1,
                controversies: [],
                history: [],
            };
            const campaign = { ...founding, turn: 3, nominations: { [nomination.id]: nomination } };
            expect(isArmed(campaign, "nomination-stage")).toBe(true);
        });
        it("arms the ruling clock on an order the courts have taken up", () => {
            const campaign = {
                ...founding,
                turn: 6,
                orders: [
                    {
                        id: "order-border-controls:2",
                        order: "order-border-controls",
                        turn: 2,
                        contested: true,
                        challengeChance: 0.4,
                        review: { dueTurn: 8, status: "pending" },
                    },
                ],
            };
            expect(specFor("ruling-due")?.due(campaign)?.dueTurn).toBe(8);
            const upheld = {
                ...campaign,
                orders: [{ ...campaign.orders[0], review: { dueTurn: 8, status: "upheld", ruledTurn: 8 } }],
            };
            expect(isArmed(upheld, "ruling-due")).toBe(false);
        });
        it("arms acting authority on a seat held by someone the Senate never confirmed", () => {
            const [id, runtime] = Object.entries(founding.institutions)[0];
            const campaign = {
                ...founding,
                institutions: {
                    ...founding.institutions,
                    [id]: { ...runtime, actingLeader: "person-1", actingExpiresDay: 30 },
                },
            };
            // Inauguration is day zero, so a seat that expires on day 30 is thirty
            // days out of a founding week. The date is the record here; the week
            // ordinal is derived from it, and it rounds a part week up.
            expect(campaignDay(campaign)).toBe(0);
            const due = specFor("acting-authority")?.due(campaign);
            expect(due?.dueDate).toEqual(addDays(campaign.calendar, 30));
            // The turn the deadline falls in: thirty days from inauguration is week five, not the week after it.
            expect(due?.dueTurn).toBe(campaign.turn + Math.floor(30 / DAYS_PER_TURN));
        });
    });
    describe("the seat itself", () => {
        it("keeps the election on the calendar rather than interrupting for it every week", () => {
            expect(specFor("election-milestone")?.due(founding)?.urgency).toBe("standing");
            expect(interrupting(founding)).toHaveLength(0);
        });
        it("arms the removal beat only within reach of the next step on the ladder", () => {
            const quiet = { ...founding, removal: { ...founding.removal, pressure: 0.1 } };
            expect(isArmed(quiet, "removal-beat")).toBe(false);
            const near = { ...founding, removal: { ...founding.removal, pressure: 0.44 } };
            expect(specFor("removal-beat")?.due(near)?.urgency).toBe("due");
        });
        it("stops asking once the arc has resolved", () => {
            const resolved = {
                ...founding,
                removal: { ...founding.removal, pressure: 0.44, resolved: true },
            };
            expect(isArmed(resolved, "removal-beat")).toBe(false);
        });
    });
    describe("the re-read path", () => {
        it("opens a clock that is no longer running, and says that it is not", () => {
            const reading = summonsReading(founding, "bill-desk");
            expect(reading).toBeDefined();
            expect(reading?.due).toBeUndefined();
            // The spec's own account of the quiet state, not a countdown against a
            // bill that does not exist.
            expect(reading?.brief.title).toBe("No bills to sign");
            expect(reading?.brief.figure).toBe("None");
        });
        it("returns nothing for an id no clock answers to", () => {
            expect(summonsReading(founding, "not-a-clock")).toBeUndefined();
        });
        it("indexes every clock for the Record, running ones first", () => {
            const readings = allReadings(founding);
            expect(readings.map((reading) => reading.spec.id).sort()).toEqual(CLOCKS.map((spec) => spec.id).sort());
            const firstStopped = readings.findIndex((reading) => reading.due === undefined);
            const lastRunning = readings.map((r) => r.due !== undefined).lastIndexOf(true);
            expect(lastRunning).toBeLessThan(firstStopped);
        });
        it("composes a readable brief for every clock, running or not", () => {
            for (const reading of allReadings(founding)) {
                const text = [reading.brief.title, reading.brief.clockLine, reading.brief.figure, reading.brief.counsel].join(" ");
                expect(text, reading.spec.id).not.toMatch(/undefined|NaN|\[object Object\]/);
            }
        });
    });
});
