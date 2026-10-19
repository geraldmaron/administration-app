const CLASS_SLUG = {
    tragedy: "Tragedy",
    terror: "Attack",
    unrest: "Unrest",
    disaster: "Disaster",
    "public-health": "Health",
    migration: "Border",
    "foreign-crisis": "Foreign crisis",
    war: "War",
    espionage: "Spying",
    hostage: "Hostage",
    technology: "Tech",
    economy: "Economy",
    scandal: "Scandal",
    justice: "Law",
    institution: "Institution",
    culture: "Culture",
    death: "Death",
    triumph: "Triumph",
};
const SEVERITY_WORD = {
    routine: "ROUTINE",
    serious: "SERIOUS",
    critical: "CRITICAL",
};
/**
 * A kind of week in the words a person would use for it: "a foreign crisis",
 * carrying its own article because it is written into a sentence first and
 * stripped back into a label (`classLabel`) second.
 */
const CLASS_PHRASE = {
    tragedy: "a tragedy",
    terror: "an attack",
    unrest: "unrest in the streets",
    disaster: "a disaster",
    "public-health": "a public health emergency",
    migration: "large numbers of people crossing a border",
    "foreign-crisis": "a foreign crisis",
    war: "a war",
    espionage: "a spying case",
    hostage: "a hostage situation",
    technology: "a technology failure",
    economy: "money and the budget",
    scandal: "a scandal",
    justice: "a question of law",
    institution: "a fight over how the government works",
    culture: "a fight over what the country is",
    death: "a death",
    triumph: "good news",
};
export function classPhrase(kind) {
    return CLASS_PHRASE[kind];
}
export function classLabel(kind) {
    return CLASS_SLUG[kind];
}
export function severityWord(severity) {
    return SEVERITY_WORD[severity];
}
/** The line under a waiting decision: its weight and kind in a plain sentence, the all-caps tag left to the chip. */
export function waitingReason(severity, kind) {
    return `A ${severity} matter about ${CLASS_PHRASE[kind]}, waiting on your answer.`;
}
/** Who is pushing, in the words a briefing would use for them. */
const PRESSURE_SOURCE_LABEL = {
    cabinet: "Cabinet",
    legislature: "Congress",
    street: "Protesters",
    press: "The press",
    military: "The military",
    business: "Business",
    ally: "An ally",
    adversary: "An adversary",
    court: "The courts",
};
export function pressureSourceLabel(source) {
    return PRESSURE_SOURCE_LABEL[source];
}
