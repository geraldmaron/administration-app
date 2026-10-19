import { STATE_IDS, WHITE_HOUSE_STAFF_ROLE_IDS, isFaceRef, parseFaceRef, parsePortraitRef } from "@admin/world";
// The transition, in the order it is taken. The order is the argument: who the
// President is, what they did, what they believe, who runs beside them, what
// they promise, who works in the building, who sits at the table, and only
// then the oath. Each stage can be answered from the ones before it, and the
// oath is last because it is the one act that cannot be taken back.
//
// This module holds the order, the one question each stage asks, and — the
// part that matters — which stage owns a given refusal, so a blocked seal can
// send the player to the control that fixes it instead of printing the problem
// beside a pen they cannot use. Pure and free of any renderer on purpose: the
// routing rule is the thing worth testing, and a rule that can only be
// exercised by mounting a screen is a rule nobody exercises.
export { LEADER_READINGS, attributesUnder } from "./leader-attributes";
export const FOUNDING_STAGE_IDS = [
    "person",
    "record",
    "politics",
    "ticket",
    "platform",
    "staff",
    "cabinet",
    "oath",
];
/**
 * The stage order, declared as data.
 *
 * - `person` first because the record needs a name, a face and a home to keep.
 * - `record` second: a career and a route are what the readings are made of.
 * - `politics` third, because the party is chosen outright and the Hill reads
 *   it for the whole term.
 * - `ticket` fourth: a running mate is balanced against everything above, and
 *   the mandate the ticket won by decides the Congress it arrives with.
 * - `platform` fifth: the promises are made on the ticket, before anyone is hired.
 * - `staff` sixth: the President's own hires, who need no Senate.
 * - `cabinet` seventh: the densest stage, and the last thing that moves the
 *   opening position.
 * - `oath` last, alone, because it is the one irreversible act in the game.
 */
export const FOUNDING_STAGE_SPEC = [
    { id: "person", title: "About you", question: "Who is the new President?" },
    { id: "record", title: "Your background", question: "What did you do before the White House?" },
    { id: "politics", title: "Your beliefs", question: "What do you believe, and which party are you in?" },
    { id: "ticket", title: "Your running mate", question: "Who ran with you as Vice President, and how did the country vote?" },
    { id: "platform", title: "Your promises", question: "What do you promise the country?" },
    { id: "staff", title: "The White House", question: "Who are your closest advisers in the White House?" },
    { id: "cabinet", title: "The Cabinet", question: "Who will run the government's departments?" },
    { id: "oath", title: "The oath", question: "Are you ready to take the oath of office?" },
];
export const STAGE_TITLE = Object.fromEntries(FOUNDING_STAGE_SPEC.map((stage) => [stage.id, stage.title]));
/** The one question the stage asks, printed under its title. */
export const STAGE_CLAUSE = Object.fromEntries(FOUNDING_STAGE_SPEC.map((stage) => [stage.id, stage.question]));
const PARTY_CHOICE_LABELS = {
    democrat: "Democratic Party",
    republican: "Republican Party",
    independent: "Independent",
};
/**
 * The ticket an administration runs on, as a name a player can read. An
 * independent presidency is a real answer rather than a blank: it means no
 * party carries the President on the floor.
 */
export function ticketLabel(chosenParty, resolvedPartyName) {
    if (chosenParty !== undefined)
        return PARTY_CHOICE_LABELS[chosenParty] ?? chosenParty;
    return resolvedPartyName ?? "No ticket";
}
/** What running on this ticket means on the floor, in one line. Never a paragraph. */
export function ticketConsequence(ticket) {
    return ticket === PARTY_CHOICE_LABELS.independent
        ? "You don't belong to a party, so no group in Congress has to stand with you. You'll win each vote one member at a time."
        : `From your first week, Congress sees you as part of the ${ticket}.`;
}
export function stageIndex(stage) {
    return FOUNDING_STAGE_IDS.indexOf(stage);
}
export function nextStage(stage) {
    return FOUNDING_STAGE_IDS[stageIndex(stage) + 1];
}
export function previousStage(stage) {
    const index = stageIndex(stage);
    return index > 0 ? FOUNDING_STAGE_IDS[index - 1] : undefined;
}
/** Whether a stated face reads as a face at all, and as the presentation the draft gives. */
function faceHolds(draft) {
    if (draft.portraitRef === undefined)
        return true;
    try {
        const presented = isFaceRef(draft.portraitRef) ? parseFaceRef(draft.portraitRef).presentation : parsePortraitRef(draft.portraitRef).gender;
        return draft.presentation === undefined || presented === draft.presentation;
    }
    catch {
        // An unreadable reference is a face the person stage has to replace.
        return false;
    }
}
/** Whether the face and home a draft states can be used, read off the draft rather than the refusal's prose. */
function identityHolds(draft) {
    const home = draft.homeState === undefined || STATE_IDS.includes(draft.homeState);
    return home && faceHolds(draft);
}
/**
 * Which stage owns the player's own biography when it does not yet compose.
 *
 * Read off the draft rather than off the refusal's prose: `composeLeader`
 * returns one sentence per failure, and matching on its wording would put the
 * jump control on whichever stage the sentence happened to be phrased for. The
 * name, the face and the home state are asked on the person; the career, the
 * route and the age are asked on the record.
 */
export function leaderStageFor(draft) {
    if (draft.name.trim().length === 0 || !identityHolds(draft))
        return "person";
    return "record";
}
const STAFF_SUBJECTS = new Set(WHITE_HOUSE_STAFF_ROLE_IDS);
/**
 * The stage that can actually fix this refusal.
 *
 * Anything the player does not control — the charter, the nation, a legacy
 * field the dataset pins — has no stage of its own, so it belongs to the oath,
 * where it is reported as a standing obstacle rather than as a field to go and
 * correct.
 */
export function stageForRejection(rejection, routing) {
    const subject = rejection.subject;
    if (subject === "leader")
        return routing.leaderStage;
    if (subject === "runningMate" || subject === "mandate")
        return "ticket";
    if (subject === "platform" || subject.startsWith("plank"))
        return "platform";
    if (STAFF_SUBJECTS.has(subject))
        return "staff";
    if (routing.departments.includes(subject))
        return "cabinet";
    return "oath";
}
export function routeRejections(rejections, routing) {
    return rejections.map((rejection) => {
        const stage = stageForRejection(rejection, routing);
        return { rejection, stage, role: stage === "cabinet" || stage === "staff" ? rejection.subject : undefined };
    });
}
/** The stages carrying at least one unresolved refusal, in transition order. */
export function blockedStages(routed) {
    const blocked = new Set(routed.map((entry) => entry.stage));
    return FOUNDING_STAGE_IDS.filter((stage) => blocked.has(stage));
}
/**
 * How a stage reads on the rail. A stage the player has walked past and left
 * in order is settled; one they have walked past and left broken is blocked,
 * wherever they are now, so a President who cannot seal sees which stage is the
 * reason without opening all eight.
 */
export function stageStanding(stage, current, blocked) {
    if (blocked.includes(stage))
        return stage === current ? "current" : "blocked";
    if (stage === current)
        return "current";
    return stageIndex(stage) < stageIndex(current) ? "settled" : "ahead";
}
/** Every refusal, in the order the stages ask for them. */
export function orderRejections(routed) {
    return [...routed].sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage));
}
