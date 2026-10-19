import { backgroundDrivers, roleProfileByRole, schoolById, } from "@admin/world";
import { RECORD_ATTRIBUTE_KEYS } from "./bio.js";
import { ASSESSMENT_LINES, BECAUSE_FRAMES } from "./person-assessment-lines.js";
import { WORLD_PHRASE } from "./person-network-rules.js";
import { attributePositions } from "./bio.js";
import { hashIndex } from "./rng.js";
const ATTRIBUTE_LABEL = {
    competence: "Competence",
    loyalty: "Loyalty",
    integrity: "Integrity",
    charisma: "Charisma",
    ambition: "Ambition",
};
/**
 * Ambition is the one reading whose high side is the president's problem.
 *
 * The engine already believes this everywhere else: the dossier's standing
 * section calls anybody past 0.6 a rival, and a rival faction is where a
 * cabinet challenge comes from. A block that listed high ambition under
 * "strengths" would be telling the player the opposite of what the simulation
 * is about to do to them.
 */
const INVERTED = new Set(["ambition"]);
/**
 * How far from the middle of a seat's own window a reading has to land before
 * it is worth a sentence.
 *
 * Measured rather than guessed, over a full 5,400-person world cast: at 0.15
 * the median official has two readings worth saying something about and 0.7%
 * have none, which is the shape wanted — a page that flags everything flags
 * nothing, and one that flags a single attribute is the block this replaces.
 */
const MARGIN = 0.15;
/** At most two each way, so a file is a judgment rather than a character sheet. */
const PER_SIDE = 2;
// --- The fact behind the reading. -----------------------------------------
const TIER_PHRASE = {
    "global-elite": "the name on the degree",
    "national-flagship": "the flagship university",
    regional: "a provincial university nobody outside it has heard of",
    "service-academy": "the academy",
};
const FIELD_PHRASE = {
    law: "reading law",
    economics: "an economist's training",
    engineering: "an engineer's training",
    "military-science": "reading military science",
    medicine: "a medical training",
    "international-relations": "reading international relations",
    "public-administration": "reading public administration",
    journalism: "a journalist's training",
    theology: "reading theology",
    "natural-sciences": "a scientist's training",
};
/**
 * How long a run in one world reads out loud.
 *
 * A number would be more precise and less true: the record already lays the
 * spans out on the career rail beside this, and repeating "fourteen" in prose
 * adds a digit rather than a fact. What changes a person is whether the world
 * had them for a while or for a life.
 */
function spanPhrase(years) {
    if (years >= 20)
        return "a career in";
    if (years >= 10)
        return "a long run in";
    if (years >= 5)
        return "a spell in";
    return "a short spell in";
}
/**
 * One driver said out loud. Exported so a gate can check that the clause a
 * dossier prints is a fact the person's own record holds, rather than trusting
 * that it is.
 */
export function driverPhrase(driver) {
    switch (driver.kind) {
        case "school":
            return TIER_PHRASE[driver.tier];
        case "field":
            return FIELD_PHRASE[driver.field];
        case "postgraduate":
            return "going back for the second degree";
        case "career":
            return `${spanPhrase(driver.years)} ${WORLD_PHRASE[driver.archetype]}`;
    }
}
/** What a driver is, for the purpose of not citing it twice on one file. */
function driverKey(driver) {
    return driver.kind === "career" ? `career:${driver.archetype}` : driver.kind;
}
/**
 * The largest thing in this life pushing this reading in the direction it
 * actually went, that this file has not already blamed something else on.
 *
 * Signed rather than absolute on purpose: naming the hardest push regardless of
 * direction would let a file say a person's integrity reads low *because of*
 * the decade in medicine that was pulling it the other way.
 *
 * `spent` is what keeps a file from reading as one sentence four times. A
 * career in business is the largest term in three of a governor's five
 * readings, so without it the block prints "a career in business" under
 * charisma, under ambition and under integrity, and a player learns nothing
 * from the second and third. Naming the next-largest honest cause instead says
 * more, and where the record has nothing else pushing that way the block states
 * the reading and stops rather than repeating itself.
 */
function reasonFor(person, attribute, high, spent) {
    const tier = schoolById.get(person.education.school)?.tier;
    return backgroundDrivers(person.education, person.career, tier, attribute).find((driver) => (high ? driver.weight > 0 : driver.weight < 0) && !spent.has(driverKey(driver)));
}
function pick(person, key, bank) {
    return bank[hashIndex(`${person.id}:${key}`, bank.length)];
}
function item(person, attribute, high, spent) {
    const cell = `${attribute}:${high ? "high" : "low"}`;
    // Loyalty gets no background reason, and this is the only attribute that
    // does not. The other four are facts of a life — a decade in medicine, a
    // career in business — and they do not move once the person exists. Loyalty
    // is a number the President moves during play, so blaming today's reading on
    // a career in the civil service tells the player their Secretary was always
    // like this, when what actually moved it was something this administration
    // did last month. Same rule the biography follows: the past is a record.
    const driver = RECORD_ATTRIBUTE_KEYS.includes(attribute)
        ? reasonFor(person, attribute, high, spent)
        : undefined;
    if (driver)
        spent.add(driverKey(driver));
    return {
        attribute,
        label: ATTRIBUTE_LABEL[attribute],
        tone: INVERTED.has(attribute) === high ? "risk" : "strength",
        reading: pick(person, `reading:${cell}`, ASSESSMENT_LINES[cell]),
        because: driver ? pick(person, `because:${attribute}`, BECAUSE_FRAMES).replace("{fact}", driverPhrase(driver)) : "",
    };
}
/**
 * What is unusual about this person for the chair they are being weighed for,
 * and which way it cuts.
 *
 * `role` is passed rather than read off the person because it is the seat being
 * weighed: a candidate is measured against the chair they do not yet hold, and
 * their own eligibility is the honest fallback.
 */
export function personAssessment(person, role) {
    const seat = role ?? person.eligibleRoles[0];
    const ranges = seat === undefined ? undefined : roleProfileByRole.get(seat)?.attributes;
    const positions = attributePositions(person, ranges);
    const ranked = [...positions]
        .map(([attribute, position]) => ({ attribute, position, deviation: Math.abs(position - 0.5) }))
        .sort((a, b) => b.deviation - a.deviation);
    // A person whose whole record sits inside the margin still gets the one
    // sentence their most unusual reading earns. Saying nothing at all about
    // somebody the player is about to seat is the failure mode this block exists
    // to fix, and an empty block reads as a bug rather than as a judgment.
    const notable = ranked.filter((entry) => entry.deviation >= MARGIN);
    const speaking = notable.length > 0 ? notable : ranked.slice(0, 1);
    const strengths = [];
    const risks = [];
    // Walked hardest-reading first, so where two readings share a cause the
    // larger of them gets to name it and the smaller finds its own.
    const spent = new Set();
    for (const entry of speaking) {
        const high = entry.position >= 0.5;
        const side = INVERTED.has(entry.attribute) === high ? risks : strengths;
        if (side.length >= PER_SIDE)
            continue;
        side.push(item(person, entry.attribute, high, spent));
    }
    return { strengths, risks };
}
