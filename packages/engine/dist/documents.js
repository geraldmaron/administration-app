/**
 * Document classification and family — shared game-domain types.
 * Lives in engine (not contracts) so the dependency-direction rule holds:
 * engine may only depend on world.
 *
 * Pruned to the families a reached caller actually stamps: the digest's daily
 * brief, and the decision memo `DecisionBrief.tsx` marks. The wider set this
 * file once declared (cables, sitreps, options papers, bills, court opinions
 * and the rest) had no producer anywhere in the app — seventeen families
 * exercised only by this file's own test — which is the "exported, tested,
 * called by nobody" defect the wave's law calls out by name. A family comes
 * back the day a second document type is actually composed and rendered.
 */
const SEVERITY_CLASSIFICATION = {
    routine: "UNCLASSIFIED",
    serious: "CONFIDENTIAL",
    critical: "SECRET",
};
const SECRET_FAMILIES = new Set(["presidential-daily-brief"]);
const CONFIDENTIAL_FAMILIES = new Set(["presidential-decision-memo"]);
export function classificationForSeverity(severity) {
    return SEVERITY_CLASSIFICATION[severity];
}
export function defaultClassificationForFamily(family) {
    if (SECRET_FAMILIES.has(family))
        return "SECRET";
    if (CONFIDENTIAL_FAMILIES.has(family))
        return "CONFIDENTIAL";
    return "CONFIDENTIAL";
}
/**
 * What a marking asks of the reader.
 *
 * A classification with no handling instruction is a costume: it colors a strip
 * and tells the reader nothing they can act on. Every level carries its own
 * line, so a banner can never be drawn without saying why it is there.
 */
const CLASSIFICATION_HELPER = {
    UNCLASSIFIED: "Public record. Anyone may read this.",
    CONFIDENTIAL: "Share only with those who need to know.",
    SECRET: "This one does not leave the room.",
    "TOP SECRET": "Named readers only. Repeating it is itself a breach.",
};
export function classificationHelper(level) {
    return CLASSIFICATION_HELPER[level];
}
const FAMILY_CAVEATS = {
    "presidential-decision-memo": ["PRE-DECISIONAL", "CLOSE HOLD"],
    "presidential-daily-brief": ["NOFORN", "ORCON"],
};
/**
 * What a document is called on its own cover sheet — the words the reader sees
 * where the family is a code the app uses internally.
 */
const FAMILY_LABEL = {
    "presidential-daily-brief": "Presidential daily brief",
    "presidential-decision-memo": "Decision memorandum",
};
export function documentFamilyLabel(family) {
    return FAMILY_LABEL[family];
}
/**
 * The one derivation of a document's marking.
 *
 * Deriving it here rather than per surface is what stops the inbox and the
 * document it opens from disagreeing about how closely the same paper is held.
 */
export function documentMarking({ family, severity, released }) {
    const base = severity === undefined ? defaultClassificationForFamily(family) : classificationForSeverity(severity);
    const level = released ? "UNCLASSIFIED" : base;
    // A released document has nothing left to caveat: pre-decisional stops being
    // true the moment the decision is made, and there is no foreign-disclosure
    // rule on a thing that has been published.
    const caveats = released ? [] : (FAMILY_CAVEATS[family] ?? []);
    return {
        family,
        level,
        helper: classificationHelper(level),
        caveats,
        line: [level, ...caveats].join(" // "),
    };
}
