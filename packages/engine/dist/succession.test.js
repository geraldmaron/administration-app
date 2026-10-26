import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { advanceRemovalArc, BEAT_THRESHOLDS } from "./removal.js";
import { houseSpecialOdds, nextInLine, officeSuccessionPhase, section4Succession, successionHandover, successionOf } from "./succession.js";
import { apply } from "./effects.js";
import { addDays, compareDates, dayOfWeekInOffice, daysBetween } from "./clock.js";
import { voteOn } from "./congress-votes.js";
import { clotureOf, floorThreshold, seatedOf, supermajorityOf } from "./congress.js";
import { withMember } from "./congress-members.js";
import { departureFlag, personDepartureFlag } from "./cabinet.js";
import { deathsThisWeek, occupiedOffices } from "./officeholder-mortality.js";
import { foreignPoliticsPhase, selectForeignSeat } from "./foreign-politics.js";
import { HOUSE_FLIP_SCALE, HOUSE_SPECIAL_ELECTION_DAYS, SENATE_VACANCY_LAW, governorSuccessor, houseFlipChance, senateElectionDate, specialElectionDate, specialElectionParty } from "./vacancy-law.js";
import { createSave, loadSave } from "./save.js";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { institutionDef } from "./institutions.js";
import { advanceOneDay } from "./day-step.js";
import { campaignTurnPhases } from "./turn-phases.js";
const { campaign: founded, charter } = foundedForBalance("succession-line", "democrat");
function removed(campaign) {
    return { ...campaign, removal: { ...campaign.removal, resolved: true } };
}
describe("the line of succession", () => {
    it("names nobody while the President serves", () => {
        expect(successionOf(founded)).toBeUndefined();
    });
    it("hands a removed President's office to the Vice President", () => {
        expect(founded.vicePresident).toBeDefined();
        expect(successionOf(removed(founded))).toEqual({ successor: founded.vicePresident, mechanism: "removal", from: "vice-president" });
    });
    it("passes to the Speaker when there is no living Vice President", () => {
        const noVicePresident = { ...founded, people: { ...founded.people, [founded.vicePresident]: { ...founded.people[founded.vicePresident], alive: false } } };
        const speaker = founded.congress.leadership.find((figure) => figure.post === "post-house-speaker")?.person;
        expect(nextInLine(noVicePresident)).toEqual(speaker ? { successor: speaker, from: "speaker" } : undefined);
    });
    it("closes the removal's own ending on the successor taking the oath", () => {
        const name = founded.people[founded.vicePresident].base.name;
        expect(successionHandover(founded)).toContain(`Vice President ${name} takes the oath`);
        const lastBeat = BEAT_THRESHOLDS.length - 1;
        const onTheBrink = {
            ...founded,
            removal: {
                ...founded.removal,
                beats: Array.from({ length: lastBeat }, (_, turn) => ({ turn, description: "a step" })),
            },
        };
        const arc = advanceRemovalArc(onTheBrink, charter);
        if (arc.resolved)
            expect(arc.endingSummary).toContain(`Vice President ${name} takes the oath`);
    });
    it("answers the Twenty-fifth Amendment's fourth section only as a question, and writes nothing", () => {
        expect(section4Succession(founded)).toEqual({ successor: founded.vicePresident, mechanism: "incapacity", from: "vice-president" });
        expect(section4Succession(removed(founded))).toBeUndefined();
        expect(successionOf(founded)).toBeUndefined();
    });
});
// --- Deaths in every other office -------------------------------------------
function run(campaign) {
    return officeSuccessionPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
}
/** The first week a death of this kind is drawn, with the week's state, searching ten years. */
function weekOf(campaign, match) {
    for (let week = 1; week <= 520; week += 1) {
        const state = withWeeksElapsed(campaign, week);
        const death = deathsThisWeek(state).find(match);
        if (death)
            return { state, death };
    }
    return undefined;
}
function aged(campaign, people, age) {
    return { ...campaign, people: { ...campaign.people, ...Object.fromEntries(people.map((id) => [id, { ...campaign.people[id], base: { ...campaign.people[id].base, age } }])) } };
}
/** Weeks forward until the week that contains `date`. */
function untilWeekOf(campaign, date) {
    return withWeeksElapsed(campaign, Math.max(1, Math.ceil(daysBetween(campaign.calendar, date) / 7)));
}
const sweeping = { chamber: "house", appeal: 1, required: 218, stance: "neutral" };
describe("a member of the House dies in office", () => {
    const found = weekOf(founded, (death) => death.holder.office.kind === "congress" && /-senate-/.test(death.holder.office.seat) === false);
    const seat = found ? found.death.holder.office.seat : "";
    const after = found ? run(found.state) : founded;
    const member = after.congress.members?.find((entry) => entry.seat === seat);
    it("leaves the seat empty until a special election on the state's timing, and the margin moves that day", () => {
        expect(found).toBeDefined();
        expect(after.people[found.death.holder.person].alive).toBe(false);
        expect(after.people[found.death.holder.person].currentRole).toBeUndefined();
        expect(member?.vacancy).toEqual({ since: found.death.date, path: "special-election", fillsOn: specialElectionDate(found.death.date, HOUSE_SPECIAL_ELECTION_DAYS) });
        const days = daysBetween(found.death.date, member.vacancy.fillsOn);
        expect(days).toBeGreaterThanOrEqual(57);
        expect(days).toBeLessThanOrEqual(HOUSE_SPECIAL_ELECTION_DAYS);
        expect(voteOn(found.state, sweeping).yeas - voteOn(after, sweeping).yeas).toBe(1);
        expect(voteOn(after, sweeping).rollCall?.find((row) => row.seat === seat)?.yea).toBe(false);
        expect(after.ledger.at(-1)?.description ?? "").toContain("special election");
    });
    it("fills the seat at the special election, and the count moves only if the seat changed party", () => {
        const due = untilWeekOf(after, member.vacancy.fillsOn);
        const filled = run(due);
        const seated = filled.congress.members.find((entry) => entry.seat === seat);
        expect(seated.vacancy).toBeUndefined();
        expect(seated.person).not.toBe(member.person);
        expect(filled.people[seated.person].currentRole).toBe("role-representative");
        if (seated.party === member.party) {
            expect(voteOn(filled, sweeping).yeas).toBe(voteOn(found.state, sweeping).yeas);
            expect(filled.congress.chambers).toEqual(found.state.congress.chambers);
        }
        else {
            expect(filled.congress.chambers.house.seats).toBe(found.state.congress.chambers.house.seats);
            expect(filled.congress.chambers).not.toEqual(found.state.congress.chambers);
        }
    });
    it("survives a save and reload with the seat still empty", () => {
        expect(loadSave(JSON.parse(JSON.stringify(createSave(after)))).congress.members).toEqual(after.congress.members);
    });
});
/** A senator's seat emptied by hand, the way a death leaves it, for the filling rules alone. */
function emptiedSenate(campaign, pick) {
    const member = campaign.congress.members.find((entry) => entry.chamber === "senate" &&
        pick(entry.state, entry.party, campaign.states[entry.state]?.governor?.party ?? ""));
    const vacancy = { since: campaign.calendar, path: SENATE_VACANCY_LAW[member.state].appoints ? "appointment" : "special-election",
        fillsOn: campaign.calendar };
    const people = { ...campaign.people, [member.person]: { ...campaign.people[member.person], alive: false, currentRole: undefined } };
    return { member, state: { ...campaign, people, congress: withMember(campaign.congress, member.seat, { ...member, vacancy }) } };
}
describe("a Senate seat emptied by death", () => {
    it("is filled by the governor's appointee, of the governor's party where state law sets no party rule", () => {
        const { member, state } = emptiedSenate(founded, (id, senator, governor) => SENATE_VACANCY_LAW[id].appoints && !SENATE_VACANCY_LAW[id].sameParty && governor !== "" && governor !== senator && senator !== "independent");
        const filled = run(state);
        const seated = filled.congress.members.find((entry) => entry.seat === member.seat);
        const governor = founded.states[member.state].governor.party;
        expect(seated.party).toBe(governor);
        expect(seated.electionDue).toEqual(senateElectionDate(member.state, state.calendar));
        const counts = (campaign) => campaign.congress.members.filter((entry) => entry.chamber === "senate" && entry.party === governor).length;
        expect(counts(filled) - counts(state)).toBe(1);
        expect(filled.congress.chambers.senate.seats).toBe(100);
        const delegation = filled.states[member.state].delegation.senate.find((entry) => entry.seatClass === member.seatClass);
        expect(delegation.party).toBe(governor);
    });
    it("keeps the vacating senator's party where state law requires it", () => {
        const { member, state } = emptiedSenate(founded, (id, senator) => SENATE_VACANCY_LAW[id].sameParty === true && senator !== "independent");
        const seated = run(state).congress.members.find((entry) => entry.seat === member.seat);
        expect(seated.party).toBe(member.party);
        expect(seated.electionDue).toBeDefined();
    });
    it("stays empty where the governor may not appoint, until the special election seats the state's choice", () => {
        const noAppointment = ["KY", "ND", "RI", "WI", "CT"];
        expect(noAppointment.every((id) => !SENATE_VACANCY_LAW[id].appoints)).toBe(true);
        const { member, state } = emptiedSenate(founded, (id) => noAppointment.includes(id));
        const seated = run(state).congress.members.find((entry) => entry.seat === member.seat);
        expect(seated.vacancy).toBeUndefined();
        expect(seated.electionDue).toBeUndefined();
        expect(seated.party).toBe(specialElectionParty(founded.states[member.state].lean, member.party));
    });
    it("sends the appointee to the voters on the day the law sets", () => {
        const { member, state } = emptiedSenate(founded, (id) => SENATE_VACANCY_LAW[id].appoints);
        const appointed = run(state);
        const seated = appointed.congress.members.find((entry) => entry.seat === member.seat);
        const decided = run(untilWeekOf(appointed, seated.electionDue));
        const after = decided.congress.members.find((entry) => entry.seat === member.seat);
        expect(after.electionDue).toBeUndefined();
        expect(after.party).toBe(specialElectionParty(founded.states[member.state].lean, seated.party));
        if (after.party === seated.party)
            expect(after.person).toBe(seated.person);
    });
    it("dates each state's special by its own law", () => {
        const since = { year: 2030, month: 2, day: 1 };
        expect(senateElectionDate("WI", since)).toEqual(addDays(since, 77));
        expect(senateElectionDate("NY", since)).toEqual({ year: 2030, month: 11, day: 5 });
        expect(senateElectionDate("CA", since)).toEqual({ year: 2032, month: 11, day: 2 });
    });
});
describe("a governor, a Secretary or a foreign leader dies in office", () => {
    it("seats the state's successor for the rest of the term, of the party the state's rule gives", () => {
        const governors = Object.values(founded.states).flatMap((runtime) => (runtime.governor ? [runtime.governor.person] : []));
        const found = weekOf(aged(founded, governors, 95), (death) => death.holder.office.kind === "governor");
        expect(found).toBeDefined();
        const state = found.death.holder.office.state;
        const before = found.state.states[state].governor;
        const after = run(found.state).states[state].governor;
        expect(after.person).not.toBe(before.person);
        const rule = governorSuccessor(state);
        expect(after.party).toBe(rule.ticket ? before.party : specialElectionParty(found.state.states[state].lean, before.party));
        expect(after.termEnds).toBe(before.termEnds);
        expect(run(found.state).people[after.person].currentRole).toBe("role-governor");
    });
    it("puts the department's first assistant in the chair as acting", () => {
        const secretaries = Object.entries(founded.player.cabinet).filter(([role]) => role !== founded.founding.leadRole).map(([, id]) => id);
        const found = weekOf(aged(founded, secretaries, 95), (death) => death.holder.office.kind === "cabinet");
        expect(found).toBeDefined();
        const role = found.death.holder.office.role;
        const after = run(found.state);
        expect(after.player.cabinet[role]).toBeUndefined();
        expect(after.people[found.death.holder.person].alive).toBe(false);
        expect(after.player.flags[departureFlag("died", role)], "the death writes its departure flag").toBe(true);
        expect(after.player.flags[personDepartureFlag("died", role, found.death.holder.person)]).toBe(true);
        expect(Object.values(after.institutions).some((runtime) => runtime.actingLeader !== undefined &&
            found.state.institutions[runtime.id]?.actingLeader === undefined)).toBe(true);
    });
    it("leaves a foreign leader's successor to the foreign week, which reads the death", () => {
        const found = weekOf(founded, (death) => death.holder.office.kind === "foreign-leader");
        expect(found).toBeDefined();
        const nation = found.death.holder.office.nation;
        const dead = run(found.state);
        // Read off the week's own packets: the jumped calendar leaves many selections
        // overdue at once, and the capped recent list may not keep this one.
        const packets = foreignPoliticsPhase(dead);
        const change = packets.flatMap((packet) => packet.effects).find((effect) => effect.kind === "leadership" && effect.nation === nation);
        expect(change).toMatchObject({ change: { kind: "succession", cause: "death", predecessor: found.death.holder.person } });
        const succeeded = packets.reduce((state, packet) => apply(state, packet), dead);
        expect(selectForeignSeat(succeeded, nation)?.person).not.toBe(found.death.holder.person);
    });
});
describe("an empty seat in a count", () => {
    function emptied(campaign, chamber, count) {
        const members = campaign.congress.members.filter((entry) => entry.chamber === chamber).slice(0, count);
        return members.reduce((state, member) => {
            const people = { ...state.people, [member.person]: { ...state.people[member.person], alive: false, currentRole: undefined } };
            const vacancy = { since: state.calendar, path: "special-election", fillsOn: addDays(state.calendar, HOUSE_SPECIAL_ELECTION_DAYS) };
            return { ...state, people, congress: withMember(state.congress, member.seat, { ...member, vacancy }) };
        }, campaign);
    }
    it("is neither a yea nor a nay, and the majority is of the members voting", () => {
        const two = emptied(founded, "house", 2);
        expect(seatedOf(two.congress, "house")).toBe(433);
        expect(floorThreshold(two.congress, "house", "ordinary")).toBe(217);
        const vote = voteOn(two, { ...sweeping, required: floorThreshold(two.congress, "house", "ordinary") });
        expect(vote.yeas + vote.nays).toBe(433);
    });
    it("lowers the Senate's cloture and two-thirds bars to the senators seated", () => {
        const two = emptied(founded, "senate", 2);
        expect(floorThreshold(two.congress, "senate", "ordinary")).toBe(clotureOf(98));
        expect(floorThreshold(two.congress, "senate", "privileged")).toBe(50);
        expect(supermajorityOf(seatedOf(two.congress, "senate"))).toBe(66);
    });
});
describe("a seat holder who loses the seat loses its posts", () => {
    /** An appointed senator facing the voters today in a state that leans against them. */
    function unseated(campaign, person) {
        const member = campaign.congress.members.find((entry) => entry.person === person && entry.chamber === "senate");
        const runtime = campaign.states[member.state];
        const lean = member.party === "republican" ? -0.3 : 0.3;
        return {
            ...campaign,
            states: { ...campaign.states, [member.state]: { ...runtime, lean } },
            congress: withMember(campaign.congress, member.seat, { ...member, electionDue: campaign.calendar }),
        };
    }
    const senators = new Set(founded.congress.members.filter((entry) => entry.chamber === "senate" && entry.party !== "independent").map((entry) => entry.person));
    const chair = Object.values(founded.congress.committees).map((panel) => panel.chair).find((id) => id && senators.has(id));
    const leader = founded.congress.leadership.find((figure) => figure.chamber === "senate" && senators.has(figure.person));
    it("hands a defeated appointee's gavel to a sitting senator and clears the old office", () => {
        expect(chair).toBeDefined();
        const after = run(unseated(founded, chair));
        expect(after.congress.members.some((entry) => entry.person === chair)).toBe(false);
        expect(Object.values(after.congress.committees).some((panel) => panel.chair === chair || panel.ranking === chair)).toBe(false);
        expect(after.people[chair].currentRole).toBeUndefined();
        for (const panel of Object.values(after.congress.committees)) {
            for (const holder of [panel.chair, panel.ranking].filter((id) => id !== undefined)) {
                expect(after.congress.members.some((entry) => entry.person === holder && entry.chamber === "senate")).toBe(true);
            }
        }
    });
    it("reseats a defeated appointee's leadership post from the chamber", () => {
        const after = run(unseated(founded, leader.person));
        expect(after.congress.leadership.some((figure) => figure.person === leader.person)).toBe(false);
        expect(after.people[leader.person].currentRole).toBeUndefined();
        const successor = after.congress.leadership.find((figure) => figure.post === leader.post);
        if (successor)
            expect(after.congress.members.some((entry) => entry.person === successor.person && entry.chamber === "senate")).toBe(true);
    });
});
describe("the office-day clock", () => {
    // Congress aged so a death lands within the first weeks; the draws stay keyed.
    const old = aged(founded, founded.congress.members.map((entry) => entry.person), 95);
    const late = (() => {
        for (let week = 1; week <= 30; week += 1) {
            const death = deathsThisWeek(withWeeksElapsed(old, week)).find((entry) => dayOfWeekInOffice(old, entry.date) >= 6);
            if (death)
                return { week, death };
        }
        return undefined;
    })();
    function stepTo(layout, days, onDay) {
        const phases = campaignTurnPhases(charter, layout);
        let state = old;
        for (let day = 0; day < days; day += 1) {
            state = advanceOneDay(state, phases);
            onDay?.(state);
        }
        return state;
    }
    it("applies no death before its date under the office-day scheduler, and every death by the week's close", () => {
        expect(late).toBeDefined();
        const { week, death } = late;
        const person = death.holder.person;
        const weekly = stepTo(true, week * 7, (state) => {
            if (compareDates(state.calendar, death.date) < 0)
                expect(state.people[person].alive).toBe(true);
        });
        expect(weekly.people[person].alive).toBe(false);
        const seat = weekly.congress.members.find((entry) => entry.person === person);
        expect(seat?.vacancy?.since).toEqual(death.date);
    }, 600_000);
    it("gives the same deaths and vacancies under the office-day cut as under the flat week", () => {
        const days = late.week * 7;
        const cut = stepTo(true, days);
        const flat = stepTo(false, days);
        const dead = (state) => Object.values(state.people).filter((runtime) => !runtime.alive).map((runtime) => runtime.base.id).sort();
        expect(dead(cut)).toEqual(dead(flat));
        expect(cut.congress.members.filter((entry) => entry.vacancy)).toEqual(flat.congress.members.filter((entry) => entry.vacancy));
    }, 600_000);
});
describe("a House special election can change party", () => {
    const even = { ...founded, player: { ...founded.player, metrics: { ...founded.player.metrics, approval: 0.5 } } };
    const house = founded.congress.members.filter((entry) => entry.chamber === "house");
    // 19 of the 132 House specials from 2001 to October 2026 changed party (0.144).
    it("flips about one special in seven across the House's seats at an even national mood", () => {
        const mean = house.reduce((sum, member) => sum + houseSpecialOdds(even, member), 0) / house.length;
        expect(HOUSE_FLIP_SCALE).toBe(0.15);
        expect(mean).toBeGreaterThan(0.108);
        expect(mean).toBeLessThan(0.18);
    });
    it("flips a close seat more often than a safe one, and a seat of the President's party more often in a bad year", () => {
        const odds = house.map((member) => houseSpecialOdds(even, member)).sort((a, b) => a - b);
        expect(odds[0]).toBeLessThan(0.05);
        expect(odds.at(-1)).toBeGreaterThan(0.4);
        expect(houseFlipChance(0.3)).toBeLessThan(houseFlipChance(0.05));
        const own = house.find((member) => member.party === founded.congress.administrationParty);
        const sour = { ...even, player: { ...even.player, metrics: { ...even.player.metrics, approval: 0.35 } } };
        expect(houseSpecialOdds(sour, own)).toBeGreaterThan(houseSpecialOdds(even, own));
    });
    it("moves the chamber count, the state's delegation and the roster together when a seat flips", () => {
        // Every House seat emptied at once, the way a death leaves each; the keyed
        // draws flip some of them, and the counts must follow the ones that did.
        const vacant = house.reduce((campaign, member) => ({
            ...campaign,
            people: { ...campaign.people, [member.person]: { ...campaign.people[member.person], alive: false, currentRole: undefined } },
            congress: withMember(campaign.congress, member.seat, { ...member, vacancy: { since: campaign.calendar, path: "special-election", fillsOn: campaign.calendar } }),
        }), even);
        const filled = run(vacant);
        const flipped = filled.congress.members.filter((entry) => entry.chamber === "house" && house.find((old) => old.seat === entry.seat).party !== entry.party);
        expect(flipped.length).toBeGreaterThan(20);
        expect(flipped.length).toBeLessThan(110);
        const anchor = founded.congress.caucusAnchor;
        const room = filled.congress.chambers.house;
        expect(filled.congress.members.filter((entry) => entry.chamber === "house" && entry.party === anchor).length).toBe(room.administration);
        const delegations = Object.values(filled.states).reduce((sum, runtime) => sum + (runtime.delegation?.house.administration ?? 0), 0);
        expect(delegations).toBe(room.administration);
        expect(room.seats).toBe(435);
    });
});
describe("a governor's successor follows the state's rule", () => {
    /** A governor dying today in this state, the state leaning hard against the governor's party. */
    function againstTheGrain(state) {
        // One governor's keyed draw may not come up in ten years, so further seeds are tried in a fixed order.
        for (const seed of ["succession-line", "governor-rule-2", "governor-rule-3", "governor-rule-4", "governor-rule-5"]) {
            const campaign = seed === "succession-line" ? founded : foundedForBalance(seed, "democrat").campaign;
            const runtime = campaign.states[state];
            const governor = runtime.governor;
            const lean = governor.party === "republican" ? -0.3 : 0.3;
            const before = aged({ ...campaign, states: { ...campaign.states, [state]: { ...runtime, lean } } }, [governor.person], 99);
            const found = weekOf(before, (death) => death.holder.office.kind === "governor" && death.holder.office.state === state);
            if (found)
                return { before: found.state, after: run(found.state) };
        }
        throw new Error(`No ${state} governor died in five seeds.`);
    }
    it("seats a separately elected lieutenant governor of the state's party, which may be the other one", () => {
        expect(governorSuccessor("VT")).toEqual({ title: "lieutenant governor", ticket: false });
        const { before, after } = againstTheGrain("VT");
        expect(after.states.VT.governor.party).not.toBe(before.states.VT.governor.party);
        expect(after.ledger.some((entry) => entry.description.includes("the statehouse changes party"))).toBe(true);
    });
    it("keeps the governor's party where the lieutenant governor runs on the ticket", () => {
        expect(governorSuccessor("OH")).toEqual({ title: "lieutenant governor", ticket: true });
        const { before, after } = againstTheGrain("OH");
        expect(after.states.OH.governor.party).toBe(before.states.OH.governor.party);
    });
    it("passes Oregon's office to the secretary of state, elected on their own", () => {
        expect(governorSuccessor("OR")).toEqual({ title: "secretary of state", ticket: false });
        const { after } = againstTheGrain("OR");
        expect(after.ledger.some((entry) => entry.description.includes("the state's secretary of state"))).toBe(true);
    });
});
describe("an agency head dies in office", () => {
    const heads = Object.values(founded.institutions).filter((runtime) => runtime.leader && founded.people[runtime.leader]?.currentRole === "role-agency-head");
    it("seats the agency's first assistant as acting where the law gives one, and leaves a board on its quorum", () => {
        const authority = (death) => death.holder.office.kind === "agency" ? institutionDef(death.holder.office.institution)?.offices[0]?.actingAuthority : undefined;
        const old = aged(founded, heads.map((runtime) => runtime.leader), 99);
        for (const [law, acts] of [["vacancies-act", true], ["board-quorum", false]]) {
            const found = weekOf(old, (death) => authority(death) === law);
            expect(found, law).toBeDefined();
            const institution = found.death.holder.office.institution;
            const after = run(found.state);
            expect(after.people[found.death.holder.person].alive).toBe(false);
            expect(after.institutions[institution].leader).toBeUndefined();
            expect(after.institutions[institution].actingLeader !== undefined, law).toBe(acts);
        }
    });
    it("never seats one person as acting in two offices when two heads die in the same week", () => {
        const { campaign: stress } = foundedForBalance("w3-double-agency-1", "democrat");
        const stressHeads = Object.values(stress.institutions).filter((runtime) => runtime.leader && stress.people[runtime.leader]?.currentRole === "role-agency-head");
        const old = aged(stress, stressHeads.map((runtime) => runtime.leader), 99);
        let found;
        for (let week = 1; week <= 520 && !found; week += 1) {
            const state = withWeeksElapsed(old, week);
            const agencies = deathsThisWeek(state).filter((death) => death.holder.office.kind === "agency");
            if (agencies.length >= 2)
                found = state;
        }
        expect(found, "a week with two agency heads dying").toBeDefined();
        const holders = Object.values(run(found).actings ?? {});
        expect(holders.length).toBeGreaterThanOrEqual(2);
        expect(new Set(holders).size).toBe(holders.length);
    });
    it("never draws White House staff, who have no successor path in office", () => {
        const staff = Object.values(founded.people).filter((runtime) => ["role-chief-of-staff", "role-national-security-adviser", "role-press-secretary"].includes(runtime.currentRole ?? ""));
        expect(staff.length).toBe(3);
        const drawn = new Set(occupiedOffices(founded).map((holder) => holder.person));
        for (const runtime of staff)
            expect(drawn.has(runtime.base.id)).toBe(false);
        expect(heads.length).toBe(40);
        for (const runtime of heads)
            expect(drawn.has(runtime.leader)).toBe(true);
    });
});
