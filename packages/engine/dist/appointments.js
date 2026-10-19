import { selectCabinetHolder, selectPerson } from "./state.js";
import { counselDismissalEffects, projectCounselObstruction } from "./special-counsel.js";
import { departureEffects, factionEffects } from "./cabinet.js";
import { institutionForRole, leaderRoleOf, leadsInstitution, officeInstitution, seatCabinetOffice, } from "./institutions.js";
import { selectActiveNominations } from "./nomination-stages.js";
import { campaignDay } from "./clock.js";
import { orderByFit } from "./cast-fit.js";
// Dismissal is never free — a cabinet reshuffle reads as disarray whoever it
// is — and a minister the public knows costs more to remove than one it does
// not.
const DISMISSAL_STANDING_FLOOR = 0.02;
const DISMISSAL_CHARISMA_WEIGHT = 0.05;
// A minister with this much ambition takes dismissal as the start of something
// rather than the end of it. The floor is cabinet.ts's own challenge floor: the
// same person who would have built a faction in office builds one out of it.
const RESENTMENT_AMBITION_FLOOR = 0.65;
const RESENTFUL_STABILITY_HIT = 0.03;
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/** Everyone the President has a name before the Senate for, by person. */
function pendingNominees(campaign) {
    return new Set(selectActiveNominations(campaign).map((nomination) => nomination.nominee));
}
/** The President as every shortlist reads them: their party, and where their politics sit. */
export function presidentFit(campaign) {
    return { party: campaign.founding.leader.party, ideology: campaign.founding.leader.ideology };
}
/**
 * Who the player could actually seat in a chair right now: their own nationals,
 * alive, eligible for that seat, not already holding another one, not acting
 * in another, and not before the Senate for one — ranked the way the founding
 * shortlist is, by fit to this President rather than by competence alone, so a
 * Treasury bench mid-term leads with the President's own side just as the one
 * on the first morning did.
 *
 * The pool is the campaign's own cast rather than a fresh draw, so the people
 * passed over at founding are exactly the people still available later. A
 * campaign cannot conjure a better candidate by waiting.
 */
export function selectAppointableFor(campaign, role) {
    const pending = pendingNominees(campaign);
    const bench = Object.values(campaign.people).filter((runtime) => runtime.alive &&
        runtime.currentRole === undefined &&
        !pending.has(runtime.base.id) &&
        !actingElsewhere(campaign, runtime.base.id, role) &&
        runtime.base.nationality === campaign.founding.nation &&
        runtime.base.eligibleRoles.some((eligible) => eligible === role));
    return orderByFit(bench.map((runtime) => runtime.base), presidentFit(campaign)).map((fit) => campaign.people[fit.person.id]);
}
/** Whether a chair can be emptied or filled at all — the head of state's cannot. */
function seatRefusal(campaign, role) {
    if (role === campaign.founding.leadRole) {
        return "That chair is yours. A head of government does not appoint or dismiss themselves.";
    }
    if (campaign.player.cabinet[role] === undefined && campaign.founding.cabinet[role] === undefined) {
        return "Your charter seats no such office.";
    }
    return undefined;
}
/** The price of emptying a chair, which `dismissMinister` spends as it stands. */
export function projectDismissal(campaign, role) {
    const refusal = seatRefusal(campaign, role);
    if (refusal)
        return { ok: false, reason: refusal };
    const holder = selectCabinetHolder(campaign, role);
    if (!holder || !holder.alive)
        return { ok: false, reason: "That chair is already empty." };
    const person = holder.base;
    const resentful = person.ambition >= RESENTMENT_AMBITION_FLOOR;
    const obstructs = projectCounselObstruction(campaign, role) !== undefined;
    return {
        ok: true,
        holder,
        resentful,
        cost: {
            standing: round3(-(DISMISSAL_STANDING_FLOOR + person.charisma * DISMISSAL_CHARISMA_WEIGHT)),
            ...(resentful ? { stability: -RESENTFUL_STABILITY_HIT } : {}),
        },
        risks: [
            ...(resentful
                ? [{ id: "dismissal-faction", chance: 1, description: `${person.name} leaves as a rival faction, and the faction adds to the pressure to remove you.` }]
                : []),
            ...(obstructs
                ? [{ id: "dismissal-counsel", chance: 1, description: "The special counsel keeps sitting, and the Senate reads the dismissal as the answer to the inquiry." }]
                : []),
        ],
    };
}
/**
 * Remove the minister holding a chair. The chair is left empty: filling it is a
 * second decision with its own price, so a reshuffle is never a single costless
 * motion.
 */
export function dismissMinister(campaign, role) {
    const projection = projectDismissal(campaign, role);
    if (!projection.ok)
        return projection;
    const person = projection.holder.base;
    const resentful = projection.resentful;
    const counsel = counselDismissalEffects(campaign, role, person.name);
    const effects = [
        // The one writer of what it means to leave a chair alive, shared with the
        // resignation this is the other half of: seat cleared, person kept, and the
        // departure on the record so a former Secretary can be summoned, quoted or
        // cast later.
        ...vacates(campaign, role, "dismissed", person.id),
        ...(resentful ? factionEffects(campaign.turn, role, person.id) : []),
        { kind: "metric", deltas: projection.cost },
        {
            kind: "feed",
            items: [
                {
                    turn: campaign.turn,
                    kind: "press",
                    visibility: "public",
                    headline: resentful
                        ? `${person.name} is dismissed from the cabinet, and does not intend to go quietly.`
                        : `${person.name} is dismissed from the cabinet.`,
                    facts: { subject: person.name },
                },
            ],
        },
        // Emptying one chair reaches oversight the President does not otherwise
        // touch: the Attorney General is the only person who could dismiss a
        // special counsel, so removing them mid-counsel is read as the answer to
        // the inquiry. Nothing here stops the counsel; it is priced, not obeyed.
        ...counsel,
    ];
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary: dismissalSummary(person.name, resentful, counsel.length > 0) },
            effects,
        },
    };
}
function dismissalSummary(name, resentful, massacre) {
    if (massacre) {
        return `${name} is dismissed as Attorney General with a special counsel sitting. The counsel does not stop.`;
    }
    return resentful
        ? `${name} is dismissed, and starts building a following out of office rather than in it.`
        : `${name} is dismissed from the cabinet.`;
}
function pressItem(turn, headline, subject) {
    return { kind: "feed", items: [{ turn, kind: "press", visibility: "public", headline, facts: { subject } }] };
}
/** The cabinet roles somebody alive already holds on the record; one person holds each. */
function heldCabinetRoles(campaign) {
    return new Set(Object.values(campaign.people).flatMap((runtime) => runtime.alive && runtime.currentRole !== undefined && institutionForRole(runtime.currentRole) ? [runtime.currentRole] : []));
}
/**
 * A confirmed officer holds the office on the record: their `currentRole`
 * names the chair, the same as a secretary seated at the founding. The
 * nomination pipeline once seated a confirmed nominee without writing it, and a
 * campaign that confirmed somebody then still holds an officer the rest of the
 * engine reads as unemployed and offers for every other job. Loading derives
 * the missing roles.
 *
 * Only from a confirmation: a nomination the Senate confirmed, for the office
 * a body's leader holds, whose body that same person still leads. An acting
 * officer was never confirmed and a removed one no longer leads, so neither is
 * touched. Nobody whose role is already set is touched either, which keeps the
 * Vice President and the White House staff exactly where the founding put them,
 * and a cabinet role another person already holds on the record is never
 * handed out a second time. Idempotent, so it is safe on every load.
 */
export function deriveConfirmedRoles(campaign) {
    const confirmed = Object.values(campaign.nominations).filter((nomination) => (nomination.stage === "confirmed" || nomination.stage === "sworn-in") && leadsInstitution(nomination.office));
    if (confirmed.length === 0)
        return campaign;
    const held = new Set(heldCabinetRoles(campaign));
    let people = campaign.people;
    for (const nomination of confirmed) {
        const def = officeInstitution(nomination.office);
        const person = people[nomination.nominee];
        if (!def || !person || !person.alive || person.currentRole !== undefined)
            continue;
        if (campaign.institutions[def.id]?.leader !== nomination.nominee)
            continue;
        const role = leaderRoleOf(def);
        if (def.cabinetRole) {
            if (held.has(role) || campaign.player.cabinet[def.cabinetRole] !== nomination.nominee)
                continue;
            held.add(role);
        }
        people = {
            ...people,
            [nomination.nominee]: { ...person, currentRole: role, loyaltyAtAppointment: person.loyaltyAtAppointment ?? person.base.loyalty },
        };
    }
    return people === campaign.people ? campaign : { ...campaign, people };
}
// --- Acting officers ---------------------------------------------------------
/** The body a seat heads and the office that is its top chair, whichever id the seat is given as. */
function actingSeat(seat) {
    const byRole = institutionForRole(seat);
    const def = byRole ?? (leadsInstitution(seat) ? officeInstitution(seat) : undefined);
    const office = def?.offices[0];
    return def && office ? { def, office } : undefined;
}
/** The seat an acting is keyed by: the cabinet role for a department, the office for any other body. */
function actingKey(def, office) {
    return def.cabinetRole ?? office.id;
}
/** Whether this person is already acting somewhere other than this seat. */
function actingElsewhere(campaign, person, key) {
    const entry = Object.entries(campaign.actings ?? {}).find(([seat, holder]) => holder === person && seat !== key);
    return entry?.[0];
}
function actingRefusal(campaign, seat, personId) {
    if (seat === campaign.founding.leadRole)
        return "That chair is yours. A head of government does not act for themselves.";
    const found = actingSeat(seat);
    if (!found)
        return "No such office.";
    const { def, office } = found;
    if (office.actingAuthority === "none" || office.actingAuthority === "board-quorum") {
        return `The law gives ${office.title} no acting officer.`;
    }
    const holder = def.cabinetRole ? selectCabinetHolder(campaign, def.cabinetRole) : undefined;
    const leader = holder?.alive ? holder.base.id : campaign.institutions[def.id]?.leader;
    if (leader !== undefined)
        return `${selectPerson(campaign, leader)?.base.name ?? "Somebody"} holds ${office.title}.`;
    const candidate = selectPerson(campaign, personId);
    if (!candidate)
        return "No such person is in this campaign.";
    const name = candidate.base.name;
    if (!candidate.alive)
        return `${name} is no longer available.`;
    if (candidate.currentRole !== undefined)
        return `${name} already holds another chair.`;
    if (candidate.base.nationality !== campaign.founding.nation)
        return `${name} is not one of your nationals.`;
    if (actingElsewhere(campaign, personId, actingKey(def, office)))
        return `${name} is already acting in another office.`;
    const pending = selectActiveNominations(campaign).find((nomination) => nomination.nominee === personId);
    // A nominee may run the office they were sent up for, which is how most
    // contested chairs are held in practice; a nominee for some other office is
    // spoken for.
    if (pending && pending.office !== office.id)
        return `${name} is before the Senate for another office.`;
    return undefined;
}
/**
 * What seating an acting writes, where the seat can take one: the acting record
 * and the body's own acting authority, together. Two records, one change,
 * because the body's authority is what lapses under the Vacancies Act and the
 * acting record is what every screen asks.
 */
export function actingEffects(campaign, seat, person, fromDay = campaignDay(campaign)) {
    const refusal = actingRefusal(campaign, seat, person);
    if (refusal)
        return { ok: false, reason: refusal };
    const { def, office } = actingSeat(seat);
    const expires = office.actingLimitDays !== undefined ? { actingExpiresDay: fromDay + office.actingLimitDays } : {};
    return {
        ok: true,
        effects: [
            { kind: "acting", seat: actingKey(def, office), person },
            { kind: "institution", institution: def.id, changes: { actingLeader: person, ...expires } },
        ],
    };
}
/**
 * Seat somebody in a role or an office without a confirmation.
 *
 * Every seat on the board used to be either confirmed or empty, which is not
 * how the executive branch runs: a secretary resigns on a Friday, the deputy
 * runs the department on Monday, and the Senate gets to the nomination months
 * later or never. An acting signs for the office and carries none of its
 * mandate, so the office runs worse than it would under a confirmed officer
 * and far better than it does under nobody.
 */
export function appointActing(campaign, seat, person) {
    const seated = actingEffects(campaign, seat, person);
    if (!seated.ok)
        return seated;
    const { def, office } = actingSeat(seat);
    const name = selectPerson(campaign, person).base.name;
    const summary = `${name} is named acting ${office.title}.`;
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", entities: [person, def.id], systems: ["cabinet"] },
            narration: { summary },
            effects: [...seated.effects, pressItem(campaign.turn, summary, name)],
        },
    };
}
/**
 * Who is holding a seat in an acting capacity, if anyone.
 *
 * The body's own authority is the one that lapses, so an acting whose body no
 * longer carries them is nobody's acting any more, whatever the acting record
 * still says.
 */
export function selectActing(campaign, seat) {
    const found = actingSeat(seat);
    if (!found)
        return undefined;
    const person = campaign.actings?.[actingKey(found.def, found.office)];
    if (person === undefined)
        return undefined;
    if (campaign.institutions[found.def.id]?.actingLeader !== person)
        return undefined;
    return campaign.people[person]?.alive ? person : undefined;
}
/**
 * Who is running a chair's department this week: the confirmed Secretary, or
 * failing one the acting. The reading a program, a directive or anything else
 * that needs somebody to sign for a department asks, because an acting signs
 * for the office — that is what the arrangement is for.
 */
export function selectChairRunner(campaign, role) {
    const holder = selectCabinetHolder(campaign, role);
    if (holder?.alive)
        return holder;
    const acting = selectActing(campaign, role);
    return acting ? campaign.people[acting] : undefined;
}
/**
 * Who would act in a chair the moment it empties: the strongest free name on
 * the chair's own bench, the way a department's senior deputy steps up. Never
 * somebody already acting elsewhere, and never the person leaving.
 */
export function deputyFor(campaign, role, leaving) {
    const key = role;
    return selectAppointableFor(campaign, role).find((runtime) => runtime.base.id !== leaving && !actingElsewhere(campaign, runtime.base.id, key))?.base.id;
}
/**
 * Empty a chair the way the executive branch empties one: the departure on the
 * record, and the chair's senior deputy acting from the same day.
 *
 * The one path a chair leaves by, for a resignation, a dismissal, an accepted
 * offer or a public break alike — and the path an authored card that narrates
 * a resignation has to take, so a card cannot say a Secretary walked out while
 * the Secretary stays seated.
 */
export function vacates(campaign, role, departure, person, turn = campaign.turn, fromDay = campaignDay(campaign)) {
    const leaving = departureEffects(departure, role, person, turn);
    // Checked against the chair as it will be once emptied, since that is the
    // chair the acting is seated into.
    const emptied = seatCabinetOffice(campaign, role, undefined);
    const deputy = deputyFor(emptied, role, person);
    const acting = deputy ? actingEffects(emptied, role, deputy, fromDay) : undefined;
    return acting?.ok ? [...leaving, ...acting.effects] : leaving;
}
