import { createRngStreams } from "./rng.js";
import { institutionForRole } from "./institutions.js";
import { timesOverruled } from "./counsel-stance.js";
import { crossesTheAisle, usPartyOfPerson } from "./cast-fit.js";
import { noiseFrom, projectWillingness, stampOf, weigh, willDraw, } from "./willingness.js";
/** Half a year of the record, which is about as long as a slight is held against a President. */
const OVERRULED_MEMORY_TURNS = 26;
/** Five overrulings in half a year is a Secretary who has stopped being asked. */
export const OVERRULED_FULL = 5;
/**
 * Delivery at or above this is a department nobody is asking questions about;
 * forty points under it is one the Secretary is answering for every week.
 */
const EXPOSURE_CLEAR = 0.8;
const EXPOSURE_SPAN = 0.4;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round4 = (value) => Math.round(value * 10000) / 10000 + 0;
/** How badly a chair's department is carrying its work, 0..1. Zero for a chair that runs no department. */
export function departmentExposure(campaign, role) {
    const def = institutionForRole(role);
    const runtime = def ? campaign.institutions[def.id] : undefined;
    if (!runtime)
        return 0;
    return round4(clamp01((EXPOSURE_CLEAR - runtime.implementationQuality) / EXPOSURE_SPAN));
}
export function ministerSituation(campaign, role, person) {
    const president = { party: campaign.founding.leader.party, ideology: campaign.founding.leader.ideology };
    // A President of no party has no side for a Secretary to share or cross.
    const partisanship = president.party === "independent" || usPartyOfPerson(person) === undefined ? 0 : crossesTheAisle(person, president) ? -1 : 1;
    return {
        overruled: timesOverruled(campaign, role, campaign.turn - OVERRULED_MEMORY_TURNS),
        exposure: departmentExposure(campaign, role),
        partisanship,
    };
}
const WEIGHTS = {
    "minister-offer": { disloyalty: 0.5, ambition: -0.2, integrity: 0.2, principled: 0.1, corrupt: -0.1, overruled: 0.4, exposure: 0.4, ownSide: -0.05, otherSide: 0.1 },
    "minister-proposal": { disloyalty: -0.4, ambition: 0.3, integrity: 0, principled: 0, corrupt: 0, overruled: -0.4, exposure: 0.5, ownSide: 0.05, otherSide: -0.05 },
    "minister-break": { disloyalty: 0.6, ambition: 0.3, integrity: 0.1, principled: 0.15, corrupt: 0, overruled: 0.5, exposure: -0.2, ownSide: -0.15, otherSide: 0.1 },
};
/**
 * Where each question tips, and how much the unmodeled rest of a person's week
 * can move it. A proposal's bar is set so a loyal Secretary of a department in
 * trouble clears it; an offer's so a Secretary at the median of a founded
 * cabinet, left alone, never makes one; a break's so a Secretary on their way
 * out goes quietly unless the President has given them a reason to go loudly.
 */
const SETTINGS = {
    "minister-offer": { threshold: 0.5, noiseBound: 0.08 },
    "minister-proposal": { threshold: 0.45, noiseBound: 0.08 },
    "minister-break": { threshold: 0.45, noiseBound: 0.08 },
};
/** A proposal's disloyalty weight is negative: loyalty itself is what brings a Secretary to the President first. */
export function ministerTerms(question, person, situation) {
    const w = WEIGHTS[question];
    const principle = person.traits.includes("principled") ? w.principled : person.traits.includes("corrupt") ? w.corrupt : 0;
    const partisanship = situation.partisanship === 1 ? w.ownSide : situation.partisanship === -1 ? w.otherSide : 0;
    const loyaltyTerm = question === "minister-proposal" ? -w.disloyalty * person.loyalty : w.disloyalty * (1 - person.loyalty);
    return [
        { key: "loyalty", source: "obligation", value: round4(loyaltyTerm) },
        { key: "ambition", source: "interest", value: round4(w.ambition * person.ambition) },
        { key: "integrity", source: "trait", value: round4(w.integrity * person.integrity) },
        { key: "principle", source: "trait", value: principle },
        { key: "times-overruled", source: "situation", value: round4(w.overruled * Math.min(1, situation.overruled / OVERRULED_FULL)) },
        { key: "department-exposure", source: "situation", value: round4(w.exposure * situation.exposure) },
        { key: "co-partisanship", source: "obligation", value: partisanship },
    ];
}
/**
 * The decision, with its one draw.
 *
 * The stream is keyed by the question, the person and the chair, and not by
 * the week: the same Secretary in the same situation gives the same answer
 * every week, and the answer changes only when something about them or their
 * week does.
 */
export function decideMinister(campaign, question, role, person) {
    const settings = SETTINGS[question];
    const draw = willDraw(createRngStreams(campaign.seed), question, person.id, role);
    return weigh(question, ministerTerms(question, person, ministerSituation(campaign, role, person)), {
        ...settings,
        noise: noiseFrom(draw, settings.noiseBound),
    });
}
/** The same question with no draw in it: what a Desk card may say before the Secretary has decided. */
export function projectMinister(campaign, question, role, person) {
    return projectWillingness(question, ministerTerms(question, person, ministerSituation(campaign, role, person)), SETTINGS[question]);
}
/**
 * The reason of record. Public: a Secretary's reasons for offering to go, for
 * asking, or for walking out are the President's to read, and the country's
 * once the Secretary says them out loud.
 */
export function ministerStamp(willingness, person, role) {
    return stampOf(willingness, person, role, "public");
}
