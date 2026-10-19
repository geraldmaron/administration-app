import { DEFAULT_LEADER_BACKGROUND, DEFAULT_LEADER_ROUTE, HERITAGE_SKIN_TONES, Person, STATE_IDS, ageBandFor, leaderBackgroundById, leaderRouteById, isFaceRef, parseFaceRef, parsePortraitRef, portraitRef, presidentPartyFromIdeology, schoolsFor, schoolById, seatHeritageMixFor, } from "@admin/world";
import { GOVERNING_STYLES, validLeadershipAnswers, withGoverningStyle } from "./leadership-profile.js";
import { nationName as inProse, possessive } from "./naming.js";
import { partyTicketId, resolveAdministrationParty } from "./party.js";
import { birthplacePool } from "./people.js";
import { birthplacesInState } from "./cast-home.js";
import { hashFraction, hashIndex } from "./rng.js";
/**
 * The draft a founding opens on: the first authored career, taken by the first
 * authored route, at the midpoint of that career's age window, with no politics
 * declared. Everything except the name is a real starting position the player
 * edits — the name is deliberately blank, because a default name is the one
 * field a player would seal without noticing.
 */
export function defaultLeaderDraft() {
    const background = leaderBackgroundById.get(DEFAULT_LEADER_BACKGROUND);
    return {
        name: "",
        age: Math.round((background.ageRange.min + background.ageRange.max) / 2),
        backgroundId: DEFAULT_LEADER_BACKGROUND,
        routeId: DEFAULT_LEADER_ROUTE,
        ideology: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
        // The suggestion the opening sliders make, so the control opens preselected
        // rather than blank. The player is choosing, not confirming a derivation.
        party: resolveAdministrationParty({ economicLeftRight: 0 }),
    };
}
/** The sentinel `portraitRef` a composed leader carries — no facet catalogue entry exists for them. */
export const LEADER_PORTRAIT_REF = "portrait-player-leader";
const clamp01 = (value) => Math.max(0, Math.min(1, value));
// JSON.stringify writes -0 as 0, so a saved campaign would reload as a
// different object than the one written. Same guard people.ts uses.
const round2 = (value) => Math.round(value * 100) / 100 + 0;
/**
 * How far from the center the player's politics sit, 0..1.
 *
 * Conviction is the one thing the ideology sliders are allowed to buy. A leader
 * who holds hard positions reads as harder to move and easier to believe, and
 * pays for it in flexibility — which is the trade a conviction politician
 * actually makes.
 */
export function ideologyConviction(ideology) {
    const axes = [ideology.economicLeftRight, ideology.authLibertarian, ideology.nationalistGlobalist];
    return clamp01(axes.reduce((sum, axis) => sum + Math.abs(axis), 0) / axes.length);
}
const CONVICTION_INTEGRITY = 0.08;
const CONVICTION_CHARISMA = 0.05;
// An ideologue applies the same answer to problems that needed a different one.
const CONVICTION_COMPETENCE = -0.04;
/** Above this, the politics themselves are the disposition people read. */
const CONVICTION_TRAIT_FLOOR = 0.66;
// Years in the job past the start of a background's window. Experience is worth
// something and it is worth less than a career change: capped so that ageing
// into the top of the window is a nudge, not a strategy.
const SENIORITY_COMPETENCE = 0.08;
const SENIORITY_AMBITION = -0.06;
function seniorityOf(age, background) {
    const span = background.ageRange.max - background.ageRange.min;
    if (span <= 0)
        return 0;
    return clamp01((age - background.ageRange.min) / span);
}
/**
 * The five readings the chosen life produces.
 *
 * Exported on its own because the founding screen draws this while the player
 * is still choosing — the preview and the sealed campaign are the same call.
 */
export function deriveLeaderAttributes(draft, background, route) {
    const conviction = ideologyConviction(draft.ideology);
    const seniority = seniorityOf(draft.age, background);
    return {
        competence: round2(clamp01(background.base.competence +
            route.shift.competence +
            conviction * CONVICTION_COMPETENCE +
            seniority * SENIORITY_COMPETENCE)),
        loyalty: round2(clamp01(background.base.loyalty + route.shift.loyalty)),
        ambition: round2(clamp01(background.base.ambition + route.shift.ambition + seniority * SENIORITY_AMBITION)),
        integrity: round2(clamp01(background.base.integrity + route.shift.integrity + conviction * CONVICTION_INTEGRITY)),
        charisma: round2(clamp01(background.base.charisma + route.shift.charisma + conviction * CONVICTION_CHARISMA)),
    };
}
/** The dispositions the life leaves behind — career first, then route, then politics. */
export function deriveLeaderTraits(ideology, background, route) {
    const conviction = ideologyConviction(ideology);
    const candidates = [
        background.anchorTrait,
        route.anchorTrait,
        conviction >= CONVICTION_TRAIT_FLOOR ? "principled" : undefined,
    ];
    // A person carries at most three, and the same trait arriving twice is one
    // trait, not two — a pragmatic career reached by a pragmatic bargain is still
    // just pragmatic.
    return [...new Set(candidates.filter((trait) => trait !== undefined))].slice(0, 3);
}
function composeLeaderBio(background, route, nationName, conviction) {
    // Every template puts the country mid-sentence, where it keeps its article:
    // "carrying the United States' brief", not "carrying United States' brief".
    const named = inProse(nationName);
    const fill = (line) => line.replaceAll("{nation}'s", possessive(named)).replaceAll("{nation}", named);
    const politics = conviction >= CONVICTION_TRAIT_FLOOR
        ? "Holds their positions hard enough that nobody has to guess at them."
        : conviction <= 0.2
            ? "Holds no position hard enough to lose a vote over it."
            : "Reads as convinced without reading as immovable.";
    return `${fill(background.careerLine)} ${fill(route.arrivalLine)} ${politics}`;
}
/** The id a composed leader always carries, so a save has one stable player person. */
export function leaderPersonId(nation) {
    return `PER-${nation}-leader`;
}
/**
 * Compose the player's `Person` from their draft.
 *
 * Returns a refusal rather than throwing when the draft is not yet complete:
 * the founding screen calls this on every keystroke to draw the live preview,
 * and an unnamed leader is a normal intermediate state, not an error.
 */
/**
 * The player's own service record, stated in the vocabulary every other person
 * in the world carries.
 *
 * The player is composed from a life rather than drawn from the pool, so nobody
 * rolled a school or a posting for them — and a President whose dossier read
 * "no service record was filed for this official" was the one person in the
 * game whose career the game could not describe, while the founding screen was
 * selling that career as the choice that shaped them. The background's authored
 * `formation` names the archetype and field; the span is the years between the
 * age that career begins and the age the player says they are now.
 *
 * Deterministic, with no stream of its own: the school is chosen by the
 * background's position in the nation's own catalogue, so the same life in the
 * same country always studied in the same place.
 */
function leaderFormation(background, nation, age, schoolId) {
    const schools = schoolsFor(nation);
    const index = [...background.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % schools.length;
    const startAge = background.formation.startAge;
    // A career post's span is capped at 40 by the schema, and a life cannot run
    // backwards: an age at the floor of the window still leaves a real career.
    const years = Math.min(40, Math.max(1, age - startAge));
    return {
        education: {
            school: schoolId ?? schools[index].id,
            field: background.formation.field,
            postgraduate: background.formation.postgraduate,
        },
        career: [{ archetype: background.formation.archetype, years, startAge }],
    };
}
/**
 * The hometown on the President's own dossier.
 *
 * Drawn from the same list every governor and secretary is drawn from, so the
 * one person in the game whose dossier the player reads most is not the one
 * person it cannot say where they are from. Composed rather than rolled, like
 * the rest of this file: a hash of the name, so the founding screen's live
 * preview and the sealed campaign always agree, and the same name in the same
 * country is always from the same place.
 *
 * Keyed on the name because it is the one thing the player states that is
 * theirs alone. Keyed on the career instead, every prosecutor who ever took
 * the chair would have grown up in the same town.
 */
function leaderBirthplace(nation, name, homeState) {
    // A stated home state narrows the list to that state's own places, keyed on
    // the name exactly as before, so a President from Ohio is from somewhere in
    // Ohio rather than from wherever the whole country's list happened to land.
    const pool = homeState === undefined ? birthplacePool(nation) : birthplacesInState(homeState);
    return pool.length > 0 ? pool[hashIndex(name, pool.length)] : undefined;
}
/**
 * The President's face.
 *
 * A face the player built is used as built: age is not part of a genome, so
 * the portrait ages with the President on its own. A facet reference from an
 * older save keeps everything except its age band, which is the President's
 * own. A presentation with no face is given one, deterministically from the
 * name, out of the same heritage mix every other officeholder is drawn from.
 * Neither stated, the President stays the monogram they have always been.
 */
function leaderPortraitRef(draft, nation, leadRole, name) {
    const ageBand = ageBandFor(draft.age);
    if (draft.portraitRef !== undefined && isFaceRef(draft.portraitRef))
        return draft.portraitRef;
    if (draft.portraitRef !== undefined)
        return portraitRef({ ...parsePortraitRef(draft.portraitRef), ageBand });
    if (draft.presentation === undefined)
        return LEADER_PORTRAIT_REF;
    const mix = seatHeritageMixFor(nation, leadRole, draft.party);
    const total = mix.reduce((sum, entry) => sum + entry.weight, 0);
    let target = hashFraction(`${name}:heritage`) * total;
    const heritage = mix.find((entry) => (target -= entry.weight) <= 0)?.heritage ?? mix[0].heritage;
    const tones = HERITAGE_SKIN_TONES[heritage];
    const facets = {
        heritage,
        gender: draft.presentation,
        ageBand,
        skinTone: tones[hashIndex(`${name}:tone`, tones.length)],
        attire: "business",
        hairStyle: draft.presentation === "masculine" ? "short" : "long",
        hairColor: ageBand === "senior" || ageBand === "elder" ? "graying" : "brown",
        facialHair: "none",
        eyewear: "none",
        variant: 1 + hashIndex(`${name}:face`, 8),
    };
    return portraitRef(facets);
}
/** Why a stated face, home state or presentation cannot be used, in the player's terms. */
function identityRefusal(draft) {
    if (draft.homeState !== undefined && !STATE_IDS.includes(draft.homeState)) {
        return "No such state is on the map. Choose the state you call home.";
    }
    if (draft.portraitRef === undefined)
        return undefined;
    try {
        const presented = isFaceRef(draft.portraitRef) ? parseFaceRef(draft.portraitRef).presentation : parsePortraitRef(draft.portraitRef).gender;
        if (draft.presentation !== undefined && presented !== draft.presentation) {
            return "The face you drew does not match how you said you present. Draw one that does.";
        }
        return undefined;
    }
    catch {
        return "That face no longer reads. Draw it again on the person stage.";
    }
}
export function composeLeader(draft, nation, nationName, leadRole, parties = []) {
    const name = draft.name.trim();
    if (name.length === 0) {
        return { ok: false, reason: "History needs a name to record. Yours is still blank." };
    }
    const background = leaderBackgroundById.get(draft.backgroundId);
    if (!background) {
        return { ok: false, reason: "No such life is on record — choose the career you came from." };
    }
    const route = leaderRouteById.get(draft.routeId);
    if (!route) {
        return { ok: false, reason: "No such route to office is on record — choose how you took the chair." };
    }
    if (draft.age < background.ageRange.min || draft.age > background.ageRange.max) {
        return {
            ok: false,
            reason: `Nobody reaches the chair from ${background.name.toLowerCase()} at ${draft.age}. That career runs from ${background.ageRange.min} to ${background.ageRange.max}.`,
        };
    }
    const refusal = identityRefusal(draft);
    if (refusal)
        return { ok: false, reason: refusal };
    if (draft.schoolId !== undefined && !schoolById.has(draft.schoolId))
        return { ok: false, reason: "Choose an alma mater from the school catalogue." };
    if (draft.governingStyle !== undefined && !GOVERNING_STYLES.includes(draft.governingStyle))
        return { ok: false, reason: "Choose a governing style from the available approaches." };
    if (draft.leadershipAnswers !== undefined && !validLeadershipAnswers(draft.leadershipAnswers))
        return { ok: false, reason: "Answer all 20 leadership questions before using this profile." };
    const conviction = ideologyConviction(draft.ideology);
    const attributes = deriveLeaderAttributes(draft, background, route);
    // The ticket the player chose, not the one their economics implies. Falls
    // back to the ideology suggestion only when the charter authors no such
    // ticket, which is every charter that is not the US constitution.
    const party = parties.find((entry) => entry.id === partyTicketId(draft.party)) ??
        presidentPartyFromIdeology(parties, draft.ideology.economicLeftRight);
    const birthplace = leaderBirthplace(nation, name, draft.homeState);
    const person = Person.parse({
        id: leaderPersonId(nation),
        name,
        nationality: nation,
        portraitRef: leaderPortraitRef(draft, nation, leadRole, name),
        age: draft.age,
        bio: composeLeaderBio(background, route, nationName, conviction),
        ...leaderFormation(background, nation, draft.age, draft.schoolId),
        ideology: {
            economicLeftRight: round2(draft.ideology.economicLeftRight),
            authLibertarian: round2(draft.ideology.authLibertarian),
            nationalistGlobalist: round2(draft.ideology.nationalistGlobalist),
        },
        ...attributes,
        traits: withGoverningStyle(deriveLeaderTraits(draft.ideology, background, route), draft.governingStyle),
        // The player is eligible for their own chair and nothing else: the lead
        // chair cannot be reassigned, and offering the head of government to a
        // ministry shortlist would let them be appointed under themselves.
        eligibleRoles: [leadRole],
        ...(party ? { party: party.id } : {}),
        ...(birthplace ? { birthplace } : {}),
    });
    return { ok: true, person, background, route, conviction };
}
