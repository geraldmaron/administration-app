import type { FoundingRejection, LeaderDraft } from "@admin/engine";
export { LEADER_READINGS, attributesUnder, type LeaderReading } from "./leader-attributes";
export declare const FOUNDING_STAGE_IDS: readonly ["person", "record", "politics", "ticket", "platform", "staff", "cabinet", "oath"];
export type FoundingStageId = (typeof FOUNDING_STAGE_IDS)[number];
export type FoundingStageSpec = {
    readonly id: FoundingStageId;
    /** The stage's name, on the rail and over the stage. */
    readonly title: string;
    /** The one question it asks. One stage, one screen, one question. */
    readonly question: string;
};
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
export declare const FOUNDING_STAGE_SPEC: readonly FoundingStageSpec[];
export declare const STAGE_TITLE: Readonly<Record<FoundingStageId, string>>;
/** The one question the stage asks, printed under its title. */
export declare const STAGE_CLAUSE: Readonly<Record<FoundingStageId, string>>;
/**
 * The ticket an administration runs on, as a name a player can read. An
 * independent presidency is a real answer rather than a blank: it means no
 * party carries the President on the floor.
 */
export declare function ticketLabel(chosenParty: string | undefined, resolvedPartyName: string | undefined): string;
/** What running on this ticket means on the floor, in one line. Never a paragraph. */
export declare function ticketConsequence(ticket: string): string;
export declare function stageIndex(stage: FoundingStageId): number;
export declare function nextStage(stage: FoundingStageId): FoundingStageId | undefined;
export declare function previousStage(stage: FoundingStageId): FoundingStageId | undefined;
/**
 * Which stage owns the player's own biography when it does not yet compose.
 *
 * Read off the draft rather than off the refusal's prose: `composeLeader`
 * returns one sentence per failure, and matching on its wording would put the
 * jump control on whichever stage the sentence happened to be phrased for. The
 * name, the face and the home state are asked on the person; the career, the
 * route and the age are asked on the record.
 */
export declare function leaderStageFor(draft: LeaderDraft): FoundingStageId;
export type RejectionRouting = {
    /** The chairs the player appoints, so a role-id subject can be recognized. */
    readonly departments: readonly string[];
    /** Where a refusal about the player's own biography belongs right now. */
    readonly leaderStage: FoundingStageId;
};
/**
 * The stage that can actually fix this refusal.
 *
 * Anything the player does not control — the charter, the nation, a legacy
 * field the dataset pins — has no stage of its own, so it belongs to the oath,
 * where it is reported as a standing obstacle rather than as a field to go and
 * correct.
 */
export declare function stageForRejection(rejection: FoundingRejection, routing: RejectionRouting): FoundingStageId;
export type RoutedRejection = {
    readonly rejection: FoundingRejection;
    readonly stage: FoundingStageId;
    /** The chair or post this refusal is about, when it is about one. */
    readonly role: string | undefined;
};
export declare function routeRejections(rejections: readonly FoundingRejection[], routing: RejectionRouting): readonly RoutedRejection[];
/** The stages carrying at least one unresolved refusal, in transition order. */
export declare function blockedStages(routed: readonly RoutedRejection[]): readonly FoundingStageId[];
export type StageStanding = "settled" | "current" | "blocked" | "ahead";
/**
 * How a stage reads on the rail. A stage the player has walked past and left
 * in order is settled; one they have walked past and left broken is blocked,
 * wherever they are now, so a President who cannot seal sees which stage is the
 * reason without opening all eight.
 */
export declare function stageStanding(stage: FoundingStageId, current: FoundingStageId, blocked: readonly FoundingStageId[]): StageStanding;
/** Every refusal, in the order the stages ask for them. */
export declare function orderRejections(routed: readonly RoutedRejection[]): readonly RoutedRejection[];
