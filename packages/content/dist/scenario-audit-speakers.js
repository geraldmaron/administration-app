// Who briefs on what. A speaker in a scenario is cast into a department's chair
// at run time, so a week that hands a question to a department that does not
// own it puts the wrong Secretary in the room. This family holds each speaker to
// the department that owns the matter.
//
// Read against the United States charter's ownership table, the one government
// the corpus is written for, and never refused: a beat voiced by the wrong
// department still plays, and the corpus carries hundreds of them (the
// Secretary of the Interior briefing on a library or an orchestra), so an error
// here would fail every batch the writers' room has already shipped. The count
// is the finding; the rewrite is theirs.
import { CHARTER_USA_CONSTITUTION } from "@admin/world";
import { matchRole, scenarioClassDepartments } from "@admin/engine";
import { roleHintTargets } from "./scenario-role-hints.js";
const US_SEATS = CHARTER_USA_CONSTITUTION.cabinetRoles;
function repliedBeat(reply) {
    const speaker = reply.commitment.rejoinder?.speaker;
    return speaker?.kind === "cabinet" ? { where: `reply "${reply.id}" rejoinder`, hint: speaker.roleHint } : undefined;
}
/** Every beat a cabinet chair speaks, in reading order. */
function spokenBeats(def) {
    const opening = def.opening.flatMap((beat, index) => beat.speaker.kind === "cabinet" ? [{ where: `opening beat ${index + 1}`, hint: beat.speaker.roleHint }] : []);
    return [...opening, ...def.replies.flatMap((reply) => repliedBeat(reply) ?? [])];
}
const titleOf = (role) => CHARTER_USA_CONSTITUTION.roleTitles?.[role] ?? role;
/** The first cabinet chair to speak must be the office the scenario says is responsible. */
function auditFirstSpeaker(def, findings) {
    if (!def.responsibleOffice)
        return;
    const owner = matchRole(US_SEATS, roleHintTargets(def.responsibleOffice));
    const first = spokenBeats(def)[0];
    const spoke = first ? matchRole(US_SEATS, roleHintTargets(first.hint)) : undefined;
    if (owner === undefined || spoke === undefined || spoke === owner)
        return;
    findings.push({
        kind: "speaker-not-responsible-office",
        severity: "warning",
        scenario: def.id,
        message: `${first.where} is spoken by the ${titleOf(spoke)} but the memo names the ${titleOf(owner)} as the responsible office. Open on the responsible office, or the letterhead and the room will disagree.`,
    });
}
export function auditSpeakerDepartments(defs, findings) {
    for (const def of defs) {
        auditFirstSpeaker(def, findings);
        const standing = scenarioClassDepartments(CHARTER_USA_CONSTITUTION.id, def.class) ?? [];
        for (const beat of spokenBeats(def)) {
            const role = matchRole(US_SEATS, roleHintTargets(beat.hint));
            if (role === undefined || standing.includes(role))
                continue;
            const room = standing.map(titleOf).join(", ") || "nobody";
            findings.push({
                kind: "speaker-department-mismatch",
                severity: "warning",
                scenario: def.id,
                message: `${beat.where} is spoken by the ${titleOf(role)} ("${beat.hint}"), whose department has no brief in a ${def.class} week. ` +
                    `The ${def.class} room is ${room}: give the line to one of them, or to the narrator.`,
            });
        }
    }
}
/**
 * The kinds this family raises. A batch that asserts zero findings excludes
 * them and counts them instead, the way it treats the grounding family: they
 * are the writers' room's work list, not a reason to refuse a pack.
 */
export const SPEAKER_FINDING_KINDS = new Set(["speaker-department-mismatch", "speaker-not-responsible-office"]);
