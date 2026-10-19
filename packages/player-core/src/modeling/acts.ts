import {
  answerResignationOffer,
  appointActing,
  dismissMinister,
  reconcileFaction,
  respondToScandal,
  selectScandals,
  takeMinisterProposal,
  withdrawNomination,
  type Campaign,
  type ConditionKind,
  type DecisionFramingKey,
  type DirectiveKind,
  type EffectPacket,
  type FindingId,
  type HillPostId,
  type InstitutionId,
  type LobbyApproach,
  type NominationId,
  type OfficeId,
  type PressAction,
  type ProjectionBuild,
  type ResignationAnswer,
  type ScandalResponseVerb,
} from "@admin/engine";
import type { FactionId, NationId, PersonId, RoleId, StateId } from "@admin/world";
import { buildAct, buildLift, buildStandDown } from "../act/build";
import type { ActConfig, ActOption } from "../act/catalogue";
import { deskPacket, lobbyPacket, transmitPacket } from "../congress/congress-acts";
import { framingPacket, pressActPacket, takeTheHitPacket } from "../press/press-office";
import { marketLeverAct, type MarketLeverKey } from "../economy/market-levers";
import { directivePacket } from "../oversight/directive-composer";
import { removalPacket } from "../oversight/appointments-pipeline";
import { deskPlan, type DeskPick } from "../appointments/desk";
import { committeeNoticePacket, inspectorNoticePacket } from "../oversight/oversight-board";
import { homeActOptions, localeActOptions } from "../world/locale-act-options";

// Every act a choice screen commits, named as data so a worker holding its own
// copy of the campaign can build it there. Each entry calls the function the
// screen's own commit calls, on the copy it is handed: a builder that draws
// from the campaign's seed draws from the copy's, so an uncertain act lands
// differently across the runs and its uncertainty is in the band.

export type ModelingAct =
  | { readonly act: "instrument"; readonly nation: NationId; readonly option: ActOption; readonly config: ActConfig }
  | { readonly act: "lift"; readonly id: string }
  | { readonly act: "stand-down"; readonly id: string }
  | { readonly act: "lobby"; readonly post: HillPostId; readonly approach: LobbyApproach }
  | { readonly act: "nominate"; readonly picks: readonly DeskPick[] }
  | { readonly act: "acting"; readonly seat: RoleId | OfficeId; readonly person: PersonId }
  | { readonly act: "dismiss"; readonly role: RoleId }
  | { readonly act: "take-proposal"; readonly id: string }
  | { readonly act: "answer-resignation"; readonly id: string; readonly answer: ResignationAnswer }
  | { readonly act: "reconcile"; readonly faction: FactionId }
  | { readonly act: "lever"; readonly key: MarketLeverKey }
  | { readonly act: "withdraw-nomination"; readonly id: NominationId }
  | { readonly act: "scandal"; readonly scandal: string; readonly verb: ScandalResponseVerb }
  | { readonly act: "locale"; readonly state: StateId; readonly cause?: ConditionKind; readonly option: string }
  | { readonly act: "directive"; readonly institution: InstitutionId; readonly kind: DirectiveKind; readonly subject: string }
  | { readonly act: "inspector-notice"; readonly institution: InstitutionId; readonly reason: string }
  | { readonly act: "committee-notice"; readonly finding: FindingId; readonly statement: string }
  | { readonly act: "remove-officer"; readonly institution: InstitutionId; readonly cause?: string }
  | { readonly act: "bill-desk"; readonly bill: string; readonly choice: "sign" | "veto"; readonly objection: string }
  | { readonly act: "transmit"; readonly id: string }
  | { readonly act: "press"; readonly kind: PressAction; readonly desk?: string }
  | { readonly act: "framing"; readonly record: string; readonly framing: DecisionFramingKey }
  | { readonly act: "take-the-hit" };

/**
 * A veto's message goes into its narration and nowhere else, so a veto not yet
 * written is projected with this line in its place: the paths are the ones the
 * written veto will take.
 */
export const VETO_MESSAGE_TO_FOLLOW = "The President's message of objection is to follow.";

type Result = { readonly ok: true; readonly packet: EffectPacket } | { readonly ok: false; readonly reason: string };

const one = (result: Result): ProjectionBuild => (result.ok ? { ok: true, packets: [result.packet] } : { ok: false, reason: result.reason });

/** A builder that throws its refusal, as the oversight and Hill packets do, read as a refusal. */
function caught(build: () => readonly EffectPacket[]): ProjectionBuild {
  try {
    return { ok: true, packets: build() };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function localeAct(campaign: Campaign, act: Extract<ModelingAct, { act: "locale" }>): ProjectionBuild {
  const options = act.cause ? localeActOptions(campaign, act.state, act.cause) : homeActOptions(campaign, act.state);
  const option = options.find((entry) => entry.id === act.option);
  return option?.packet ? { ok: true, packets: [option.packet] } : { ok: false, reason: option?.locked ?? "You can't take this action right now." };
}

function scandalAct(campaign: Campaign, act: Extract<ModelingAct, { act: "scandal" }>): ProjectionBuild {
  const scandal = selectScandals(campaign).find((entry) => entry.id === act.scandal);
  return one(respondToScandal(campaign, scandal, act.verb));
}

/** The packets one act commits on `campaign`, or why the engine refuses it there. */
export function buildModelingAct(campaign: Campaign, act: ModelingAct): ProjectionBuild {
  switch (act.act) {
    case "instrument": return one(buildAct(campaign, act.nation, act.option, act.config));
    case "lift": return one(buildLift(campaign, act.id));
    case "stand-down": return one(buildStandDown(campaign, act.id));
    case "lobby": return caught(() => [lobbyPacket(campaign, act.post, act.approach)]);
    case "nominate": return caught(() => deskPlan(campaign, act.picks).packets);
    case "acting": return one(appointActing(campaign, act.seat, act.person));
    case "dismiss": return one(dismissMinister(campaign, act.role));
    case "take-proposal": return one(takeMinisterProposal(campaign, act.id));
    case "answer-resignation": return one(answerResignationOffer(campaign, act.id, act.answer));
    case "reconcile": return one(reconcileFaction(campaign, act.faction));
    case "lever": return one(marketLeverAct(campaign, act.key));
    case "withdraw-nomination": return one(withdrawNomination(campaign, act.id));
    case "scandal": return scandalAct(campaign, act);
    case "locale": return localeAct(campaign, act);
    case "directive": return caught(() => [directivePacket(campaign, act.institution, act.kind, act.subject)]);
    case "inspector-notice": return caught(() => [inspectorNoticePacket(campaign, act.institution, act.reason)]);
    case "committee-notice": return caught(() => [committeeNoticePacket(campaign, act.finding, act.statement)]);
    case "remove-officer": return caught(() => [removalPacket(campaign, act.institution, act.cause)]);
    case "bill-desk": return caught(() => [deskPacket(campaign, act.bill, act.choice, act.choice === "veto" && !act.objection.trim() ? VETO_MESSAGE_TO_FOLLOW : act.objection)]);
    case "transmit": return caught(() => [transmitPacket(campaign, act.id)]);
    case "press": return caught(() => [pressActPacket(campaign, act.kind, act.desk)]);
    case "framing": return caught(() => [framingPacket(campaign, act.record, act.framing)]);
    case "take-the-hit": return caught(() => [takeTheHitPacket(campaign)]);
  }
}
