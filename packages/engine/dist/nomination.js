import { actingClockEffects, nominationEndsActing } from "./appointments.js";
import { selectPerson } from "./state.js";
import { institutionDef, leadsInstitution, officeDef, officeInstitution, } from "./institutions.js";
import { campaignDay } from "./clock.js";
import { apply } from "./effects.js";
import { COMMITTEE_IDS, committeeName, committeePanel } from "./committees.js";
import { appointmentPool } from "./appointment-pool.js";
import { seatKindOf, seatRuleRefusal } from "./appointment-eligibility.js";
import { crossingLoyaltyEffects } from "./confirmation-count.js";
import { awaitsSuccessor } from "./cabinet-departing.js";
import { CONGESTED_STAGES, isTerminal, resolveStage, selectActiveNominations, selectNominationForOffice, stageDuration, } from "./nomination-stages.js";
// --- Selectors --------------------------------------------------------------
export function selectNomination(campaign, id) {
    return campaign.nominations[id];
}
/** Everything waiting for floor time, which is what makes the next one slower. */
export function selectPendingOnFloor(campaign) {
    return selectActiveNominations(campaign).filter((nomination) => CONGESTED_STAGES.includes(nomination.stage));
}
export function selectNominationsBefore(campaign, committee) {
    return selectActiveNominations(campaign).filter((nomination) => nomination.committee === committee);
}
export function selectCommitteeDocket(campaign, committee) {
    return { panel: committeePanel(campaign, committee), pending: selectNominationsBefore(campaign, committee) };
}
/** Every committee, in the catalog's own order. */
export function selectCommitteeDockets(campaign) {
    return COMMITTEE_IDS.map((committee) => selectCommitteeDocket(campaign, committee));
}
/** The committee a nomination is before, in the words a screen prints. */
export function nominationCommitteeName(nomination) {
    return nomination.committee ? committeeName(nomination.committee) : undefined;
}
/** How long this nomination has been running, in days. */
export function nominationAge(campaign, nomination) {
    return campaignDay(campaign) - nomination.openedDay;
}
// The presidency's day counter is a fact about the clock, not about the
// nomination pipeline, so `clock.ts` defines it. It is exported from here as
// well because the executive-branch modules that stamp a day on a record — war
// powers, findings, intelligence, the docket, the seat calendar — reach it
// through this module.
export { campaignDay };
// --- Controversy ------------------------------------------------------------
const INTEGRITY_CONTROVERSY_FLOOR = 0.35;
const COMPETENCE_CONTROVERSY_FLOOR = 0.4;
const AMBITION_CONTROVERSY_CEILING = 0.85;
/**
 * What vetting turns up, decided once from facts already on the person rather
 * than drawn fresh — so the same nominee is the same nominee whenever they are
 * sent up, and a president cannot reroll a problem away by withdrawing and
 * renominating.
 */
export function vettingFindings(person) {
    const findings = [];
    if (person.integrity < INTEGRITY_CONTROVERSY_FLOOR) {
        findings.push("unresolved questions in the background file");
    }
    if (person.competence < COMPETENCE_CONTROVERSY_FLOOR) {
        findings.push("a thin record for the office");
    }
    if (person.ambition > AMBITION_CONTROVERSY_CEILING) {
        findings.push("past statements the committee intends to read back");
    }
    return findings;
}
function nominationId(office, day) {
    return `${office}:${day}`;
}
/**
 * Who the President could actually send up for an office right now, best fit
 * for the seat first: the appointment pool's people, without its reasons.
 * Kept for the readers that want a list of people (the judicial-vacancy
 * scenario's cast, fixtures); a screen that shows why reads `appointmentPool`.
 */
export function selectNominableFor(campaign, office) {
    return appointmentPool(campaign, office).map((row) => row.person);
}
/**
 * Send a name up for every empty office in one act: the President's pick where
 * there is one, the pool's first name where there is not.
 *
 * A president does not fill fifty offices one click at a time, and the game
 * should not ask them to: the appointment that matters is *who* goes where, and
 * the rest is paperwork the office exists to do. Each packet is built against
 * the state the previous ones produced, so the same person is never sent up
 * twice, a pick already sent for an earlier seat is refused for a later one,
 * and the returned list applies in order to reproduce exactly what was
 * computed here.
 *
 * Nothing is seated by this. Every name still goes through vetting, committee
 * and the floor on the Senate's schedule, and a president who sends up fifty at
 * once gets what a real one gets: a queue, and floor congestion that stretches
 * every stage.
 */
export function fillVacantOffices(campaign, offices, picks = {}) {
    const packets = [];
    let working = campaign;
    for (const office of offices) {
        if (selectNominationForOffice(working, office))
            continue;
        const nominee = picks[office] ?? selectNominableFor(working, office)[0]?.base.id;
        if (!nominee)
            continue;
        const opened = openNomination(working, office, nominee);
        if (!opened.ok)
            continue;
        packets.push(opened.packet);
        working = apply(working, opened.packet);
    }
    return packets;
}
/**
 * Who sits in the chair a nomination for this office would fill, where
 * somebody alive does. A department's chair is read off the cabinet seat and
 * any other body's off its leader; a deputy's office has no record of its own,
 * so nobody is ever in it as far as the pipeline can tell.
 */
function chairHolder(campaign, office) {
    const institution = officeInstitution(office);
    if (!institution || !leadsInstitution(office))
        return undefined;
    // A Secretary serving out an announced departure holds the chair only until
    // a successor is confirmed, which is the point of the announcement: the
    // successor goes up while they serve, and confirmation seats over them.
    if (awaitsSuccessor(campaign, institution.cabinetRole))
        return undefined;
    const seat = institution.cabinetRole ? campaign.player.cabinet[institution.cabinetRole] : undefined;
    const id = seat ?? campaign.institutions[institution.id]?.leader;
    const holder = id ? campaign.people[id] : undefined;
    return holder?.alive ? holder : undefined;
}
/** What is structurally impossible about sending this name up for this office, if anything. */
function nominationRefusal(campaign, office, nominee) {
    const def = officeDef(office);
    if (!def)
        return "No such office.";
    if (!officeInstitution(office))
        return "That office belongs to no institution.";
    if (!seatKindOf(office))
        return `${def.title} is not confirmed by the Senate. There is no nomination to send.`;
    if (selectNominationForOffice(campaign, office))
        return `A nomination for ${def.title} is already before the Senate.`;
    // A name sent up for a chair somebody already sits in would, if confirmed,
    // seat a second person over the first.
    const holder = chairHolder(campaign, office);
    if (holder)
        return `${holder.base.name} holds ${def.title}. The chair has to be empty before a successor is sent up.`;
    const lightSeat = campaign.institutions[officeInstitution(office).id];
    if (lightSeat?.lowerBenchSeat && !lightSeat.vacancy)
        return `That ${def.title} seat is occupied.`;
    const candidate = campaign.people[nominee];
    if (!candidate)
        return "No such person is in this campaign.";
    if (!candidate.alive)
        return `${candidate.base.name} is no longer available.`;
    if (candidate.currentRole !== undefined)
        return `${candidate.base.name} already holds another office.`;
    if (candidate.base.nationality !== campaign.founding.nation)
        return `${candidate.base.name} is not one of your nationals.`;
    const elsewhere = selectActiveNominations(campaign).find((nomination) => nomination.nominee === nominee);
    if (elsewhere)
        return `${candidate.base.name} is already before the Senate for ${officeDef(elsewhere.office)?.title ?? "another office"}.`;
    return seatRuleRefusal(campaign, office, candidate.base);
}
/**
 * Send a name up for an office.
 *
 * Deliberately does not check whether the Senate would confirm: a president may
 * spend a nomination on a fight they will lose, and the game should let them,
 * because choosing to have the fight in public is a real presidential act. What
 * it refuses is what is structurally impossible — an office that does not
 * exist or that the Senate does not confirm, a seat already contested or
 * already filled, a person already serving or already sent up elsewhere — and
 * what the seat's own rules forbid (appointment-eligibility.ts).
 *
 * The one commit path for every Senate-confirmed seat, cabinet chairs
 * included: an empty chair waits on the Senate under its acting, the way every
 * other seat does.
 */
export function openNomination(campaign, office, nominee) {
    const refusal = nominationRefusal(campaign, office, nominee);
    if (refusal)
        return { ok: false, reason: refusal };
    const def = officeDef(office);
    const institution = officeInstitution(office);
    const name = campaign.people[nominee].base.name;
    const day = campaignDay(campaign);
    const nomination = {
        id: nominationId(office, day),
        office,
        institution: institution.id,
        nominee,
        // A president who has decided on a name has already done the shortlist.
        // The clock the player feels starts at vetting, which is where the delay
        // actually lives.
        stage: "vetting",
        stageEnteredDay: day,
        openedDay: day,
        ...(def.committee ? { committee: def.committee } : {}),
        controversies: vettingFindings(campaign.people[nominee].base),
        history: [{ stage: "vetting", day, note: `${name} enters vetting for ${def.title}.` }],
    };
    const headline = `The President will nominate ${name} to be ${def.title}.`;
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", entities: [nominee, institution.id], systems: ["nominations"] },
            narration: { summary: `${name} is put forward for ${def.title}.` },
            effects: [
                { kind: "nomination", nomination },
                ...nominationEndsActing(campaign, office, nominee),
                // A cabinet chair going across the aisle is read by the President's
                // own Secretaries the day it is announced, not the day it is seated.
                ...(institution.cabinetRole && leadsInstitution(office) ? crossingLoyaltyEffects(campaign, nominee, institution.cabinetRole) : []),
                { kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", headline, facts: { subject: name } }] },
            ],
        },
    };
}
/** Pull a name back. Cheaper than losing a floor vote, and not free. */
export function withdrawNomination(campaign, id) {
    const nomination = selectNomination(campaign, id);
    if (!nomination)
        return { ok: false, reason: "No such nomination." };
    if (isTerminal(nomination.stage))
        return { ok: false, reason: "That nomination has already ended." };
    // Confirmation seats the officer; the oath a week later is the formality.
    // Pulling the name back then would leave them in the chair under a
    // nomination the record calls withdrawn.
    if (nomination.stage === "confirmed")
        return { ok: false, reason: "The Senate has already confirmed the nominee." };
    const person = campaign.people[nomination.nominee];
    const name = person?.base.name ?? "The nominee";
    const title = officeDef(nomination.office)?.title ?? nomination.office;
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", entities: [nomination.nominee], systems: ["nominations"] },
            narration: { summary: `${name}'s nomination to be ${title} is withdrawn.` },
            effects: [
                {
                    kind: "nomination",
                    advance: {
                        id,
                        stage: "withdrawn",
                        day: campaignDay(campaign),
                        note: "Withdrawn by the President.",
                        outcome: "withdrawn",
                    },
                },
                ...actingClockEffects(campaign, nomination, "withdrawn", campaignDay(campaign)),
                { kind: "metric", deltas: { standing: -0.012 } },
            ],
        },
    };
}
// --- The turn phase ---------------------------------------------------------
const CONFIRMATION_STANDING_GAIN = 0.01;
const REJECTION_STANDING_COST = 0.03;
const RETURNED_STANDING_COST = 0.015;
export function outcomeHeadline(state, nomination, stage, outcome) {
    const name = selectPerson(state, nomination.nominee)?.base.name ?? "The nominee";
    const office = institutionDef(nomination.institution)?.offices.find((entry) => entry.id === nomination.office)?.title ?? "the post";
    const stake = `whether ${name} serves as ${office}`;
    // An office both houses confirm is seated by Congress, and a House defeat
    // follows a Senate yes, so the chamber that answered has to be the one named.
    const confirmer = officeDef(nomination.office)?.confirmedByBothHouses ? "Congress" : "The Senate";
    const rejecter = outcome === "rejected in the House" ? "The House" : "The Senate";
    if (stage === "confirmed")
        return { headline: `${confirmer} confirms ${name} as ${office}.`, facts: { subject: name, stake } };
    if (stage === "rejected")
        return { headline: `${rejecter} rejects ${name} for ${office}.`, facts: { subject: name, stake } };
    if (stage === "returned")
        return { headline: `${name}'s nomination for ${office} is returned to the President unconfirmed.`, facts: { subject: name, stake } };
    return undefined;
}
/**
 * Why a nomination still moving has been overtaken, if it has.
 *
 * The last of the race guards, and the one that holds whatever else let a race
 * through: a chair somebody now sits in, or a nominee who now sits somewhere
 * else, ends the nomination rather than seating a second person on top of the
 * first. It ends as withdrawn and costs nothing, because the President lost no
 * fight: the paperwork is pulled because the question it asked was answered.
 * A confirmed nomination is past the check, because its own confirmation is
 * what seated them.
 */
function overtaken(state, nomination, seated) {
    if (nomination.stage === "confirmed")
        return undefined;
    const nominee = state.people[nomination.nominee];
    if (seated.people.has(nomination.nominee) || nominee?.currentRole !== undefined) {
        return "Withdrawn: the nominee has taken another office.";
    }
    const holder = chairHolder(state, nomination.office);
    if (seated.offices.has(nomination.office) || (holder && holder.base.id !== nomination.nominee)) {
        return "Withdrawn: the chair was filled while the nomination waited.";
    }
    return undefined;
}
/**
 * Every nomination's week, as the stages it moves.
 *
 * A nomination advances only when its stage's clock has actually run out, so
 * the pipeline consumes calendar time rather than turns, and a president who
 * has sent up more names than the floor can take gets exactly what a real one
 * gets: a queue.
 */
function advancesThisWeek(state, day) {
    const advances = [];
    const seated = { people: new Set(), offices: new Set() };
    let standing = 0;
    for (const nomination of selectActiveNominations(state)) {
        const pulled = overtaken(state, nomination, seated);
        if (pulled) {
            advances.push({ id: nomination.id, stage: "withdrawn", day, note: pulled, outcome: "withdrawn" });
            continue;
        }
        if (day - nomination.stageEnteredDay < stageDuration(state, nomination))
            continue;
        const resolution = resolveStage(state, nomination);
        if (resolution.stage === nomination.stage)
            continue;
        advances.push({
            id: nomination.id,
            stage: resolution.stage,
            day,
            note: resolution.note,
            ...(resolution.outcome ? { outcome: resolution.outcome } : {}),
        });
        if (resolution.stage === "confirmed") {
            if (!nomination.transition)
                standing += CONFIRMATION_STANDING_GAIN;
            seated.people.add(nomination.nominee);
            if (leadsInstitution(nomination.office))
                seated.offices.add(nomination.office);
        }
        if (resolution.stage === "rejected")
            standing -= REJECTION_STANDING_COST;
        if (resolution.stage === "returned")
            standing -= RETURNED_STANDING_COST;
    }
    return { advances, standing };
}
function weekSummary(advances) {
    const seated = advances.filter((advance) => advance.stage === "confirmed").length;
    const lost = advances.filter((advance) => advance.stage === "rejected" || advance.stage === "returned").length;
    if (seated > 0 && lost > 0)
        return `The Senate seats ${seated} of the President's nominees and ends ${lost}.`;
    if (seated > 0)
        return `The Senate confirms ${seated} of the President's nominees.`;
    if (lost > 0)
        return `${lost} of the President's nominations end without a seat.`;
    return "Nominations move through the Senate.";
}
/**
 * The nominations this week's movement answers to, deduplicated and ordered
 * so a replay walks the same trail. Only the ones the campaign actually has
 * an opening event for: a name sent up before this field existed names
 * nothing rather than naming something wrong.
 */
function resolvedCausesOf(state, advances) {
    return [
        ...new Set(advances.flatMap((advance) => {
            const caused = selectNomination(state, advance.id)?.causedBy;
            return caused ? [caused] : [];
        })),
    ].sort();
}
export const nominationPhase = (state) => {
    const { advances, standing } = advancesThisWeek(state, campaignDay(state));
    if (advances.length === 0)
        return [];
    const resolvedCauses = resolvedCausesOf(state, advances);
    const wire = advances.flatMap((advance) => {
        const nomination = selectNomination(state, advance.id);
        const line = nomination ? outcomeHeadline(state, nomination, advance.stage, advance.outcome) : undefined;
        return line ? [{ turn: state.turn, kind: "governance", visibility: "public", ...line }] : [];
    });
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            provenance: {
                origin: "institution",
                // Every nomination the Senate finished this week. A confirmation is
                // the end of something the President started, and the trail should be
                // able to walk back to the week they started it.
                ...(resolvedCauses.length > 0 ? { causeIds: resolvedCauses } : {}),
                systems: ["nominations", "congress"],
            },
            narration: { summary: weekSummary(advances) },
            effects: [
                ...advances.map((advance) => ({ kind: "nomination", advance })),
                ...advances.flatMap((advance) => {
                    const nomination = selectNomination(state, advance.id);
                    return nomination ? actingClockEffects(state, nomination, advance.stage, advance.day) : [];
                }),
                // The Senate's answer is news the way the nomination was: the name
                // went up on the wire, and the confirmation or the defeat comes back
                // on it.
                ...(wire.length > 0 ? [{ kind: "feed", items: wire }] : []),
                ...(standing !== 0
                    ? [{ kind: "metric", deltas: { standing: Math.round(standing * 1000) / 1000 } }]
                    : []),
            ],
        },
    ];
};
