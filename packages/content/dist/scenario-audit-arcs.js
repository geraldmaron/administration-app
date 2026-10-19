// The arc rules: what a family owes, and what an arc owes the door it opened.
//
// Both ask the same question one level apart — whether a story the player can
// enter has anywhere to go — so they live together rather than beside the
// per-scenario prose rules they were originally filed with.
import { arcLedger } from "./scenario-deeds.js";
/**
 * An arc has exactly one door in, and every later beat has to be behind it.
 *
 * A family pins its country at the opener, so a beat whose family never opens
 * binds to nothing and is unreachable content — the same defect class as a
 * condition nothing can satisfy, one layer up. Two openers is the other half:
 * whichever fires second lands as a beat against the first one's country, so
 * the scenario is dealt about a nation it was not written for.
 *
 * Checked against the corpus as well as the batch, because an arc is normally
 * written across several batches and an opener that shipped last month is a
 * perfectly good door.
 */
export function auditFamilies(defs, installed, findings, installedCloses) {
    const openersHere = new Map();
    for (const def of defs) {
        if (def.family?.role !== "opener")
            continue;
        const seen = openersHere.get(def.family.id) ?? [];
        openersHere.set(def.family.id, [...seen, def.id]);
    }
    const installedOpeners = new Set(installed ?? []);
    for (const [family, ids] of openersHere) {
        if (ids.length > 1) {
            findings.push({
                kind: "family-two-openers",
                severity: "error",
                scenario: ids[1],
                message: `family "${family}" is opened by ${ids.map((id) => `"${id}"`).join(" and ")}. ` +
                    "An arc pins its country at the opener, so the second one is dealt as a beat about the first one's " +
                    "country — write it as a beat, or give it a family of its own.",
            });
        }
    }
    for (const def of defs) {
        const family = def.family;
        if (!family || family.role === "opener")
            continue;
        if (openersHere.has(family.id) || installedOpeners.has(family.id))
            continue;
        findings.push({
            kind: "family-without-opener",
            severity: "error",
            scenario: def.id,
            message: `nothing opens family "${family.id}", so this beat binds to no country and can never be dealt. ` +
                "Ship the opener in the same batch, or point this at a family that is already installed.",
        });
    }
    auditFamilyCloses(defs, installedCloses, findings);
}
/**
 * An arc with a door in and no way out. A family whose opener ships with no
 * `close` member in the batch or the corpus can only end by lapsing, which is
 * the ending nobody chose: the player is shown a story that starts and then
 * quietly stops being mentioned. An error, because the lapse is a floor under
 * a close that was never dealt, not a substitute for one never written.
 */
function auditFamilyCloses(defs, installed, findings) {
    const closes = new Set(installed ?? []);
    for (const def of defs)
        if (def.family?.role === "close")
            closes.add(def.family.id);
    for (const def of defs) {
        const family = def.family;
        if (family?.role !== "opener" || closes.has(family.id))
            continue;
        findings.push({
            kind: "family-without-close",
            severity: "error",
            scenario: def.id,
            message: `family "${family.id}" opens here and nothing closes it, so the arc can only end by lapsing. ` +
                "Ship a close member whose replies say how it ended (held or lost), in this batch or against an installed family.",
        });
    }
}
/**
 * A setter whose branches do not all come back.
 *
 * This is the defect the arc cell introduces, and nothing else catches it.
 * `callback-concentration` counts how many scenarios read one deed;
 * `promised-follow-up-unread` catches a reply that announced a process and got
 * nothing. Neither can see the shape underneath a chain: a three-reply setter
 * whose readers all hang off the *same* reply. Every individual rule passes.
 * The batch reads flags, so `island-pack` and `flag-economy-imbalance` are
 * quiet. And the player who picked either of the other two doors gets no
 * follow-up at all, which is a game that rewards guessing which answer the
 * writer was most interested in.
 *
 * The rule only speaks about scenarios the batch has *already decided to
 * remember*: it fires when at least one of a scenario's reply flags is read and
 * at least one other is read by nobody, batch or corpus. A setter nothing reads
 * yet is not a defect — packs compose, and demanding the reader already exist
 * would make writing the setter first an offense, which is exactly why the
 * inverse of `flag-condition-never-set` is deliberately not a rule.
 *
 * A warning, not an error: writing every branch its own reader multiplies the
 * work, and there are real batches where one branch genuinely deserves the
 * follow-up and the others genuinely end. The finding names the dead branch so
 * that judgment is made deliberately rather than by accident.
 */
export function auditArcBranchCoverage(defs, corpusReads, findings) {
    // The rule reports the lopsided arcs and nothing else, which is the whole of
    // what it is entitled to say. Which arcs those *are* is the ledger's
    // definition — one place decides what a branch is and when it is answered, so
    // `studio corpus arcs` and this warning can never disagree about the same pool.
    for (const arc of arcLedger(defs, corpusReads).lopsided) {
        const { answered, dead } = arc;
        findings.push({
            kind: "arc-branch-unread",
            severity: "warning",
            scenario: arc.scenario,
            message: `${answered.length} of ${answered.length + dead.length} replies get a follow-up: ` +
                `${dead.map((branch) => `"${branch.reply}"`).join(", ")} ` +
                `${dead.length === 1 ? "stamps a deed" : "stamp deeds"} nothing reads, while ` +
                `${answered.map((branch) => `"${branch.reply}"`).join(", ")} ` +
                `${answered.length === 1 ? "is answered" : "are answered"}. A player who took the other door gets ` +
                "no consequence at all, which teaches that one reply was the real one — write the missing reader, " +
                "or let this week end for everybody",
        });
    }
}
