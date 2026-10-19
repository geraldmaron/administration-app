import { selectCabinetHolder } from "./state.js";
import { markedFlags } from "./marked-flags.js";
import { isDeparting } from "./cabinet-departing.js";
import { roleTitle } from "./naming.js";
import { triggered } from "./cabinet-agenda.js";
import { chiefOfStaffReading } from "./cabinet.js";
import { cabinetGraftPackets } from "./cabinet-graft.js";
import { selectActing } from "./appointments.js";
import { decideMinister, departmentExposure, ministerStamp } from "./minister-will.js";
import { decideInitiative, initiativeFor, initiativeStamp, initiativeSummary, ordersByChair } from "./cabinet-initiative.js";
// What the cabinet puts to the President, week by week.
//
// Two things a Secretary does on their own initiative: offer to go, and ask for
// something. Each is a decision the Secretary makes, through the one decision
// model, and each lands on the agenda the Desk reads until the President
// answers it or it lapses. The agenda is recomputed whole each week, so an item
// nobody removed cannot outlive its own clock.
/** How long an offer stands: the week it is made and two more. */
const OFFER_STANDS_TURNS = 3;
/** A proposal waits one week, and is gone at that week's close. */
const PROPOSAL_STANDS_TURNS = 1;
/** Half a year before a Secretary whose offer was declined or ignored puts it again. */
export const OFFER_COOLDOWN_TURNS = 26;
/** An offer the President never answered is a Secretary who was not worth an answer. */
export const IGNORED_OFFER_LOYALTY = -0.02;
/**
 * How high the Chief of Staff sets the bar a department's request has to clear
 * to reach the President, and how the bar moves with the chief: a sharp chief
 * screens the marginal request out, a weak one lets the building's noise through.
 */
const TRIAGE_BAR_AT_MIDPOINT = 0.3;
const TRIAGE_BAR_SLOPE = 0.6;
const TRIAGE_BAR_FLOOR = 0.2;
const TRIAGE_BAR_CEILING = 0.6;
const EMPTY_AGENDA = { proposals: [], offers: [] };
/** The flag a lapsed or declined offer leaves, dated, so the Secretary does not put it again next week. */
export function offerAnsweredFlag(person) {
    return `resignation-offer-answered:${person}`;
}
/**
 * The flag a request nobody answered leaves on its department, dated: a
 * Secretary ignored once waits a couple of months before asking again, rather
 * than putting the same memo on the Desk every Monday.
 */
export function requestLapsedFlag(role) {
    return `cabinet-request-lapsed:${role}`;
}
/** Two months: long enough that asking again is a new request rather than the same one. */
const REQUEST_COOLDOWN_TURNS = 8;
function markedWithin(campaign, flag, turns) {
    const prefix = `flagset:${flag}:`;
    return Object.keys(campaign.player.flags).some((key) => {
        if (!key.startsWith(prefix) || campaign.player.flags[key] !== true)
            return false;
        const turn = Number(key.slice(prefix.length));
        return Number.isFinite(turn) && campaign.turn - turn < turns;
    });
}
/** Whether an item is still live in the week being run. */
export function agendaItemLive(item, week) {
    return item.expiresTurn === undefined || item.expiresTurn > week;
}
/** Whether the person who raised an item still holds the chair they raised it from, or acts in it. */
export function stillRaisedBy(campaign, role, person) {
    return campaign.player.cabinet[role] === person || campaign.actings?.[role] === person;
}
/** The Secretaries who can decide anything this week: seated, alive, and not the President. */
function seatedSecretaries(campaign) {
    return Object.keys(campaign.player.cabinet).flatMap((role) => {
        if (role === campaign.founding.leadRole)
            return [];
        const holder = selectCabinetHolder(campaign, role);
        return holder?.alive ? [{ role, holder }] : [];
    });
}
/** The leading reason for an offer, as the Desk can print it. */
const OFFER_REASONS = {
    loyalty: "has lost faith in the direction of the administration",
    "times-overruled": "has been overruled on the calls that mattered to them",
    "department-exposure": "is answering for a department that is not carrying its work",
    integrity: "means to take responsibility for what went wrong on their watch",
    principle: "will not defend a course they believe is wrong",
    "co-partisanship": "never belonged to the President's party, and no longer pretends to",
};
function offerReason(name, terms) {
    const lead = [...terms].filter((term) => term.value > 0).sort((a, b) => b.value - a.value)[0];
    const phrase = (lead && OFFER_REASONS[lead.key]) ?? "no longer believes they are the right person for the job";
    return `${name} ${phrase}.`;
}
function offersThisWeek(state, agenda, week, turn) {
    const pending = new Set(agenda.offers.map((offer) => offer.person));
    return seatedSecretaries(state).flatMap(({ role, holder }) => {
        const person = holder.base;
        // A Secretary who has already announced they are going has nothing left to offer.
        if (isDeparting(state, role, person.id))
            return [];
        if (pending.has(person.id) || markedWithin(state, offerAnsweredFlag(person.id), OFFER_COOLDOWN_TURNS))
            return [];
        const decision = decideMinister(state, "minister-offer", role, person);
        if (!decision.acts)
            return [];
        const reason = offerReason(person.name, decision.terms);
        const offer = { id: `offer:${role}:${week}`, role, person: person.id, turn: week, reason, expiresTurn: week + OFFER_STANDS_TURNS };
        const provenance = { origin: "world", entities: [person.id], systems: ["cabinet", "offer"], decision: ministerStamp(decision, person.id, role) };
        return [{ item: offer, packet: { source: "simulate", actor: "world", turn, provenance, narration: { summary: `${person.name} offers the President their resignation.` } } }];
    });
}
/**
 * A Secretary who brought an act of their own waits half a year before
 * bringing another, taken or not: a cabinet member with an idea a season is
 * a cabinet with ideas; one with an idea a week is a cabinet lobbying its own
 * President.
 */
const INITIATIVE_COOLDOWN_TURNS = 26;
/**
 * A Secretary's own act is worth the Chief of Staff's attention by how well it
 * fits them, and never as urgently as a department that cannot do its work.
 */
const INITIATIVE_URGENCY = 0.5;
/** The flag a Secretary's own proposal leaves on them, dated, so a cabinet speaks a few times a year rather than every week. */
export function initiativeFlag(person) {
    return `cabinet-initiative:${person}`;
}
function askFor(state, proposal) {
    const acting = selectActing(state, proposal.role);
    const holder = proposal.reason === "vacancy" ? (acting ? state.people[acting] : undefined) : selectCabinetHolder(state, proposal.role);
    if (!holder?.alive)
        return undefined;
    const urgency = proposal.reason === "vacancy" ? 1 : departmentExposure(state, proposal.role);
    return { proposal, person: holder.base, urgency };
}
/** The bar a request has to clear to reach the Desk under this Chief of Staff. */
export function triageBar(campaign) {
    const reading = chiefOfStaffReading(campaign) ?? 0.5;
    const bar = TRIAGE_BAR_AT_MIDPOINT + TRIAGE_BAR_SLOPE * (reading - 0.5);
    return Math.round(Math.max(TRIAGE_BAR_FLOOR, Math.min(TRIAGE_BAR_CEILING, bar)) * 1000) / 1000;
}
/**
 * The order the Chief of Staff puts the building's requests in. A chief with
 * good judgment reads them by how much trouble each department is in; a weak
 * one hears the loudest Secretary first.
 */
export function triageScore(campaign, urgency, ambition) {
    const judgment = chiefOfStaffReading(campaign) ?? 0.5;
    return judgment * urgency + (1 - judgment) * ambition;
}
function proposalSummary(ask) {
    const title = roleTitle(ask.proposal.role);
    return ask.proposal.reason === "vacancy"
        ? `The acting ${title} asks the President to send a nominee to the Senate: a department cannot plan under an acting officer.`
        : `The ${title} asks for a staff surge to get the department carrying its work again.`;
}
function requestBids(state, week, bar) {
    return triggered(state)
        .map((candidate) => askFor(state, { role: candidate.role, reason: candidate.reason, week }))
        .filter((ask) => ask !== undefined && ask.urgency >= bar && !markedWithin(state, requestLapsedFlag(ask.proposal.role), REQUEST_COOLDOWN_TURNS))
        .map((ask) => ({ kind: "request", role: ask.proposal.role, person: ask.person, urgency: ask.urgency, ask }));
}
function initiativeBids(state, bar) {
    const orders = ordersByChair(state);
    return seatedSecretaries(state).flatMap(({ role, holder }) => {
        const person = holder.base;
        if (isDeparting(state, role, person.id) || markedWithin(state, initiativeFlag(person.id), INITIATIVE_COOLDOWN_TURNS))
            return [];
        const candidate = initiativeFor(state, role, person, orders);
        const urgency = candidate ? INITIATIVE_URGENCY * candidate.fit : 0;
        return candidate && urgency >= bar ? [{ kind: "initiative", role, person, urgency, candidate }] : [];
    });
}
function requestDecided(ask, week, turn, state) {
    const decision = decideMinister(state, "minister-proposal", ask.proposal.role, ask.person);
    if (!decision.acts)
        return undefined;
    const summary = proposalSummary(ask);
    const item = {
        id: `proposal:${ask.proposal.reason}:${ask.proposal.role}:${week}`,
        role: ask.proposal.role,
        person: ask.person.id,
        turn: week,
        summary,
        expiresTurn: week + PROPOSAL_STANDS_TURNS,
    };
    const provenance = { origin: "world", entities: [ask.person.id], systems: ["cabinet", "proposal"], decision: ministerStamp(decision, ask.person.id, ask.proposal.role) };
    return { item, packet: { source: "simulate", actor: "world", turn, provenance, narration: { summary } } };
}
function initiativeDecided(candidate, week, turn, state) {
    const decision = decideInitiative(state, candidate);
    if (!decision.acts)
        return undefined;
    const summary = initiativeSummary(state, candidate);
    const item = {
        id: `proposal:initiative:${candidate.role}:${week}`,
        role: candidate.role,
        person: candidate.person.id,
        turn: week,
        summary,
        expiresTurn: week + PROPOSAL_STANDS_TURNS,
        act: candidate.act,
    };
    const provenance = { origin: "world", entities: [candidate.person.id], systems: ["cabinet", "initiative"], decision: initiativeStamp(decision, candidate.person.id, candidate.role) };
    const remembered = { kind: "flag", set: markedFlags([initiativeFlag(candidate.person.id)], turn) };
    return { item, packet: { source: "simulate", actor: "world", turn, provenance, narration: { summary } }, extra: [remembered] };
}
/**
 * The Desk's one item of the week: a department's request or a Secretary's own
 * act, whichever the Chief of Staff reads first among those that clear the bar
 * and whose Secretary chooses to bring it.
 */
function proposalThisWeek(state, agenda, week, turn) {
    if (agenda.lastProposalTurn === week || agenda.proposals.some((proposal) => agendaItemLive(proposal, week)))
        return undefined;
    const bar = triageBar(state);
    const score = (bid) => triageScore(state, bid.urgency, bid.person.ambition);
    const bids = [...requestBids(state, week, bar), ...initiativeBids(state, bar)].sort((a, b) => score(b) - score(a) || (a.role < b.role ? -1 : a.role > b.role ? 1 : 0) || (a.kind === "request" ? -1 : 1));
    for (const bid of bids) {
        const decided = bid.kind === "request" ? requestDecided(bid.ask, week, turn, state) : initiativeDecided(bid.candidate, week, turn, state);
        if (decided)
            return decided;
    }
    return undefined;
}
/** What the week's close does to offers nobody answered, and to actings whose authority has already lapsed. */
function housekeeping(state, prior, kept, turn) {
    const lapsed = prior.offers.filter((offer) => !kept.offers.includes(offer) && stillRaisedBy(state, offer.role, offer.person));
    // A Secretary's own act carries its own memory; letting it lapse is no reason
    // to stop their department asking for what it needs.
    const unanswered = prior.proposals.filter((proposal) => proposal.act === undefined && !kept.proposals.includes(proposal) && stillRaisedBy(state, proposal.role, proposal.person));
    const stale = Object.keys(state.actings ?? {}).filter((seat) => selectActing(state, seat) === undefined);
    const answered = [...lapsed.map((offer) => offerAnsweredFlag(offer.person)), ...unanswered.map((proposal) => requestLapsedFlag(proposal.role))];
    return [
        ...lapsed.map((offer) => ({ kind: "person", person: offer.person, changes: {}, loyaltyShift: IGNORED_OFFER_LOYALTY })),
        ...(answered.length > 0 ? [{ kind: "flag", set: markedFlags(answered, turn) }] : []),
        ...stale.map((seat) => ({ kind: "acting", seat })),
    ];
}
/**
 * The cabinet's week: offers and proposals decided, items nobody answered
 * lapsed, and the agenda written whole. One packet per decision, so each
 * carries the reason it was made; each writes the agenda as it stands after
 * that decision, so the last one applied leaves the whole of it.
 */
export function cabinetAgendaPackets(state) {
    const week = state.turn;
    const turn = state.turn + 1;
    const prior = state.cabinetAgenda ?? EMPTY_AGENDA;
    const kept = {
        ...prior,
        offers: prior.offers.filter((offer) => agendaItemLive(offer, week) && stillRaisedBy(state, offer.role, offer.person)),
        proposals: prior.proposals.filter((proposal) => agendaItemLive(proposal, week) && stillRaisedBy(state, proposal.role, proposal.person)),
    };
    const packets = [];
    let agenda = kept;
    const chores = housekeeping(state, prior, kept, turn);
    if (chores.length > 0 || kept.offers.length !== prior.offers.length || kept.proposals.length !== prior.proposals.length) {
        const summary = "The cabinet's outstanding business is brought up to date.";
        packets.push({ source: "simulate", actor: "world", turn, provenance: { origin: "world", systems: ["cabinet"] }, narration: { summary }, effects: [...chores, { kind: "cabinetAgenda", set: agenda }] });
    }
    for (const offer of offersThisWeek(state, agenda, week, turn)) {
        agenda = { ...agenda, offers: [...agenda.offers, offer.item] };
        packets.push({ ...offer.packet, effects: [{ kind: "cabinetAgenda", set: agenda }] });
    }
    const proposal = proposalThisWeek(state, agenda, week, turn);
    if (proposal) {
        agenda = { ...agenda, proposals: [...agenda.proposals, proposal.item], lastProposalTurn: week };
        packets.push({ ...proposal.packet, effects: [{ kind: "cabinetAgenda", set: agenda }, ...(proposal.extra ?? [])] });
    }
    return [...packets, ...cabinetGraftPackets(state)];
}
