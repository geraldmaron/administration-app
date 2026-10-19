import { selectPerson } from "./state.js";
import { markedFlags } from "./marked-flags.js";
import { institutionForRole } from "./institutions.js";
import { nationName, roleTitle } from "./naming.js";
import { vacates } from "./appointments.js";
import { openNomination } from "./nomination.js";
import { confirmationVote } from "./confirmation-count.js";
import { agendaItemLive, offerAnsweredFlag, stillRaisedBy } from "./cabinet-week.js";
import { createRngStreams } from "./rng.js";
import { executiveOrder, orderAvailability, projectOrder, signOrder } from "./orders.js";
import { commandDef, POSTURE_READINESS_COST, setCommandPosture } from "./combatant-commands.js";
import { engagementPacket, projectEngagement } from "./engagement.js";
import { foundedCharter, receiveChance } from "./cabinet-initiative.js";
/** An accepted resignation is an orderly exit: a vacancy, not an argument. */
const ACCEPTED_STANDING_COST = 0.01;
/** Being asked to stay is worth something to the Secretary who offered. */
export const DECLINED_OFFER_LOYALTY = 0.04;
/** A Secretary whose request was taken was listened to. */
export const TAKEN_PROPOSAL_LOYALTY = 0.01;
/**
 * A staff surge: people detailed in from elsewhere in the government and
 * overtime for the ones already there, priced per unit of the department's
 * scale. Enough to lift a department back over the delivery line in a few
 * weeks, not enough to make a surge the answer to every week.
 */
const SURGE_USD_PER_SCALE = 150_000_000;
const SURGE_STAFFING = 0.08;
const SURGE_MORALE = 0.04;
function agendaOf(campaign) {
    return campaign.cabinetAgenda ?? { proposals: [], offers: [] };
}
function standingOffer(campaign, id) {
    const offer = agendaOf(campaign).offers.find((entry) => entry.id === id);
    if (!offer)
        return { ok: false, reason: "There is no such offer on the table." };
    if (!agendaItemLive(offer, campaign.turn - 1))
        return { ok: false, reason: "That offer has lapsed." };
    if (!stillRaisedBy(campaign, offer.role, offer.person))
        return { ok: false, reason: "They no longer hold the chair they offered to leave." };
    return offer;
}
/** The price of answering an offer, which `answerResignationOffer` spends as it stands. */
export function projectResignationAnswer(campaign, id, answer) {
    const offer = standingOffer(campaign, id);
    if ("ok" in offer)
        return offer;
    const name = selectPerson(campaign, offer.person)?.base.name ?? "The Secretary";
    if (answer === "accept") {
        return {
            ok: true,
            offer,
            cost: { standing: -ACCEPTED_STANDING_COST },
            risks: [{ id: "offer-accepted", chance: 1, description: `${name} leaves the cabinet, and the department runs under an acting officer until the Senate confirms a successor.` }],
        };
    }
    return {
        ok: true,
        offer,
        cost: {},
        risks: [{ id: "offer-declined", chance: 1, description: `${name} stays, and their loyalty rises ${Math.round(DECLINED_OFFER_LOYALTY * 100)} points for having been asked to.` }],
    };
}
function withoutOffer(campaign, id) {
    const agenda = agendaOf(campaign);
    return { kind: "cabinetAgenda", set: { ...agenda, offers: agenda.offers.filter((offer) => offer.id !== id) } };
}
/** Accept or decline a Secretary's offer to resign. */
export function answerResignationOffer(campaign, id, answer) {
    const projection = projectResignationAnswer(campaign, id, answer);
    if (!projection.ok)
        return projection;
    const { offer } = projection;
    const name = selectPerson(campaign, offer.person)?.base.name ?? "The Secretary";
    const accepted = answer === "accept";
    const summary = accepted ? `The President accepts ${name}'s resignation.` : `The President asks ${name} to stay, and they agree.`;
    const effects = accepted
        ? [
            ...vacates(campaign, offer.role, "resigned", offer.person),
            { kind: "metric", deltas: projection.cost },
            { kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", headline: `${name} resigns from the cabinet.`, facts: { subject: name } }] },
        ]
        : [
            { kind: "person", person: offer.person, changes: {}, loyaltyShift: DECLINED_OFFER_LOYALTY },
            { kind: "flag", set: markedFlags([offerAnsweredFlag(offer.person)], campaign.turn) },
        ];
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", entities: [offer.person], systems: ["cabinet", "offer"] },
            narration: { summary },
            effects: [...effects, withoutOffer(campaign, id)],
        },
    };
}
function standingProposal(campaign, id) {
    const proposal = agendaOf(campaign).proposals.find((entry) => entry.id === id);
    if (!proposal)
        return { ok: false, reason: "There is no such request on the Desk." };
    if (!agendaItemLive(proposal, campaign.turn - 1))
        return { ok: false, reason: "That request has lapsed." };
    if (!stillRaisedBy(campaign, proposal.role, proposal.person))
        return { ok: false, reason: "Whoever made the request no longer holds the chair." };
    return proposal;
}
/** The kind is the second segment of the id, which is where the week's trigger is recorded. */
function kindOf(proposal) {
    return proposal.id.split(":")[1] === "vacancy" ? "vacancy" : "delivery";
}
/** The price of taking a request, which `takeMinisterProposal` spends as it stands. */
export function projectMinisterProposal(campaign, id) {
    const proposal = standingProposal(campaign, id);
    if ("ok" in proposal)
        return proposal;
    if (proposal.act) {
        const price = priceProposalAct(campaign, proposal.act);
        return "ok" in price ? price : { ok: true, proposal, kind: proposal.act.kind, ...price };
    }
    const kind = kindOf(proposal);
    const def = institutionForRole(proposal.role);
    if (!def)
        return { ok: false, reason: "That chair runs no department." };
    if (kind === "vacancy") {
        const name = selectPerson(campaign, proposal.person)?.base.name ?? "The acting officer";
        const vote = confirmationVote(campaign, proposal.person);
        return {
            ok: true,
            proposal,
            kind,
            cost: {},
            risks: [{ id: "proposal-nomination", chance: 1, description: `${name} goes to the Senate, which counts ${vote.yeas} for and ${vote.nays} against today, ${vote.required} needed.` }],
        };
    }
    return {
        ok: true,
        proposal,
        kind,
        cost: { treasury: -Math.round(SURGE_USD_PER_SCALE * def.staffScale) },
        risks: [{ id: "proposal-surge", chance: 1, description: `The department's staffing rises ${Math.round(SURGE_STAFFING * 100)} points and its morale ${Math.round(SURGE_MORALE * 100)}.` }],
    };
}
function withoutProposal(campaign, id) {
    const agenda = agendaOf(campaign);
    return { kind: "cabinetAgenda", set: { ...agenda, proposals: agenda.proposals.filter((proposal) => proposal.id !== id) } };
}
/** What taking a request does, beyond crediting the Secretary who made it. */
function proposalEffects(campaign, proposal, kind, cost) {
    const def = institutionForRole(proposal.role);
    if (kind === "vacancy") {
        const office = def.offices[0];
        const opened = office ? openNomination(campaign, office.id, proposal.person) : { ok: false, reason: "That department has no office to fill." };
        return opened.ok ? opened.packet.effects : opened;
    }
    const runtime = campaign.institutions[def.id];
    if (!runtime)
        return { ok: false, reason: "That department is not running in this campaign." };
    return [
        { kind: "metric", deltas: cost },
        { kind: "institution", institution: def.id, changes: { staffing: Math.min(1, runtime.staffing + SURGE_STAFFING), morale: Math.min(1, runtime.morale + SURGE_MORALE) } },
    ];
}
/**
 * Take a Secretary's request: the surge or the nomination it asked for, or the
 * act they brought, and the credit of having been heard. An act goes through
 * its own entry point, so taking a Secretary's order is signing that order and
 * nothing less; the draw it carries is the one signing it directly would.
 */
export function takeMinisterProposal(campaign, id, streams = createRngStreams(campaign.seed)) {
    const projection = projectMinisterProposal(campaign, id);
    if (!projection.ok)
        return projection;
    const { proposal } = projection;
    if (proposal.act)
        return takeProposalAct(campaign, proposal, proposal.act, streams);
    const kind = projection.kind === "vacancy" ? "vacancy" : "delivery";
    const effects = proposalEffects(campaign, proposal, kind, projection.cost);
    if ("ok" in effects)
        return effects;
    const summary = `The President grants the ${roleTitle(proposal.role)}'s request.`;
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", entities: [proposal.person], systems: ["cabinet", "proposal"] },
            narration: { summary },
            effects: [...effects, { kind: "person", person: proposal.person, changes: {}, loyaltyShift: TAKEN_PROPOSAL_LOYALTY }, withoutProposal(campaign, id)],
        },
    };
}
// --- A Secretary's own act ---------------------------------------------------
function priceOrder(campaign, orderId) {
    const order = executiveOrder(orderId);
    const charter = foundedCharter(campaign);
    if (!order || !charter)
        return { ok: false, reason: "That order is no longer on the desk." };
    const availability = orderAvailability(campaign, order);
    if (!availability.ok)
        return { ok: false, reason: `${order.name} cannot be signed: it needs ${availability.missing}.` };
    const projection = projectOrder(campaign, charter, order);
    const objection = projection.review?.objects ? " The Attorney General will object in writing, which makes the challenge likelier." : "";
    return {
        cost: projection.cost,
        risks: [{ id: "proposal-order-challenge", chance: projection.challengeChance, description: `The courts or Congress challenge ${order.name}. ${projection.reasoning}${objection}` }],
    };
}
function pricePosture(campaign, act) {
    const def = commandDef(act.command);
    const current = campaign.security.unifiedCommand.commands[act.command]?.posture;
    if (!def || current === undefined)
        return { ok: false, reason: "That command is not standing." };
    if (current === act.posture)
        return { ok: false, reason: `${def.abbr} is already at ${act.posture}.` };
    const weekly = POSTURE_READINESS_COST[act.posture];
    const description = weekly > 0
        ? `${def.abbr} goes to ${act.posture}, which draws ${Math.round(weekly * 1000) / 10} points of the military's readiness every week it holds.`
        : `${def.abbr} goes to ${act.posture}, and stops drawing on the military's readiness.`;
    return { cost: {}, risks: [{ id: "proposal-posture", chance: 1, description }] };
}
function priceEngagement(campaign, act) {
    const request = { actor: campaign.founding.nation, target: act.target, kind: act.engagement };
    const projection = projectEngagement(campaign, request);
    const identity = campaign.nations[act.target]?.base.identity;
    const name = identity ? nationName(identity) : act.target;
    if (!projection)
        return { ok: false, reason: `A ${act.engagement} with ${name} is not on the table this week.` };
    return {
        cost: {},
        risks: [{ id: "proposal-engagement", chance: receiveChance(projection.willingness), description: `${name} receives it, and relations warm.` }],
    };
}
/** The price of the act a Secretary brought, read off that act's own projection. */
function priceProposalAct(campaign, act) {
    if (act.kind === "order")
        return priceOrder(campaign, act.order);
    if (act.kind === "posture")
        return pricePosture(campaign, act);
    return priceEngagement(campaign, act);
}
function actPacket(campaign, act, streams) {
    if (act.kind === "posture")
        return setCommandPosture(campaign, act.command, act.posture);
    if (act.kind === "engagement") {
        return engagementPacket(campaign, { actor: campaign.founding.nation, target: act.target, kind: act.engagement }, streams);
    }
    const charter = foundedCharter(campaign);
    if (!charter)
        return { ok: false, reason: "This campaign's charter is no longer defined." };
    const signed = signOrder(campaign, charter, act.order, streams);
    return signed.ok ? { ok: true, packet: signed.packet } : { ok: false, reason: signed.reason };
}
function takeProposalAct(campaign, proposal, act, streams) {
    const done = actPacket(campaign, act, streams);
    if (!done.ok)
        return done;
    const credit = { kind: "person", person: proposal.person, changes: {}, loyaltyShift: TAKEN_PROPOSAL_LOYALTY };
    return { ok: true, packet: { ...done.packet, effects: [...done.packet.effects, credit, withoutProposal(campaign, proposal.id)] } };
}
