import { CABINET_ROLES } from "@admin/world";
import { SCOTUS_SEAT_INSTITUTION_IDS } from "./institution-catalog.js";
import { selectPerson } from "./state.js";
import { createRngStreams } from "./rng.js";
export const JUDICIARY_SEAT_COUNT = 9;
/** The nine seat institutions, in seniority order — index 0 is the Chief Justice's. */
export const JUDICIARY_SEAT_INSTITUTIONS = SCOTUS_SEAT_INSTITUTION_IDS;
const CABINET_ELIGIBLE = new Set(CABINET_ROLES);
function benchScore(runtime) {
    return runtime.base.integrity + runtime.base.competence;
}
/**
 * Whether the dataset generated this person as material for a cabinet chair:
 * the founding bench's one exclusion, kept in one place for the founding seed
 * and the legacy fallback below. A nomination to a seat no longer reads it;
 * the appointment pool asks for a legal career instead.
 */
export function isCabinetEligible(runtime) {
    return runtime.base.eligibleRoles.some((role) => CABINET_ELIGIBLE.has(role));
}
/**
 * The founding nation's own living, non-cabinet-eligible cast, best
 * integrity-and-competence first — the one ranking both the founding seed and
 * the pre-migration fallback below apply, so a save on either side of that
 * line reads the identical nine names for the identical cast.
 */
function rankedCandidates(people, nation) {
    return Object.values(people)
        .filter((runtime) => runtime.alive !== false &&
        runtime.base.nationality === nation &&
        runtime.currentRole === undefined &&
        !isCabinetEligible(runtime))
        .sort((a, b) => {
        const byScore = benchScore(b) - benchScore(a);
        return byScore !== 0 ? byScore : a.base.id.localeCompare(b.base.id);
    })
        .slice(0, JUDICIARY_SEAT_COUNT);
}
/**
 * The bench a save carries from before seats were stored state: the same
 * fresh integrity-and-competence ranking `selectJudiciaryBench` always used to
 * compute, kept only so a pre-migration campaign reads exactly what it always
 * read rather than snapping to an all-vacant bench the day this file changed.
 * See `hasStoredBench` for how a campaign is told apart from one on the
 * current schema.
 */
function legacyDerivedSeats(campaign) {
    const candidates = rankedCandidates(campaign.people, campaign.founding.nation);
    return Array.from({ length: JUDICIARY_SEAT_COUNT }, (_, index) => {
        const runtime = candidates[index];
        return { seat: index + 1, personId: runtime?.base.id, senior: index === 0, vacant: runtime === undefined };
    });
}
/**
 * Whether this campaign has ever seated a justice through the stored seat
 * institutions, rather than one still reading the pre-migration derivation.
 *
 * Presence of the institution keys alone cannot tell the two apart:
 * `foundingInstitutions` stamps a runtime for every catalog entry, seat
 * institutions included, whether or not anybody has ever been confirmed to
 * one — so a campaign that has never run a judicial nomination looks
 * identical on that test to one from before the seats existed. Whether any
 * seat has ever taken a `leader` does not: once one has, the campaign is
 * reading stored occupants for the whole bench, and an unfilled seat among
 * the other eight is a real vacancy rather than a schema this campaign never
 * reached.
 */
function hasStoredBench(campaign) {
    return JUDICIARY_SEAT_INSTITUTIONS.some((id) => campaign.institutions[id]?.leader !== undefined);
}
/**
 * The nine seats as the campaign's own stored record: who a nomination
 * actually seated, unaffected by anyone else's integrity or competence.
 *
 * A seat's occupant is read off its institution's `leader` — the same field a
 * cabinet department's Secretary is read off, written by the same
 * confirmation writer. Nothing here re-ranks the country looking for a better
 * bench: a dead or removed justice's seat reads vacant without anything
 * having to write that back (their id is still the seat's `leader`; they are
 * simply no longer alive to hold it), and nobody is silently promoted into
 * their chair. Only a nomination naming that seat's own office can do that.
 */
function storedSeats(campaign) {
    return JUDICIARY_SEAT_INSTITUTIONS.map((institutionId, index) => {
        const runtime = campaign.institutions[institutionId];
        const leader = runtime?.leader;
        const holder = leader ? selectPerson(campaign, leader) : undefined;
        const vacant = runtime === undefined || runtime.vacancy === true || leader === undefined || !holder || holder.alive === false;
        return { seat: index + 1, personId: vacant ? undefined : leader, senior: index === 0, vacant };
    });
}
function resolvedSeats(campaign) {
    return hasStoredBench(campaign) ? storedSeats(campaign) : legacyDerivedSeats(campaign);
}
/**
 * Nine justices of *this country's* court.
 *
 * Stored state once the campaign has seated at least one of the nine through
 * its own seat institutions — nine specific chairs, each filled or emptied by
 * its own nomination — and a one-time derivation only for a save that never
 * has. See `storedSeats` and `legacyDerivedSeats`.
 */
export function selectJudiciaryBench(campaign) {
    const seats = resolvedSeats(campaign);
    return {
        seats: seats.flatMap((entry) => (entry.personId ? [entry.personId] : [])),
        ...(seats[0]?.personId !== undefined ? { chiefJustice: seats[0].personId } : {}),
    };
}
/** Bench readings for judicial review — empty when no justices are seated. */
export function benchMembersForReview(campaign) {
    return resolvedSeats(campaign).flatMap((entry) => {
        if (!entry.personId)
            return [];
        const runtime = selectPerson(campaign, entry.personId);
        if (!runtime || runtime.alive === false)
            return [];
        return [
            {
                ideology: runtime.base.ideology,
                integrity: runtime.base.integrity,
                competence: runtime.base.competence,
            },
        ];
    });
}
/** Player-facing bench rows — the same nine seats `selectJudiciaryBench` reads. */
export function judiciaryBenchSeats(campaign) {
    return resolvedSeats(campaign).map((entry) => {
        const runtime = entry.personId ? selectPerson(campaign, entry.personId) : undefined;
        return {
            seat: entry.seat,
            personId: entry.vacant ? undefined : entry.personId,
            name: entry.vacant || !runtime ? "Vacant seat" : runtime.base.name,
            senior: entry.senior,
            vacant: entry.vacant,
        };
    });
}
/**
 * The seat institution a numbered seat corresponds to (1 is the Chief
 * Justice's), for a caller that wants to point at the office rather than at
 * whoever currently holds it — the vacant-seat door a president opens to
 * nominate somebody, in particular.
 */
export function judiciarySeatInstitution(seatNumber) {
    return JUDICIARY_SEAT_INSTITUTIONS[seatNumber - 1];
}
/**
 * Seed the bench a founding needs: the same integrity-and-competence
 * derivation `legacyDerivedSeats` still carries for a pre-existing save,
 * computed once against the founding cast and handed back as seat
 * assignments to fold into `campaign.institutions` — before that record
 * exists to read the answer back out of.
 *
 * Exported rather than run internally because founding assembles
 * `campaign.institutions` before there is a `Campaign` this module's own
 * selectors could read; the caller that builds that record is the one that
 * has to call this.
 */
export function foundingJusticeSeats(people, nation) {
    return Object.fromEntries(rankedCandidates(people, nation).map((runtime, index) => [
        JUDICIARY_SEAT_INSTITUTIONS[index],
        runtime.base.id,
    ]));
}
/**
 * The role a founding-seated justice is marked with, so the generic
 * non-cabinet incumbent sweep (`withCareerIncumbents`) recognizes them as
 * already spoken for. Not `AGENCY_HEAD_ROLE`: a justice was never drawn from
 * that bench, and marking one with it would let a later save misread them as
 * a career civil servant if anything ever branched on the role's identity
 * rather than merely on whether it is set.
 */
export const JUDICIARY_SEAT_ROLE = "role-judicial-seat";
/** Explicitly modeled pre-campaign history; no real fictional justice has a sourced commission date. */
export function syntheticJudicialProvenance(seed, institutionId, justiceId, age, foundingYear) {
    const stream = createRngStreams(seed).stream("founding-justice-history", institutionId, justiceId);
    const possibleService = Math.min(35, Math.max(4, age - 35));
    const serviceYears = stream.nextInt(4, possibleService + 1);
    const appointingParty = stream.next() < 2 / 3 ? "republican" : "democrat";
    return { serviceStartYear: foundingYear - serviceYears, appointingParty, synthetic: true };
}
/**
 * Seat the founding bench in both records at once, called before
 * `withCareerIncumbents` so the generic sweep finds these nine seats already
 * filled and leaves them — and the justices now sitting in them — alone,
 * exactly the way it already leaves a cabinet secretary's institution alone.
 * Without this ordering the two mechanisms compete for the same pool of
 * people and the sweep, running first, seats a justice with whoever it
 * reaches first rather than with the founding's own best bench.
 *
 * A no-op (returning the same two references) when `foundingJusticeSeats`
 * finds nobody to seat, which only happens against a cast with fewer than
 * nine non-cabinet-eligible nationals — a fixture, never the real dataset.
 */
export function seatFoundingJustices(people, institutions, nation, seed, foundingYear) {
    const seats = foundingJusticeSeats(people, nation);
    if (Object.keys(seats).length === 0)
        return { people, institutions };
    const seatedPeople = { ...people };
    const seatedInstitutions = { ...institutions };
    for (const [institutionId, justiceId] of Object.entries(seats)) {
        const runtime = seatedInstitutions[institutionId];
        if (!runtime)
            continue;
        const justice = seatedPeople[justiceId];
        const provenance = seed && foundingYear !== undefined && justice
            ? syntheticJudicialProvenance(seed, institutionId, justice.base.id, justice.base.age, foundingYear)
            : undefined;
        seatedInstitutions[institutionId] = {
            ...runtime, leader: justiceId, vacancy: false, vacantDays: 0,
            ...(provenance ? { judicialProvenance: provenance, judicialAssessmentYear: foundingYear } : {}),
        };
        if (justice)
            seatedPeople[justiceId] = { ...justice, currentRole: JUDICIARY_SEAT_ROLE };
    }
    return { people: seatedPeople, institutions: seatedInstitutions };
}
