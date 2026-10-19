import { attributePositions } from "@admin/engine";
import { roleProfileByRole } from "@admin/world";
import { attributeVerdict, roleTitle, stanceForRatio } from "../format/figures";
import { attributeConsequence, attributeIsRead, challengeMarkFor } from "./attribute-consequence";
/**
 * Declared as a full record rather than an array of keys so a sixth attribute
 * arriving in the simulation fails to compile here instead of quietly going
 * undrawn on every person surface.
 */
const ATTRIBUTE_LABEL = {
    competence: "Competence",
    loyalty: "Loyalty",
    integrity: "Integrity",
    charisma: "Charisma",
    ambition: "Ambition",
};
const ATTRIBUTE_ORDER = ["competence", "loyalty", "integrity", "charisma", "ambition"];
const PRESSURE_KEYS = new Set(["ambition"]);
/**
 * Two marks for five readings. Keyed by kind rather than by attribute so a
 * sixth reading arriving in the simulation inherits a mark from what it is,
 * and nobody has to invent a glyph for it.
 */
const READING_MARK = {
    graded: "graded",
    pressure: "pressure",
};
/** Above this, the worst reading is the thing a reader should be told first. */
export const WATCH_RISK_FLOOR = 0.6;
/**
 * Which readings can run against the administration at all, and which way.
 *
 * Competence is absent deliberately: a chair who is merely unremarkable at the
 * job is not the thing to lead a row with, and both of the rules this replaces
 * left it out for the same reason.
 */
const WATCHABLE = ["loyalty", "integrity", "charisma", "ambition"];
/** How far a reading runs against the administration. Ambition counts up; the rest count down. */
function riskOf(key, value) {
    return PRESSURE_KEYS.has(key) ? value : 1 - value;
}
// A tenth of the range short of the mark is close enough that a bad month of
// loyalty puts the chair over it, which is the fact worth flagging.
const PRESSURE_NEAR_BAND = 0.1;
/**
 * How ambition reads, as a distance from the mark rather than as a grade.
 *
 * The mark is the only thing ambition means: below it a chair who has lost
 * faith walks out, and past it they stay and build a following. Naming the
 * person's own mark — a charismatic chair's sits lower — says more than any
 * verdict word could, and says it without pretending there is a good half of
 * the range.
 */
function pressureWord(value, mark) {
    if (value >= mark)
        return "Past the danger point";
    if (value >= mark - PRESSURE_NEAR_BAND)
        return "Near the danger point";
    return "Below the danger point";
}
function readingFor(key, person, subject, positions) {
    const value = person[key];
    const pressure = PRESSURE_KEYS.has(key);
    const kind = pressure ? "pressure" : "graded";
    const position = positions?.get(key);
    return {
        key,
        label: ATTRIBUTE_LABEL[key],
        mark: READING_MARK[kind],
        kind,
        value,
        figure: "",
        word: pressure ? pressureWord(value, challengeMarkFor(person.traits)) : attributeVerdict(value),
        ...(pressure ? {} : { stance: stanceForRatio(value) }),
        ...(position === undefined ? {} : { position }),
        consequence: attributeConsequence(key, subject),
    };
}
/**
 * The sentence a row leads with when one reading is far enough out to be the
 * point. A pressure gets its own opening: "watch" is a word for a fault, and
 * ambition is not one.
 */
function watchLine(key, label, consequence) {
    const noun = label.toLowerCase();
    return PRESSURE_KEYS.has(key)
        ? `The trait that matters most here is ${noun}. ${consequence}`
        : `Watch their ${noun}. ${consequence}`;
}
// Only a trait the game reads for this chair: naming one it ignores would tell the President to plan around nothing.
function watchFor(readings, subject) {
    const candidates = readings.filter((reading) => WATCHABLE.includes(reading.key) && attributeIsRead(reading.key, subject));
    let worst;
    let worstRisk = -1;
    for (const reading of candidates) {
        const risk = riskOf(reading.key, reading.value);
        if (risk > worstRisk) {
            worst = reading;
            worstRisk = risk;
        }
    }
    if (!worst || worstRisk <= WATCH_RISK_FLOOR)
        return undefined;
    return {
        key: worst.key,
        label: worst.label,
        kind: worst.kind,
        line: watchLine(worst.key, worst.label, worst.consequence),
    };
}
/**
 * The five readings, the one worth naming first, and the chair they were
 * placed against.
 *
 * `role` is the seat id, not its title: the window a reading is placed in
 * belongs to the seat the person is being read for, and 0.32 loyalty is
 * disqualifying in a chief of staff and unremarkable in an opposition leader
 * because those two chairs recruit from different windows. A seat that authors
 * no window gets no `position` rather than a placement pretending to be one.
 */
export function assessmentProfile(person, options) {
    const subject = options?.subject ?? "cabinet";
    const role = options?.role;
    const window = role === undefined ? undefined : roleProfileByRole.get(role)?.attributes;
    const positions = window ? attributePositions(person, window) : undefined;
    const readings = ATTRIBUTE_ORDER.map((key) => readingFor(key, person, subject, positions));
    const watch = watchFor(readings, subject);
    return {
        readings,
        ...(watch ? { watch } : {}),
        ...(window && role !== undefined ? { seat: roleTitle(role, options?.titles) } : {}),
    };
}
