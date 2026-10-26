import { addDays, campaignFoundingDate, compareDates, daysBetween, formatGameDate, weekCloseDate } from "./clock.js";
import { caucusOf, memberCandidates, reseatPosts, withCongressMemberOffices, withMember } from "./congress-members.js";
import { HOUSE_SPECIAL_ELECTION_DAYS, SENATE_APPOINTMENT_DAYS, SENATE_VACANCY_LAW, governorSuccessor, houseFlipChance, houseHoldMargin, senateElectionDate, specialElectionDate, specialElectionParty, } from "./vacancy-law.js";
import { districtsOf, seatLeans } from "./house-seats.js";
import { createRngStreams } from "./rng.js";
import { deathsThisWeek } from "./officeholder-mortality.js";
import { actingEffects, selectAppointableFor, vacates } from "./appointments.js";
import { vacancyBenchEffects } from "./appointment-bench.js";
import { institutionDef, leaderRoleOf } from "./institutions.js";
import { usPartyFromPersonParty } from "./governors.js";
import { roleTitle } from "./naming.js";
import { VICE_PRESIDENCY_INSTITUTION_ID } from "./institution-catalog.js";
function living(campaign, person) {
    if (person === undefined)
        return undefined;
    return campaign.people[person]?.alive === true ? person : undefined;
}
/**
 * Who would take the oath if the office passed today: the Vice President, and
 * with no living Vice President the Speaker. Asked before the office passes,
 * which is what lets the removal that causes it name who comes next.
 */
export function nextInLine(campaign) {
    const vicePresident = living(campaign, campaign.vicePresident);
    if (vicePresident)
        return { successor: vicePresident, from: "vice-president" };
    const speaker = campaign.congress.leadership.find((figure) => figure.post === "post-house-speaker")?.person;
    const seated = living(campaign, speaker);
    return seated ? { successor: seated, from: "speaker" } : undefined;
}
/** Who succeeds this President, once the office has passed. Undefined while the President serves. */
export function successionOf(campaign) {
    if (!campaign.removal.resolved)
        return undefined;
    const next = nextInLine(campaign);
    return next ? { ...next, mechanism: "removal" } : undefined;
}
/**
 * The line a removal closes on: the successor taking the oath. Empty when
 * nobody in the line can be named, rather than a sentence about a stranger.
 */
export function successionHandover(campaign) {
    const next = nextInLine(campaign);
    if (!next)
        return "";
    const name = campaign.people[next.successor]?.base.name;
    if (!name)
        return "";
    return next.from === "vice-president"
        ? `Within the hour, Vice President ${name} takes the oath of office, and the presidency passes without a break.`
        : `With no Vice President to take it, the oath passes to the Speaker of the House, ${name}, and the presidency continues without a break.`;
}
/**
 * The Twenty-fifth Amendment's fourth section, asked by the balance harness
 * and nothing else: if the Vice President and a majority of the Cabinet
 * declared the President unable to serve today, who would act as President.
 * Nothing is written; the harness reads the answer.
 */
export function section4Succession(campaign) {
    const vicePresident = living(campaign, campaign.vicePresident);
    if (!vicePresident || campaign.removal.resolved)
        return undefined;
    return { successor: vicePresident, mechanism: "incapacity", from: "vice-president" };
}
/** The campaign with the week's earlier actings written in, so a second death sees who is already acting. */
function withWeekActings(campaign, work) {
    return work.actings ? { ...campaign, actings: { ...(campaign.actings ?? {}), ...work.actings } } : campaign;
}
function carryActings(work, effects) {
    const seated = effects.flatMap((effect) => (effect.kind === "acting" && effect.person !== undefined ? [[effect.seat, effect.person]] : []));
    return seated.length === 0 ? work : { ...work, actings: { ...(work.actings ?? {}), ...Object.fromEntries(seated) } };
}
const GOVERNOR_ROLE = "role-governor";
/** One record per change of office. `filed` is false where another phase files the story, as foreign-politics.ts does for a leader. */
function successionPacket(campaign, summary, effects, entities, systems, filed = true) {
    const feed = filed ? [{ kind: "feed", items: [{ turn: campaign.turn + 1, kind: "governance", visibility: "public", headline: summary }] }] : [];
    return {
        source: "simulate", actor: "world", turn: campaign.turn + 1, narration: { summary }, effects: [...effects, ...feed],
        provenance: { origin: "world", confidence: "observed", visibility: "public", entities, systems },
    };
}
function withRuntime(people, person, changes) {
    const runtime = people[person];
    return runtime ? { ...people, [person]: { ...runtime, ...changes } } : people;
}
/** The roster rewritten, the posts reseated, and every office the change moved written as a person effect. */
function hillStep(campaign, work, people, congress) {
    const posts = reseatPosts(congress, people, campaign.turn + 1);
    const offices = withCongressMemberOffices(people, posts.congress);
    const moved = Object.keys(offices).flatMap((id) => offices[id].currentRole === people[id]?.currentRole ? []
        : [{ kind: "person", person: id, changes: { currentRole: offices[id].currentRole } }]);
    return { work: { ...work, congress: posts.congress, people: offices }, effects: [{ kind: "congress", set: posts.congress }, ...moved, ...posts.ties] };
}
function seatVacancy(member, since) {
    if (member.chamber === "house")
        return { since, path: "special-election", fillsOn: specialElectionDate(since, HOUSE_SPECIAL_ELECTION_DAYS) };
    const state = member.state;
    return SENATE_VACANCY_LAW[state].appoints
        ? { since, path: "appointment", fillsOn: addDays(since, SENATE_APPOINTMENT_DAYS) }
        : { since, path: "special-election", fillsOn: senateElectionDate(state, since) };
}
function memberTitle(campaign, member) {
    const name = campaign.people[member.person]?.base.name ?? "A member";
    const state = campaign.states[member.state]?.base.name ?? member.state;
    return `${member.chamber === "house" ? "Representative" : "Senator"} ${name} of ${state}`;
}
function memberDied(campaign, work, member, date) {
    const vacancy = seatVacancy(member, date);
    const people = withRuntime(work.people, member.person, { alive: false, currentRole: undefined });
    const { electionDue: _cleared, ...seat } = member;
    const step = hillStep(campaign, work, people, withMember(work.congress, member.seat, { ...seat, vacancy }));
    const filled = vacancy.path === "appointment"
        ? "The governor will appoint a successor to serve until the voters fill the seat."
        : `The seat stays empty until a special election on ${formatGameDate(vacancy.fillsOn)}.`;
    const summary = `${memberTitle(campaign, member)} dies in office. ${filled}`;
    const effects = [{ kind: "person", person: member.person, changes: { alive: false, currentRole: undefined } }, ...step.effects];
    return { work: step.work, packet: successionPacket(campaign, summary, effects, [member.person, member.seat], ["congress", "succession"]) };
}
/** A seat's change of party moved on the state's own delegation too, so the state's count and the chamber's agree. */
function delegationEffect(campaign, work, member, party) {
    const delegation = work.delegations[member.state] ?? campaign.states[member.state]?.delegation;
    if (member.party === party || !delegation)
        return { work, effects: [] };
    const moved = (seat) => (seat.seatClass === member.seatClass ? { ...seat, party } : seat);
    const from = caucusOf(work.congress, member.party);
    const to = caucusOf(work.congress, party);
    const next = member.chamber === "senate"
        ? { ...delegation, senate: [moved(delegation.senate[0]), moved(delegation.senate[1])] }
        : { ...delegation, house: { ...delegation.house, [from]: delegation.house[from] - 1, [to]: delegation.house[to] + 1 } };
    return {
        work: { ...work, delegations: { ...work.delegations, [member.state]: next } },
        effects: [{ kind: "state", state: member.state, setDelegation: next, reason: `A ${member.chamber === "senate" ? "Senate" : "House"} seat changed party when it was filled.` }],
    };
}
/** The national mood toward a party: approval's distance from even, for the President's party and against the other. */
function moodToward(campaign, party) {
    const president = campaign.congress.administrationParty;
    if (president === "independent" || party === "independent")
        return 0;
    const mood = campaign.player.metrics.approval - 0.5;
    return party === president ? mood : -mood;
}
/** The chance this House seat's special election changes party, from the seat's lean and the national mood. */
export function houseSpecialOdds(campaign, member) {
    if (member.chamber !== "house" || member.party === "independent")
        return 0;
    const index = districtsOf(member.state).findIndex((district) => district.id === member.seat);
    const lean = seatLeans(member.state)[index] ?? campaign.states[member.state]?.lean ?? 0;
    return houseFlipChance(houseHoldMargin(lean, member.party, moodToward(campaign, member.party)));
}
/** One keyed draw per vacancy against those odds. */
function houseSpecialParty(campaign, member, since) {
    const draw = createRngStreams(campaign.seed).stream("house-special", member.seat, since.year, since.month, since.day).next();
    if (draw >= houseSpecialOdds(campaign, member))
        return member.party;
    return member.party === "democrat" ? "republican" : "democrat";
}
/** Seat a person in a member's place, party and all, with the posts and the delegation following. */
function seatMember(campaign, work, member, next) {
    const delegation = delegationEffect(campaign, work, member, next.party);
    const step = hillStep(campaign, delegation.work, delegation.work.people, withMember(delegation.work.congress, member.seat, next));
    return { work: step.work, effects: [...delegation.effects, ...step.effects] };
}
function fillingParty(campaign, member, path, since) {
    const state = member.state;
    if (member.chamber === "house")
        return houseSpecialParty(campaign, member, since);
    if (path === "appointment")
        return SENATE_VACANCY_LAW[state].sameParty ? member.party : campaign.states[state]?.governor?.party ?? member.party;
    return specialElectionParty(campaign.states[state]?.lean ?? 0, member.party);
}
function seatFilled(campaign, work, member, vacancy) {
    const party = fillingParty(campaign, member, vacancy.path, vacancy.since);
    const person = memberCandidates(work.people, party)[0];
    if (!person)
        return undefined;
    const state = member.state;
    const electionDue = vacancy.path === "appointment" ? senateElectionDate(state, vacancy.since) : undefined;
    const { vacancy: _filled, ...seat } = member;
    const step = seatMember(campaign, work, member, { ...seat, person, party, ...(electionDue ? { electionDue } : {}) });
    const name = work.people[person]?.base.name ?? "A successor";
    const summary = vacancy.path === "appointment"
        ? `The governor of ${campaign.states[state]?.base.name ?? state} appoints ${name} to the Senate, to serve until the voters fill the seat on ${formatGameDate(electionDue)}.`
        : `${name} wins the special election for the seat left by the late ${memberTitle(campaign, member)}${party === member.party ? "" : `, and the seat changes party`}.`;
    return { work: step.work, packet: successionPacket(campaign, summary, step.effects, [person, member.seat], ["congress", "succession", "elections"]) };
}
function specialDecided(campaign, work, member) {
    const party = fillingParty(campaign, member, "special-election", member.electionDue ?? campaign.calendar);
    const kept = party === member.party;
    const person = kept ? member.person : memberCandidates(work.people, party)[0];
    if (!person)
        return undefined;
    const { electionDue: _decided, ...seat } = member;
    const step = seatMember(campaign, work, member, { ...seat, person, party });
    const name = work.people[person]?.base.name ?? "The winner";
    const summary = kept
        ? `${memberTitle(campaign, member)}, appointed to the seat, wins the special election for it.`
        : `${name} wins the special election and unseats the appointed ${memberTitle(campaign, member)}.`;
    return { work: step.work, packet: successionPacket(campaign, summary, step.effects, [person, member.seat], ["congress", "elections"]) };
}
function governorDied(campaign, work, person, state) {
    const standing = campaign.states[state]?.governor;
    if (!standing)
        return undefined;
    const rule = governorSuccessor(state);
    const party = rule.ticket ? standing.party : specialElectionParty(campaign.states[state]?.lean ?? 0, standing.party);
    const successor = Object.values(work.people)
        .filter((runtime) => runtime.alive && runtime.currentRole === undefined && runtime.base.nationality === campaign.founding.nation &&
        runtime.base.eligibleRoles.includes(GOVERNOR_ROLE) && usPartyFromPersonParty(runtime.base.party) === party)
        .sort((a, b) => a.base.id.localeCompare(b.base.id))[0];
    if (!successor)
        return undefined;
    const id = successor.base.id;
    const seated = { person: id, party, disposition: standing.disposition, since: campaign.turn + 1,
        ...(standing.termEnds ? { termEnds: standing.termEnds } : {}) };
    const people = withRuntime(withRuntime(work.people, person, { alive: false, currentRole: undefined }), id, { currentRole: GOVERNOR_ROLE, state });
    const name = campaign.people[person]?.base.name ?? "The governor";
    const stateName = campaign.states[state]?.base.name ?? state;
    const summary = `Governor ${name} of ${stateName} dies in office. ${successor.base.name}, the state's ${rule.title}, is sworn in to serve out the term${party === standing.party ? "" : ", and the statehouse changes party"}.`;
    const effects = [
        { kind: "person", person, changes: { alive: false, currentRole: undefined } },
        { kind: "person", person: id, changes: { currentRole: GOVERNOR_ROLE, state } },
        { kind: "state", state, setGovernor: seated, reason: `${stateName}'s line of succession seats a new governor.` },
    ];
    return { work: { ...work, people }, packet: successionPacket(campaign, summary, effects, [person, id, state], ["governors", "succession"]) };
}
function secretaryDied(campaign, work, person, role, date) {
    const effects = [
        ...vacates(withWeekActings(campaign, work), role, "died", person, campaign.turn + 1, daysBetween(campaignFoundingDate(campaign), date)),
        { kind: "person", person, changes: { alive: false } },
    ];
    const acting = effects.find((effect) => effect.kind === "acting");
    const deputyName = acting?.kind === "acting" && acting.person ? campaign.people[acting.person]?.base.name : undefined;
    const name = campaign.people[person]?.base.name ?? "The Secretary";
    const summary = deputyName
        ? `${name}, ${roleTitle(role)}, dies in office. ${deputyName} runs the department as acting until a successor is confirmed.`
        : `${name}, ${roleTitle(role)}, dies in office, and the chair is empty.`;
    const people = withRuntime(work.people, person, { alive: false, currentRole: undefined });
    return { work: carryActings({ ...work, people }, effects), packet: successionPacket(campaign, summary, effects, [person, role], ["cabinet", "succession"]) };
}
/** A foreign leader's death. foreign-politics.ts seats the successor the same week. */
function leaderDied(campaign, work, person, nation) {
    const name = campaign.people[person]?.base.name ?? "The leader";
    const country = campaign.nations[nation]?.base.identity.name ?? nation;
    const summary = `${name}, the leader of ${country}, dies in office.`;
    const effects = [{ kind: "person", person, changes: { alive: false } }];
    const people = withRuntime(work.people, person, { alive: false });
    return { work: { ...work, people }, packet: successionPacket(campaign, summary, effects, [person, nation], ["foreign-politics", "succession"], false) };
}
/**
 * An agency head's death: the office empties, and where the law gives it an
 * acting officer the agency's first assistant acts from the day of death
 * (5 U.S.C. 3345(a)(1)); a board runs on its quorum, and an office the law
 * gives no acting stays open until the President fills it.
 */
function agencyHeadDied(campaign, work, person, institution, date) {
    const def = institutionDef(institution);
    const office = def?.offices[0];
    const runtime = campaign.institutions[institution];
    if (!def || !office || !runtime)
        return undefined;
    const emptied = { ...withWeekActings(campaign, work), institutions: { ...campaign.institutions, [institution]: { ...runtime, leader: undefined, vacancy: true } } };
    const fromDay = daysBetween(campaignFoundingDate(campaign), date);
    const acting = selectAppointableFor(emptied, leaderRoleOf(def), true).slice(0, 5)
        .map((candidate) => ({ candidate, result: actingEffects(emptied, office.id, candidate.base.id, fromDay) }))
        .find((entry) => entry.result.ok);
    const name = campaign.people[person]?.base.name ?? "The head";
    const summary = acting?.result.ok
        ? `${name}, ${office.title}, dies in office. ${acting.candidate.base.name} acts until a successor is confirmed.`
        : `${name}, ${office.title}, dies in office, and the office is open.`;
    const effects = [
        { kind: "institution", institution, vacate: true },
        { kind: "person", person, changes: { alive: false, currentRole: undefined, loyaltyAtAppointment: undefined } },
        ...vacancyBenchEffects(campaign, office.id),
        ...(acting?.result.ok ? acting.result.effects : []),
    ];
    const people = withRuntime(work.people, person, { alive: false, currentRole: undefined });
    return { work: carryActings({ ...work, people }, effects), packet: successionPacket(campaign, summary, effects, [person, institution], ["institutions", "succession"]) };
}
/**
 * The Vice President's death. The office stays empty until the President's
 * nominee is confirmed by both houses (Twenty-fifth Amendment, section 2);
 * meanwhile nobody presides over the Senate or breaks its ties, and the Speaker
 * is next in line. Emptying the office clears both through its one writer, and
 * the week's later Hill records carry the Congress without the chair.
 */
function vicePresidentDied(campaign, work, person) {
    const name = campaign.people[person]?.base.name ?? "The Vice President";
    const summary = `Vice President ${name} dies in office. The President will nominate a successor, who takes office once a majority of both houses confirms; until then the Speaker of the House is next in line.`;
    const effects = [
        { kind: "institution", institution: VICE_PRESIDENCY_INSTITUTION_ID, vacate: true },
        { kind: "person", person, changes: { alive: false, currentRole: undefined, loyaltyAtAppointment: undefined } },
    ];
    const { presidingOfficer: _chair, ...congress } = work.congress;
    const people = withRuntime(work.people, person, { alive: false, currentRole: undefined });
    return { work: { ...work, congress, people }, packet: successionPacket(campaign, summary, effects, [person, VICE_PRESIDENCY_INSTITUTION_ID], ["institutions", "succession"]) };
}
function deathStep(campaign, work, death) {
    const { person, office } = death.holder;
    if (office.kind === "vice-president")
        return vicePresidentDied(campaign, work, person);
    if (office.kind === "agency")
        return agencyHeadDied(campaign, work, person, office.institution, death.date);
    if (office.kind === "governor")
        return governorDied(campaign, work, person, office.state);
    if (office.kind === "cabinet")
        return secretaryDied(campaign, work, person, office.role, death.date);
    if (office.kind === "foreign-leader")
        return leaderDied(campaign, work, person, office.nation);
    const member = work.congress.members?.find((entry) => entry.seat === office.seat);
    return member && member.person === person ? memberDied(campaign, work, member, death.date) : undefined;
}
function dueStep(campaign, work, seat, close) {
    const member = work.congress.members?.find((entry) => entry.seat === seat);
    if (member?.vacancy && compareDates(member.vacancy.fillsOn, close) <= 0)
        return seatFilled(campaign, work, member, member.vacancy);
    if (member?.electionDue && compareDates(member.electionDue, close) <= 0)
        return specialDecided(campaign, work, member);
    return undefined;
}
/**
 * The week's deaths in office and the seats that come due: each death and each
 * filling its own record, in id order, the roster carried from one to the next
 * so a second change in the same week reads the first. It reads the whole week
 * to its close, so it sits on the last office day, where the close is today:
 * nothing it applies is dated after the day it runs, under either layout.
 */
export const officeSuccessionPhase = (state) => {
    const close = weekCloseDate(state);
    const packets = [];
    let work = { congress: state.congress, people: state.people, delegations: {} };
    for (const death of deathsThisWeek(state)) {
        const step = deathStep(state, work, death);
        if (!step)
            continue;
        work = step.work;
        packets.push(step.packet);
    }
    const seats = (work.congress.members ?? []).filter((member) => member.vacancy || member.electionDue).map((member) => member.seat).sort();
    for (const seat of seats) {
        const step = dueStep(state, work, seat, close);
        if (!step)
            continue;
        work = step.work;
        packets.push(step.packet);
    }
    return packets;
};
