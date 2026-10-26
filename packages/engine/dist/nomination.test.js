import { describe, expect, it } from "vitest";
import { AGENCY_HEAD_ROLE } from "@admin/world";
import { campaignDay, nominationAge, nominationPhase, outcomeHeadline, openNomination, selectNomination, selectPendingOnFloor, vettingFindings, fillVacantOffices, selectNominableFor, withdrawNomination, } from "./nomination.js";
import { selectActiveNominations, stageDuration } from "./nomination-stages.js";
import { selectPipelineReading } from "./nomination-reading.js";
import { hasLegalCareer, seatRuleRefusal } from "./appointment-eligibility.js";
import { campaignFoundingDate, selectCampaignClock } from "./clock.js";
import { apply } from "./effects.js";
import { INSTITUTION_CATALOG, officeInstitution } from "./institutions.js";
import { removeOfficer } from "./career-incumbents.js";
import { foundedForBalance } from "./balance-harness.js";
import { dismissMinister, selectAppointableFor } from "./appointments.js";
import { seatByDecree } from "./god.js";
import { buildCampaign, person, withWeeksElapsed } from "./__fixtures__/campaign.js";
const OFFICE = "OFF-DEFENSE-SEC";
// The cast is keyed by a branded PersonId; the fixture people map is typed on
// that brand, so the test id has to wear it too.
const NOMINEE = "PER-NOMINEE";
function withCandidate(campaign, overrides = {}) {
    const candidate = { ...person, ...overrides, id: NOMINEE };
    return {
        ...campaign,
        people: {
            ...campaign.people,
            [NOMINEE]: { base: candidate, alive: true },
        },
    };
}
function openOn(campaign) {
    const result = openNomination(campaign, OFFICE, NOMINEE);
    if (!result.ok)
        throw new Error(result.reason);
    return apply(campaign, result.packet);
}
/** Run the world forward until the nomination leaves the pipeline, or we give up. */
function runToTerminal(start, maxTurns = 200) {
    let campaign = start;
    for (let turn = 1; turn <= maxTurns; turn += 1) {
        campaign = withWeeksElapsed(campaign, 1);
        for (const packet of nominationPhase(campaign)) {
            campaign = apply(campaign, packet);
        }
        if (selectActiveNominations(campaign).length === 0)
            return { campaign, turns: turn };
    }
    return { campaign, turns: maxTurns };
}
/** The campaign with a department's chair emptied the way a president empties one. */
function withEmptyChair(campaign, office) {
    const role = officeInstitution(office)?.cabinetRole;
    if (!role)
        throw new Error(`${office} is no cabinet chair`);
    const dismissed = dismissMinister(campaign, role);
    if (!dismissed.ok)
        throw new Error(dismissed.reason);
    return apply(campaign, dismissed.packet);
}
function packetOf(result) {
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
function stageOf(campaign) {
    const nomination = Object.values(campaign.nominations)[0];
    if (!nomination)
        throw new Error("no nomination");
    return nomination.stage;
}
describe("which chamber the wire names", () => {
    const { campaign: founded } = foundedForBalance("succession-line", "democrat");
    const nomination = {
        id: "OFF-VP:1",
        office: "OFF-VP",
        institution: "INST-OVP",
        nominee: founded.vicePresident,
        stage: "vote",
        stageEnteredDay: 1,
        openedDay: 1,
        controversies: [],
        history: [],
    };
    it("counts a nominee's age from the founding, not from the age on their file", () => {
        const young = { ...person, age: 34 };
        const pinned = { ...founded, foundingDate: campaignFoundingDate(founded) };
        expect(seatRuleRefusal(pinned, "OFF-VP", young)).toContain("is 34");
        const later = { ...pinned, calendar: { ...founded.calendar, year: founded.calendar.year + 2 } };
        expect(seatRuleRefusal(later, "OFF-VP", young)).toBeUndefined();
    });
    it("names the House when the House is the chamber that said no to a Vice President", () => {
        const line = outcomeHeadline(founded, nomination, "rejected", "rejected in the House");
        expect(line?.headline).toMatch(/^The House rejects .* for Vice President\.$/);
    });
    it("names the Senate for a floor defeat and Congress for a two-house confirmation", () => {
        expect(outcomeHeadline(founded, nomination, "rejected", "rejected on the floor")?.headline).toMatch(/^The Senate rejects/);
        expect(outcomeHeadline(founded, nomination, "confirmed")?.headline).toMatch(/^Congress confirms .* as Vice President\.$/);
    });
});
describe("sending a name up", () => {
    it("opens a nomination in vetting, not in a vote", () => {
        // The single most important thing this replaces: confirmation was one
        // instantaneous majority check, which is a named rejection criterion.
        const campaign = openOn(withCandidate(buildCampaign()));
        expect(stageOf(campaign)).toBe("vetting");
        expect(selectActiveNominations(campaign)).toHaveLength(1);
    });
    it("refuses a second nomination to a seat already contested", () => {
        const campaign = openOn(withCandidate(buildCampaign()));
        const again = openNomination(campaign, OFFICE, NOMINEE);
        expect(again.ok).toBe(false);
    });
    it("refuses an office that does not exist", () => {
        expect(openNomination(withCandidate(buildCampaign()), "OFF-NOWHERE", NOMINEE).ok).toBe(false);
    });
    it("refuses someone who already holds an office", () => {
        const campaign = withCandidate(buildCampaign());
        const seated = {
            ...campaign,
            people: {
                ...campaign.people,
                [NOMINEE]: { ...campaign.people[NOMINEE], currentRole: "ROLE-X" },
            },
        };
        expect(openNomination(seated, OFFICE, NOMINEE).ok).toBe(false);
    });
    it("lets the President send up a name the Senate will not take", () => {
        // Deliberate: choosing to have the fight in public is a presidential act,
        // and refusing it would make the Senate a validator rather than an obstacle.
        const campaign = withCandidate(buildCampaign(), { integrity: 0.05, competence: 0.05 });
        const hostile = { ...campaign, congress: { ...campaign.congress, disposition: 0.05 } };
        expect(openNomination(hostile, OFFICE, NOMINEE).ok).toBe(true);
    });
    it("decides what vetting finds from the person, not from a draw", () => {
        // The same nominee is the same nominee: a president cannot reroll a
        // problem away by withdrawing and sending the name up again.
        const dubious = { ...person, integrity: 0.1, competence: 0.1, ambition: 0.95 };
        expect(vettingFindings(dubious)).toEqual(vettingFindings(dubious));
        expect(vettingFindings(dubious).length).toBe(3);
        expect(vettingFindings({ ...person, integrity: 0.9, competence: 0.9, ambition: 0.4 })).toEqual([]);
    });
});
describe("the pipeline consumes calendar time", () => {
    it("does not seat a nominee in the week they were named", () => {
        let campaign = openOn(withCandidate(buildCampaign(), { integrity: 0.9, competence: 0.9, ambition: 0.3 }));
        campaign = withWeeksElapsed(campaign, 1);
        for (const packet of nominationPhase(campaign))
            campaign = apply(campaign, packet);
        expect(stageOf(campaign)).not.toBe("confirmed");
        expect(campaign.institutions["INST-DOD"].vacancy).toBe(true);
    });
    it("takes months, not turns, for a friendly Senate to seat a clean nominee", () => {
        const base = withCandidate(buildCampaign(), { integrity: 0.9, competence: 0.9, ambition: 0.3 });
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.9 } };
        const { campaign, turns } = runToTerminal(openOn(friendly));
        const nomination = Object.values(campaign.nominations)[0];
        expect(nomination.stage).toBe("sworn-in");
        // Roughly four months at seven days a turn. The exact figure is not the
        // claim; that it is months rather than one turn is.
        expect(turns).toBeGreaterThan(12);
        expect(turns).toBeLessThan(40);
    });
    it("walks every stage rather than jumping to the end", () => {
        const base = withCandidate(buildCampaign(), { integrity: 0.9, competence: 0.9, ambition: 0.3 });
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.9 } };
        const { campaign } = runToTerminal(openOn(friendly));
        const stages = Object.values(campaign.nominations)[0].history.map((step) => step.stage);
        for (const required of [
            "vetting",
            "nominated",
            "referred",
            "disclosures",
            "hearing",
            "committee-action",
            "executive-calendar",
            "floor-pending",
            "vote",
            "confirmed",
            "sworn-in",
        ]) {
            expect(stages, `missing ${required}`).toContain(required);
        }
    });
    it("makes a hostile Senate slower than a friendly one at the same stage", () => {
        const base = openOn(withCandidate(buildCampaign()));
        const nomination = { ...Object.values(base.nominations)[0], stage: "hearing-scheduled" };
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.9 } };
        const hostile = { ...base, congress: { ...base.congress, disposition: 0.1 } };
        expect(stageDuration(hostile, nomination)).toBeGreaterThan(stageDuration(friendly, nomination));
    });
    it("does not let Senate hostility slow down the White House's own vetting", () => {
        // Vetting happens in the West Wing. A Senate that dislikes the president
        // cannot make the FBI paperwork take longer, and pretending it could would
        // make disposition a universal multiplier rather than a Senate fact.
        const base = openOn(withCandidate(buildCampaign()));
        const nomination = Object.values(base.nominations)[0];
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.9 } };
        const hostile = { ...base, congress: { ...base.congress, disposition: 0.1 } };
        expect(stageDuration(hostile, nomination)).toBe(stageDuration(friendly, nomination));
    });
});
describe("floor time is the scarce thing", () => {
    it("slows a nomination down when the calendar is crowded", () => {
        const base = openOn(withCandidate(buildCampaign()));
        const waiting = Object.values(base.nominations)[0];
        const onCalendar = { ...waiting, stage: "floor-pending" };
        const crowd = {};
        for (let i = 0; i < 20; i += 1) {
            crowd[`queued-${i}`] = { ...onCalendar, id: `queued-${i}`, office: `OFF-QUEUED-${i}` };
        }
        const congested = { ...base, nominations: { ...crowd, [onCalendar.id]: onCalendar } };
        const clear = { ...base, nominations: { [onCalendar.id]: onCalendar } };
        expect(selectPendingOnFloor(congested).length).toBeGreaterThan(selectPendingOnFloor(clear).length);
        expect(stageDuration(congested, onCalendar)).toBeGreaterThan(stageDuration(clear, onCalendar));
    });
    it("does not let committee work be slowed by the floor queue", () => {
        const base = openOn(withCandidate(buildCampaign()));
        const inCommittee = { ...Object.values(base.nominations)[0], stage: "disclosures" };
        const crowd = {};
        for (let i = 0; i < 20; i += 1) {
            crowd[`queued-${i}`] = { ...inCommittee, id: `queued-${i}`, stage: "floor-pending" };
        }
        const congested = { ...base, nominations: { ...crowd, [inCommittee.id]: inCommittee } };
        const clear = { ...base, nominations: { [inCommittee.id]: inCommittee } };
        expect(stageDuration(congested, inCommittee)).toBe(stageDuration(clear, inCommittee));
    });
});
describe("the ways a nomination dies", () => {
    it("can die in committee without ever being voted down", () => {
        // Most nominations that fail are never voted on at all. Modeling only the
        // floor vote made the Senate look far more decisive than it is.
        const base = withCandidate(buildCampaign(), { integrity: 0.1, competence: 0.2, ambition: 0.95 });
        const hostile = { ...base, congress: { ...base.congress, disposition: 0.05 } };
        const { campaign } = runToTerminal(openOn(hostile));
        const nomination = Object.values(campaign.nominations)[0];
        expect(nomination.stage).toBe("returned");
        expect(nomination.outcome).toContain("committee");
    });
    it("costs standing to withdraw a name", () => {
        const campaign = openOn(withCandidate(buildCampaign()));
        const id = Object.values(campaign.nominations)[0].id;
        const result = withdrawNomination(campaign, id);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const after = apply(campaign, result.packet);
        expect(after.player.metrics.standing).toBeLessThan(campaign.player.metrics.standing);
        expect(selectNomination(after, id).stage).toBe("withdrawn");
        expect(selectActiveNominations(after)).toHaveLength(0);
    });
    it("refuses to withdraw a nomination that has already ended", () => {
        const campaign = openOn(withCandidate(buildCampaign()));
        const id = Object.values(campaign.nominations)[0].id;
        const first = withdrawNomination(campaign, id);
        if (!first.ok)
            throw new Error(first.reason);
        expect(withdrawNomination(apply(campaign, first.packet), id).ok).toBe(false);
    });
    it("keeps a failed nomination in the record rather than deleting it", () => {
        const campaign = openOn(withCandidate(buildCampaign()));
        const id = Object.values(campaign.nominations)[0].id;
        const result = withdrawNomination(campaign, id);
        if (!result.ok)
            return;
        expect(Object.keys(apply(campaign, result.packet).nominations)).toContain(id);
    });
});
describe("a projection is a projection", () => {
    it("can be overtaken by the Senate changing its mind before the vote", () => {
        // The mission's own requirement: support may change before the actual vote.
        // Same nominee, same stage, different Senate, different answer.
        const base = withCandidate(buildCampaign(), { integrity: 0.8, competence: 0.8, ambition: 0.3 });
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.95 } };
        const seated = runToTerminal(openOn(friendly)).campaign;
        expect(Object.values(seated.nominations)[0].history.map((step) => step.stage)).toContain("confirmed");
        // The same name, sent up into a Senate that has turned, does not get there.
        const turned = { ...base, congress: { ...base.congress, disposition: 0.02 } };
        const lost = runToTerminal(openOn(turned)).campaign;
        expect(Object.values(lost.nominations)[0].stage).not.toBe("sworn-in");
    });
});
describe("confirmation seats somebody", () => {
    it("fills the institution's chair and clears its vacancy", () => {
        const base = withCandidate(buildCampaign(), { integrity: 0.9, competence: 0.9, ambition: 0.3 });
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.9 } };
        expect(friendly.institutions["INST-DOD"].vacancy).toBe(true);
        const { campaign } = runToTerminal(openOn(friendly));
        const dod = campaign.institutions["INST-DOD"];
        expect(dod.vacancy).toBe(false);
        expect(dod.leader).toBe(NOMINEE);
        expect(dod.vacantDays).toBe(0);
    });
    it("leaves the chair empty when the nomination fails", () => {
        const base = withCandidate(buildCampaign(), { integrity: 0.1, competence: 0.15, ambition: 0.95 });
        const hostile = { ...base, congress: { ...base.congress, disposition: 0.02 } };
        const { campaign } = runToTerminal(openOn(hostile));
        expect(campaign.institutions["INST-DOD"].vacancy).toBe(true);
        expect(campaign.institutions["INST-DOD"].leader).toBeUndefined();
    });
    it("moves state only through apply()", () => {
        const campaign = withCandidate(buildCampaign());
        const result = openNomination(campaign, OFFICE, NOMINEE);
        if (!result.ok)
            throw new Error(result.reason);
        // The builder returned a packet and changed nothing.
        expect(Object.keys(campaign.nominations)).toHaveLength(0);
        expect(Object.keys(apply(campaign, result.packet).nominations)).toHaveLength(1);
    });
    it("stamps the nomination's provenance so a later effect can name it", () => {
        const campaign = withCandidate(buildCampaign());
        const result = openNomination(campaign, OFFICE, NOMINEE);
        if (!result.ok)
            throw new Error(result.reason);
        const after = apply(campaign, result.packet);
        const entry = after.ledger[after.ledger.length - 1];
        expect(entry.causal?.origin).toBe("decision");
        expect(entry.causal?.systems).toContain("nominations");
        expect(entry.causal?.eventId).toBeTruthy();
    });
});
describe("reading the pipeline", () => {
    it("counts nothing on an administration that has named nobody", () => {
        const reading = selectPipelineReading(buildCampaign());
        expect(reading.total).toBe(0);
        expect(reading.medianDays).toBe(0);
    });
    it("reports where the President's names actually are", () => {
        const campaign = openOn(withCandidate(buildCampaign()));
        const reading = selectPipelineReading(campaign);
        expect(reading.total).toBe(1);
        expect(reading.inExecutive).toBe(1);
        expect(reading.inCommittee).toBe(0);
        expect(reading.onFloor).toBe(0);
    });
    it("reports a real median time-to-seat once somebody is seated", () => {
        const base = withCandidate(buildCampaign(), { integrity: 0.9, competence: 0.9, ambition: 0.3 });
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.9 } };
        const { campaign } = runToTerminal(openOn(friendly));
        const reading = selectPipelineReading(campaign);
        expect(reading.confirmed).toBe(1);
        expect(reading.medianDays).toBeGreaterThan(60);
    });
    it("stamps a nomination with the day the campaign clock is actually on", () => {
        const campaign = buildCampaign();
        expect(campaignDay(campaign)).toBe(selectCampaignClock(campaign).ordinal);
        const opened = openOn(withCandidate(campaign));
        const nomination = selectActiveNominations(opened)[0];
        expect(nomination.openedDay).toBe(selectCampaignClock(opened).ordinal);
        expect(nominationAge(opened, nomination)).toBe(0);
    });
});
describe("who the President can actually send up", () => {
    // The gate on a defect that shipped: `selectNominableFor` did not exist, the
    // executive-branch screen called the cabinet's `selectAppointableFor` with an
    // office id, and that function filters on `Person.eligibleRoles` — which
    // holds charter role ids and never an office id. The shortlist was therefore
    // empty for all fifty-two offices on every campaign, and the whole
    // appointment pipeline was unreachable from the seat. The call site got past
    // the compiler with an `as never` cast.
    it("returns a bench for every Senate-confirmed office, and none for an office the President fills alone", () => {
        const campaign = foundedForBalance("nominable-bench").campaign;
        for (const def of INSTITUTION_CATALOG) {
            for (const office of def.offices) {
                const bench = selectNominableFor(campaign, office.id);
                // The Joint Chiefs draw serving officers, and the cast holds few; the
                // vacancy itself brings the bench (appointment-bench.ts).
                if (def.id === "INST-JCS")
                    continue;
                if (office.confirmingChamber !== "senate")
                    expect(bench, office.id).toEqual([]);
                else
                    expect(bench.length, `${office.id} (${office.title}) has no bench`).toBeGreaterThan(0);
            }
        }
    });
    it("offers only names openNomination will actually accept", () => {
        // The shortlist and the refusal must not be two opinions: a name the
        // screen offers and the engine then rejects is a control that lies. The
        // chair is emptied first, because a filled one refuses every name.
        const office = INSTITUTION_CATALOG.find((def) => def.kind === "department").offices[0].id;
        const campaign = withEmptyChair(foundedForBalance("nominable-accepts").campaign, office);
        for (const candidate of selectNominableFor(campaign, office).slice(0, 5)) {
            expect(openNomination(campaign, office, candidate.base.id).ok, candidate.base.name).toBe(true);
        }
    });
    it("refuses an office that does not exist rather than offering the whole cast for it", () => {
        expect(selectNominableFor(foundedForBalance("nominable-unreal").campaign, "OFF-NOT-A-REAL-OFFICE")).toEqual([]);
    });
    it("does not hand the CIA and the EPA the same first name", () => {
        const campaign = foundedForBalance("office-benches").campaign;
        const intelligence = selectNominableFor(campaign, "OFF-DCIA")[0];
        const environment = selectNominableFor(campaign, "OFF-EPA-ADMIN")[0];
        expect(intelligence.base.id).not.toBe(environment.base.id);
        const intelYears = intelligence.base.career
            .filter((post) => post.archetype === "intelligence-service" || post.archetype === "military-command")
            .reduce((sum, post) => sum + post.years, 0);
        expect(intelYears).toBeGreaterThan(0);
    });
});
describe("filling every empty office at once", () => {
    /**
     * A government with a dozen offices actually standing empty.
     *
     * Built by emptying them rather than found that way: the branch below the
     * cabinet opens staffed, so a founding no longer supplies a pile of
     * vacancies, and a test that read them off the founding was reading a
     * transition that does not happen.
     */
    function withEmptiedOffices(seedText, count) {
        let working = foundedForBalance(seedText).campaign;
        const offices = [];
        for (const def of INSTITUTION_CATALOG) {
            if (offices.length >= count)
                break;
            const office = def.offices[0];
            // Only seats the Senate confirms: an office the President fills alone has no nomination to send.
            if (!office || def.cabinetRole || office.removal !== "at-will" || office.confirmingChamber !== "senate")
                continue;
            const result = removeOfficer(working, def.id);
            if (!result.ok)
                continue;
            working = apply(working, result.packet);
            offices.push(office.id);
        }
        return { campaign: working, offices };
    }
    it("sends one name per vacancy and never the same person twice", () => {
        const { campaign, offices } = withEmptiedOffices("fill-vacancies", 12);
        expect(offices.length).toBe(12);
        for (const office of offices) {
            expect(campaign.institutions[officeInstitution(office).id].vacancy).toBe(true);
        }
        const packets = fillVacantOffices(campaign, offices);
        expect(packets.length).toBe(offices.length);
        // A founding nominee still before the Senate is not one of these, and is
        // counted out rather than assumed away.
        const pending = selectActiveNominations(campaign).length;
        let working = campaign;
        for (const packet of packets)
            working = apply(working, packet);
        const running = selectActiveNominations(working);
        expect(running.length).toBe(pending + offices.length);
        // The defect this exists to prevent: `currentRole` is only set at
        // confirmation, so without excluding pending nominees the best candidate
        // in the country is sent up for every office in the government.
        expect(new Set(running.map((nomination) => nomination.nominee)).size).toBe(running.length);
        expect(new Set(running.map((nomination) => nomination.office)).size).toBe(running.length);
    });
    it("leaves an office that already has a name before the Senate alone", () => {
        const { campaign, offices } = withEmptiedOffices("fill-idempotent", 6);
        let working = campaign;
        for (const packet of fillVacantOffices(working, offices))
            working = apply(working, packet);
        // Run again: everything is already pending, so there is nothing to send.
        expect(fillVacantOffices(working, offices)).toEqual([]);
    });
    it("stops offering a nominee who is already up for something else", () => {
        const office = INSTITUTION_CATALOG.find((def) => def.kind === "department").offices[0].id;
        const campaign = withEmptyChair(foundedForBalance("pending-nominee").campaign, office);
        const first = selectNominableFor(campaign, office)[0];
        const opened = openNomination(campaign, office, first.base.id);
        expect(opened.ok).toBe(true);
        if (!opened.ok)
            return;
        const after = apply(campaign, opened.packet);
        const other = INSTITUTION_CATALOG.filter((def) => def.kind === "department")[1].offices[0].id;
        expect(selectNominableFor(after, other).some((entry) => entry.base.id === first.base.id)).toBe(false);
    });
});
describe("a judicial seat", () => {
    const JUDICIAL_OFFICE = "OFF-SCOTUS-SEAT-7";
    it("opens through the same pipeline a cabinet office does, referred to CMTE-JUDICIARY", () => {
        const campaign = withCandidate(buildCampaign());
        const opened = openNomination(campaign, JUDICIAL_OFFICE, NOMINEE);
        expect(opened.ok).toBe(true);
        if (!opened.ok)
            return;
        const after = apply(campaign, opened.packet);
        const nomination = Object.values(after.nominations)[0];
        expect(nomination.stage).toBe("vetting");
        expect(nomination.committee).toBe("CMTE-JUDICIARY");
    });
    it("offers only people with a legal career, and does not bar a lawyer for being eligible for another charter's chair", () => {
        const campaign = foundedForBalance("judicial-shortlist").campaign;
        const shortlist = selectNominableFor(campaign, JUDICIAL_OFFICE);
        expect(shortlist.length).toBeGreaterThan(0);
        for (const candidate of shortlist)
            expect(hasLegalCareer(candidate.base)).toBe(true);
        // The court chancellor is a monarchy's cabinet seat; its bench is the one
        // whose lives are law, and the old cabinet-eligibility exclusion kept every
        // one of them off an American court.
        const chancellor = withCandidate(campaign, { eligibleRoles: ["role-court-chancellor"], nationality: campaign.founding.nation });
        expect(selectNominableFor(chancellor, JUDICIAL_OFFICE).some((candidate) => candidate.base.id === NOMINEE)).toBe(true);
    });
    it("refuses a nominee with no legal career", () => {
        const campaign = withCandidate(buildCampaign(), { education: { ...person.education, field: "economics" } });
        expect(openNomination(campaign, JUDICIAL_OFFICE, NOMINEE)).toMatchObject({ ok: false, reason: expect.stringContaining("no legal career") });
    });
});
describe("the Senate's answer reaches the wire", () => {
    it("files a governance item naming the nominee in the week the Senate seats them", () => {
        const base = withCandidate(buildCampaign(), { integrity: 0.8, competence: 0.8, ambition: 0.3 });
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.95 } };
        const seated = runToTerminal(openOn(friendly)).campaign;
        const confirmed = seated.feed.filter((item) => item.kind === "governance" && /confirms/.test(item.headline));
        expect(confirmed).toHaveLength(1);
        expect(confirmed[0].visibility).toBe("public");
        expect(confirmed[0].facts?.subject).toBe(person.name);
    });
    it("files the defeat as plainly as the seat", () => {
        const base = withCandidate(buildCampaign(), { integrity: 0.8, competence: 0.8, ambition: 0.3 });
        const turned = { ...base, congress: { ...base.congress, disposition: 0.02 } };
        const ended = runToTerminal(openOn(turned)).campaign;
        const lost = ended.feed.filter((item) => item.kind === "governance" && /rejects|returned/.test(item.headline));
        expect(lost.length).toBeGreaterThanOrEqual(1);
    });
});
describe("one chair, one officer", () => {
    const LABOR = "OFF-LABOR-SEC";
    const LABOR_ROLE = "role-labor-secretary";
    /** A founded government with the Secretary of Labor dismissed, and two names to send. */
    function laborVacant(seedText) {
        const campaign = withEmptyChair(foundedForBalance(seedText).campaign, LABOR);
        const [first, second] = selectAppointableFor(campaign, LABOR_ROLE);
        if (!first || !second)
            throw new Error("the Labor bench is thinner than two");
        return { campaign, first: first.base.id, second: second.base.id };
    }
    it("refuses to send a name up for a chair somebody sits in", () => {
        const campaign = foundedForBalance("guard-seated").campaign;
        const candidate = selectNominableFor(campaign, "OFF-DEFENSE-SEC")[0];
        const refused = openNomination(campaign, "OFF-DEFENSE-SEC", candidate.base.id);
        expect(refused.ok).toBe(false);
        expect(!refused.ok && refused.reason).toContain("holds Secretary of Defense");
    });
    it("refuses a body's own chair while its incumbent sits, not only a cabinet one", () => {
        const campaign = foundedForBalance("guard-seated-body").campaign;
        expect(campaign.institutions["INST-FEMA"].leader).toBeDefined();
        const candidate = selectNominableFor(campaign, "OFF-FEMA-HEAD")[0];
        expect(openNomination(campaign, "OFF-FEMA-HEAD", candidate.base.id).ok).toBe(false);
    });
    it("holds the race between two names for one chair sent up the same week", () => {
        const { campaign, first, second } = laborVacant("race-nominate-first");
        const pending = apply(campaign, packetOf(openNomination(campaign, LABOR, first)));
        expect(pending.turn).toBe(campaign.turn);
        const late = openNomination(pending, LABOR, second);
        expect(late.ok).toBe(false);
        expect(!late.ok && late.reason).toContain("already before the Senate");
        expect(pending.player.cabinet[LABOR_ROLE]).toBeUndefined();
    });
    it("will not send a pending nominee up for a second chair while the first is before the Senate", () => {
        const base = withEmptyChair(foundedForBalance("race-pending-elsewhere").campaign, LABOR);
        const campaign = withEmptyChair(base, "OFF-COMMERCE-SEC");
        const nominee = selectAppointableFor(campaign, LABOR_ROLE)[0].base.id;
        const pending = apply(campaign, packetOf(openNomination(campaign, LABOR, nominee)));
        expect(selectAppointableFor(pending, LABOR_ROLE).map((entry) => entry.base.id)).not.toContain(nominee);
        const elsewhere = openNomination(pending, "OFF-COMMERCE-SEC", nominee);
        expect(elsewhere).toMatchObject({ ok: false, reason: expect.stringContaining("already before the Senate") });
    });
    it("fills a cabinet chair from its office and from the batch with the same nomination", () => {
        const { campaign, second } = laborVacant("one-path");
        const single = openNomination(campaign, LABOR, second);
        if (!single.ok)
            throw new Error(single.reason);
        expect(fillVacantOffices(campaign, [LABOR], { [LABOR]: second })).toEqual([single.packet]);
    });
    it("sends one nomination when a batch names one person for two seats", () => {
        const base = withEmptyChair(foundedForBalance("one-person-two-seats").campaign, LABOR);
        const campaign = withEmptyChair(base, "OFF-COMMERCE-SEC");
        const nominee = selectAppointableFor(campaign, LABOR_ROLE)[0].base.id;
        const sent = fillVacantOffices(campaign, [LABOR, "OFF-COMMERCE-SEC"], { [LABOR]: nominee, "OFF-COMMERCE-SEC": nominee });
        const named = sent.flatMap((packet) => packet.effects.flatMap((effect) => (effect.kind === "nomination" && effect.nomination ? [effect.nomination.nominee] : [])));
        expect(named).toEqual([nominee]);
    });
    it("sends the President's pick over the pool's first name", () => {
        const { campaign, first, second } = laborVacant("pick-over-default");
        const nominee = (picks) => fillVacantOffices(campaign, [LABOR], picks).flatMap((packet) => packet.effects.flatMap((effect) => (effect.kind === "nomination" && effect.nomination ? [effect.nomination.nominee] : [])));
        expect(nominee({})).toEqual([selectNominableFor(campaign, LABOR)[0].base.id]);
        expect(nominee({ [LABOR]: second })).toEqual([second]);
        expect(first).not.toBe(second);
    });
});
describe("a confirmed officer holds the office on the record", () => {
    function confirmedFor(office) {
        const base = withCandidate(buildCampaign(), { integrity: 0.9, competence: 0.9, ambition: 0.3 });
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.9 } };
        const opened = apply(friendly, packetOf(openNomination(friendly, office, NOMINEE)));
        return runToTerminal(opened).campaign;
    }
    it("names a confirmed Secretary's chair as their role", () => {
        const campaign = confirmedFor(OFFICE);
        expect(campaign.people[NOMINEE].currentRole).toBe("role-defense-minister");
        expect(campaign.player.cabinet["role-defense-minister"]).toBe(NOMINEE);
        expect(campaign.people[NOMINEE].loyaltyAtAppointment).toBe(campaign.people[NOMINEE].base.loyalty);
    });
    it("does not offer a confirmed Administrator of FEMA for the CDC", () => {
        const campaign = confirmedFor("OFF-FEMA-HEAD");
        expect(campaign.institutions["INST-FEMA"].leader).toBe(NOMINEE);
        expect(campaign.people[NOMINEE].currentRole).toBe(AGENCY_HEAD_ROLE);
        expect(selectNominableFor(campaign, "OFF-CDC-HEAD").map((entry) => entry.base.id)).not.toContain(NOMINEE);
        expect(openNomination(campaign, "OFF-CDC-HEAD", NOMINEE).ok).toBe(false);
    });
    it("seats nobody for a deputy's office, which has no record of its own to fill", () => {
        const campaign = confirmedFor("OFF-DEFENSE-DEP");
        const nomination = Object.values(campaign.nominations)[0];
        expect(nomination.stage).toBe("sworn-in");
        expect(campaign.institutions["INST-DOD"].leader).toBeUndefined();
        expect(campaign.player.cabinet["role-defense-minister"]).toBeUndefined();
        expect(campaign.people[NOMINEE].currentRole).toBeUndefined();
    });
    it("ends an acting officer's authority without giving them the role", () => {
        const base = withCandidate(buildCampaign(), { integrity: 0.9, competence: 0.9, ambition: 0.3 });
        const acting = "PER-ACTING";
        const withActing = {
            ...base,
            congress: { ...base.congress, disposition: 0.9 },
            people: { ...base.people, [acting]: { base: { ...person, id: acting, name: "Acting Officer" }, alive: true } },
            institutions: { ...base.institutions, "INST-DOD": { ...base.institutions["INST-DOD"], actingLeader: acting, actingExpiresDay: 999 } },
        };
        const { campaign } = runToTerminal(apply(withActing, packetOf(openNomination(withActing, OFFICE, NOMINEE))));
        expect(campaign.institutions["INST-DOD"].actingLeader).toBeUndefined();
        expect(campaign.people[acting].currentRole).toBeUndefined();
    });
});
describe("withdrawing a name the Senate has confirmed", () => {
    it("is refused, because confirmation already seated them", () => {
        const campaign = openOn(withCandidate(buildCampaign()));
        const id = Object.keys(campaign.nominations)[0];
        const confirmed = { ...campaign, nominations: { [id]: { ...campaign.nominations[id], stage: "confirmed" } } };
        expect(withdrawNomination(confirmed, id)).toEqual({ ok: false, reason: "The Senate has already confirmed the nominee." });
    });
});
describe("a nomination overtaken while it waits", () => {
    it("is withdrawn at no cost when its nominee takes another office", () => {
        const campaign = openOn(withCandidate(buildCampaign()));
        const elsewhere = {
            ...campaign,
            people: { ...campaign.people, [NOMINEE]: { ...campaign.people[NOMINEE], currentRole: AGENCY_HEAD_ROLE } },
        };
        const [packet] = nominationPhase(elsewhere);
        const after = apply(elsewhere, packet);
        expect(Object.values(after.nominations)[0].stage).toBe("withdrawn");
        expect(after.player.metrics.standing).toBe(elsewhere.player.metrics.standing);
    });
    it("is withdrawn when the chair it would fill is filled some other way", () => {
        const withBoth = withCandidate(buildCampaign());
        const rival = "PER-RIVAL";
        const campaign = openOn({ ...withBoth, people: { ...withBoth.people, [rival]: { base: { ...person, id: rival }, alive: true } } });
        const decreed = apply(campaign, seatByDecree(campaign, "role-defense-minister", rival));
        const after = apply(decreed, nominationPhase(decreed)[0]);
        expect(Object.values(after.nominations)[0].stage).toBe("withdrawn");
        expect(after.player.cabinet["role-defense-minister"]).toBe(rival);
        expect(after.people[rival].currentRole).toBe("role-defense-minister");
    });
    it("seats a nominee confirmed for two chairs the same week in one of them only", () => {
        const base = withCandidate(buildCampaign(), { integrity: 0.9, competence: 0.9, ambition: 0.3 });
        const friendly = { ...base, congress: { ...base.congress, disposition: 0.95 } };
        // The nomination itself now refuses a name already up elsewhere, so the
        // second record is written the way a save from before that check carries it.
        const first = apply(friendly, packetOf(openNomination(friendly, "OFF-DEFENSE-SEC", NOMINEE)));
        const sent = Object.values(first.nominations)[0];
        const second = { ...sent, id: `OFF-FEMA-HEAD:${sent.openedDay}`, office: "OFF-FEMA-HEAD", institution: "INST-FEMA" };
        const both = { ...first, nominations: { ...first.nominations, [second.id]: second } };
        const atVote = {
            ...both,
            nominations: Object.fromEntries(Object.entries(both.nominations).map(([id, nomination]) => [id, { ...nomination, stage: "vote", stageEnteredDay: -30 }])),
        };
        const after = apply(atVote, nominationPhase(atVote)[0]);
        const stages = Object.values(after.nominations).map((nomination) => nomination.stage).sort();
        expect(stages).toEqual(["confirmed", "withdrawn"]);
        expect(after.institutions["INST-FEMA"].leader === NOMINEE).not.toBe(after.player.cabinet["role-defense-minister"] === NOMINEE);
    });
});
