// The world-rules registry: every setting that changes how the simulation runs,
// declared in one table instead of scattered as flags.
//
// The problem this replaces: one boolean with five readers. God mode was a
// single flag that meant omniscience, removal immunity and unrankability all at
// once, so nothing could be sold, suspended, explained or measured
// independently, and a reader added later inherited all three meanings whether
// or not it wanted them. Here each rule is its own entry with its own seam, its
// own declared readers and its own copy, and the only way to read one is
// `ruleValue`.
//
// What this layer promises, and what the seam gate proves:
//
//   One seam per rule. A rule reaches the simulation at exactly one declaration.
//   That is what keeps a projection and the week it projects from disagreeing,
//   and it is what makes a sentence about what a rule holds checkable.
//
//   The engine never reads an entitlement. A rule that is paid for is stored
//   like any other; whether this device has paid is the app shell's question,
//   and the shell answers it by writing a dated suspension through `apply()`
//   like any other act. Nothing here imports a store, a receipt or a platform.
//
//   Status never falls. A campaign that has used a paid option is marked for
//   good. "Challenge" is the opposite: a reading of the settings as they stand
//   now, which disappears the moment they go back to their defaults.
export const RULES = {
    "information.omniscient": {
        id: "information.omniscient",
        kind: "view",
        tier: "paid",
        values: [false, true],
        statuses: ["standard", "sandbox"],
        harder: [false, false],
        seam: "rules.ts#omniscientRead",
        readers: [
            "state-selectors.ts#hasIntelOnRelationship",
            "state-selectors.ts#hasIntelOnNation",
            "npc-turn.ts#feedVisibility",
        ],
        seamClass: "read-only",
        influence: "force",
        readiness: "WR.0 re-key; sold at WR",
        changes: "logged-act",
        switchesOff: [],
        enables: [
            { kind: "reading", id: "relationships-between-third-parties" },
            { kind: "reading", id: "foreign-government-internals" },
            { kind: "reading", id: "covert-activity-nobody-caught" },
        ],
        demotes: [],
        copy: {
            name: "Omniscience",
            holds: "Every government's file and every tie between third parties is legible, whatever your services can reach.",
            costs: "The campaign is marked Sandbox and is never ranked. Nothing is written: this changes what you are shown and nothing the world holds.",
            locked: "Part of the God mode DLC in the Steam desktop build.",
        },
        entitlement: "god-mode",
    },
    "removal.immune": {
        id: "removal.immune",
        kind: "rule",
        tier: "paid",
        values: [false, true],
        statuses: ["standard", "sandbox"],
        harder: [false, false],
        seam: "removal.ts#advanceRemovalArc",
        readers: [],
        seamClass: "removal-arc",
        influence: "force",
        readiness: "WR.0 re-key; sold at WR",
        changes: "logged-act",
        switchesOff: [{ kind: "ending", id: "removal" }],
        enables: [],
        demotes: [],
        copy: {
            name: "Removal immunity",
            holds: "The removal arc stops one beat short of the end. Pressure still computes and every earlier beat still fires.",
            costs: "The campaign is marked Sandbox and is never ranked, and the removal ending can no longer happen to it.",
            locked: "Part of the God mode DLC in the Steam desktop build.",
        },
        entitlement: "god-mode",
    },
};
export const RULE_IDS = Object.keys(RULES);
/**
 * A lookup that admits a stored id this build does not know. Every read of a
 * loaded save needs one: ids are never reused and never refused, so a save
 * written by a later build can carry a key that is not in the table.
 */
function definitionOf(id) {
    return RULES[id];
}
/** The day a change is dated, wherever the member happens to carry it. */
export function ruleChangeDate(change) {
    return change.kind === "suspend" ? change.since : change.date;
}
// --- Reports -----------------------------------------------------------------
// A stored value this build cannot honor is a fact the player deserves told
// once, not a crash and not silence: a save is never refused over a rule. The
// engine does no I/O, so a report is collected here and the shell reads it.
const reports = [];
const reported = new Set();
function report(message) {
    if (reported.has(message))
        return;
    reported.add(message);
    reports.push(message);
}
/** Everything a read has had to fall back on, each said once. */
export function ruleReports() {
    return [...reports];
}
/** Between campaigns — a fresh session reports afresh. */
export function clearRuleReports() {
    reports.length = 0;
    reported.clear();
}
// --- Reading -----------------------------------------------------------------
/**
 * What this campaign runs under for one rule, and the only way to ask.
 *
 * A paid rule reads its normal value while the campaign is suspended, and the
 * stored value is left alone — resuming restores it rather than re-deciding it.
 */
export function ruleValue(campaign, id) {
    const def = RULES[id];
    const normal = def.values[0];
    if (normal === undefined)
        throw new Error(`rule "${id}" declares no values, so it has no normal reading`);
    reportStrays(campaign);
    if (def.retired) {
        report(`rule "${id}" is retired; it reads as its normal value`);
        return normal;
    }
    if (def.tier === "paid" && campaign.rules?.suspended)
        return normal;
    const stored = campaign.rules?.values?.[id];
    // Both paid rules are boolean-valued, which is what makes the marker readable
    // as one of their values at all; the paired test holds that.
    if (stored === undefined)
        return handEntered(campaign, def) ?? normal;
    if (!def.values.includes(stored)) {
        report(`rule "${id}" holds the value ${JSON.stringify(stored)}, which this build does not offer; it reads as its normal value`);
        return normal;
    }
    return stored;
}
/**
 * What a campaign entered by hand already means, for a campaign the rules layer
 * has never written to.
 *
 * Every god-mode builder turns the marker on, not just the one that announces
 * itself: amending a single nation's record sets it the same way entering
 * deliberately does. Both paid rules used to be read straight off that marker,
 * so a campaign amended by hand was omniscient and immune without ever naming a
 * rule. Reading the marker here keeps that exactly true while the values stay
 * unwritten, which is the same equivalence a legacy save is normalized with, at
 * the same condition: once anything has written a value the stored value and a
 * suspension govern instead, and this never speaks again.
 */
function handEntered(campaign, def) {
    if (def.tier !== "paid" || campaign.rules !== undefined)
        return undefined;
    return campaign.godMode?.enabled === true ? true : undefined;
}
/** Stored ids this build no longer knows. Reported, never refused, never read. */
function reportStrays(campaign) {
    const stored = campaign.rules?.values;
    if (!stored)
        return;
    for (const id of Object.keys(stored)) {
        if (!definitionOf(id))
            report(`rule "${id}" is not a rule this build knows; it is kept and ignored`);
    }
}
/**
 * Whether this campaign sees everything — the one gate omniscience passes
 * through, so the three places a hidden thing can become legible cannot drift
 * apart from each other.
 */
export function omniscientRead(campaign) {
    return ruleValue(campaign, "information.omniscient");
}
const ORDER = ["standard", "story", "sandbox"];
function highest(a, b) {
    return ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a;
}
/**
 * What this campaign counts as, and whether it currently reads as a Challenge.
 *
 * The stored half is a high-water mark taken over the log, not over the current
 * values: a paid option used once and set back is still a Sandbox campaign. The
 * `godMode` flag survives as the marker of the same thing, so a campaign an
 * editor touched before this layer existed still reads Sandbox.
 */
export function campaignStatus(campaign) {
    let status = campaign.godMode?.enabled === true ? "sandbox" : "standard";
    for (const change of campaign.rules?.log ?? []) {
        if (change.kind !== "set")
            continue;
        const def = definitionOf(change.rule);
        if (!def)
            continue;
        const at = def.values.indexOf(change.value);
        if (at < 0)
            continue;
        status = highest(status, def.statuses[at] ?? "standard");
    }
    return { status, challenge: readsAsChallenge(campaign) };
}
/**
 * Whether a set of stored values reads as a Challenge: at least one free option
 * currently sitting on a value its own author marked harder than the default.
 *
 * Takes the definitions rather than reading the registry so the reading can be
 * exercised before any free option is registered — the label has to be right the
 * first time one is, and a rule nothing can test yet is a rule nothing holds.
 */
export function challengeReading(defs, values) {
    return defs.some((def) => {
        const current = values[def.id];
        if (def.tier !== "free" || current === undefined)
            return false;
        const at = def.values.indexOf(current);
        return at > 0 && def.harder[at] === true;
    });
}
function readsAsChallenge(campaign) {
    return challengeReading(RULE_IDS.map((id) => RULES[id]), campaign.rules?.values ?? {});
}
