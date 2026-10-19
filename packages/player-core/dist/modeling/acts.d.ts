import { type Campaign, type ConditionKind, type DecisionFramingKey, type DirectiveKind, type FindingId, type HillPostId, type InstitutionId, type LobbyApproach, type NominationId, type OfficeId, type PressAction, type ProjectionBuild, type ResignationAnswer, type ScandalResponseVerb } from "@admin/engine";
import type { FactionId, NationId, PersonId, RoleId, StateId } from "@admin/world";
import type { ActConfig, ActOption } from "../act/catalogue";
import { type MarketLeverKey } from "../economy/market-levers";
import { type DeskPick } from "../appointments/desk";
export type ModelingAct = {
    readonly act: "instrument";
    readonly nation: NationId;
    readonly option: ActOption;
    readonly config: ActConfig;
} | {
    readonly act: "lift";
    readonly id: string;
} | {
    readonly act: "stand-down";
    readonly id: string;
} | {
    readonly act: "lobby";
    readonly post: HillPostId;
    readonly approach: LobbyApproach;
} | {
    readonly act: "nominate";
    readonly picks: readonly DeskPick[];
} | {
    readonly act: "acting";
    readonly seat: RoleId | OfficeId;
    readonly person: PersonId;
} | {
    readonly act: "dismiss";
    readonly role: RoleId;
} | {
    readonly act: "take-proposal";
    readonly id: string;
} | {
    readonly act: "answer-resignation";
    readonly id: string;
    readonly answer: ResignationAnswer;
} | {
    readonly act: "reconcile";
    readonly faction: FactionId;
} | {
    readonly act: "lever";
    readonly key: MarketLeverKey;
} | {
    readonly act: "withdraw-nomination";
    readonly id: NominationId;
} | {
    readonly act: "scandal";
    readonly scandal: string;
    readonly verb: ScandalResponseVerb;
} | {
    readonly act: "locale";
    readonly state: StateId;
    readonly cause?: ConditionKind;
    readonly option: string;
} | {
    readonly act: "directive";
    readonly institution: InstitutionId;
    readonly kind: DirectiveKind;
    readonly subject: string;
} | {
    readonly act: "inspector-notice";
    readonly institution: InstitutionId;
    readonly reason: string;
} | {
    readonly act: "committee-notice";
    readonly finding: FindingId;
    readonly statement: string;
} | {
    readonly act: "remove-officer";
    readonly institution: InstitutionId;
    readonly cause?: string;
} | {
    readonly act: "bill-desk";
    readonly bill: string;
    readonly choice: "sign" | "veto";
    readonly objection: string;
} | {
    readonly act: "transmit";
    readonly id: string;
} | {
    readonly act: "press";
    readonly kind: PressAction;
    readonly desk?: string;
} | {
    readonly act: "framing";
    readonly record: string;
    readonly framing: DecisionFramingKey;
} | {
    readonly act: "take-the-hit";
};
/**
 * A veto's message goes into its narration and nowhere else, so a veto not yet
 * written is projected with this line in its place: the paths are the ones the
 * written veto will take.
 */
export declare const VETO_MESSAGE_TO_FOLLOW = "The President's message of objection is to follow.";
/** The packets one act commits on `campaign`, or why the engine refuses it there. */
export declare function buildModelingAct(campaign: Campaign, act: ModelingAct): ProjectionBuild;
