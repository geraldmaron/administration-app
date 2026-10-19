import { answerResignationOffer, appointActing, dismissMinister, reconcileFaction, respondToScandal, selectScandals, takeMinisterProposal, withdrawNomination, } from "@admin/engine";
import { buildAct, buildLift, buildStandDown } from "../act/build";
import { deskPacket, lobbyPacket, transmitPacket } from "../congress/congress-acts";
import { framingPacket, pressActPacket, takeTheHitPacket } from "../press/press-office";
import { marketLeverAct } from "../economy/market-levers";
import { directivePacket } from "../oversight/directive-composer";
import { removalPacket } from "../oversight/appointments-pipeline";
import { deskPlan } from "../appointments/desk";
import { committeeNoticePacket, inspectorNoticePacket } from "../oversight/oversight-board";
import { homeActOptions, localeActOptions } from "../world/locale-act-options";
/**
 * A veto's message goes into its narration and nowhere else, so a veto not yet
 * written is projected with this line in its place: the paths are the ones the
 * written veto will take.
 */
export const VETO_MESSAGE_TO_FOLLOW = "The President's message of objection is to follow.";
const one = (result) => (result.ok ? { ok: true, packets: [result.packet] } : { ok: false, reason: result.reason });
/** A builder that throws its refusal, as the oversight and Hill packets do, read as a refusal. */
function caught(build) {
    try {
        return { ok: true, packets: build() };
    }
    catch (error) {
        return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
}
function localeAct(campaign, act) {
    const options = act.cause ? localeActOptions(campaign, act.state, act.cause) : homeActOptions(campaign, act.state);
    const option = options.find((entry) => entry.id === act.option);
    return option?.packet ? { ok: true, packets: [option.packet] } : { ok: false, reason: option?.locked ?? "You can't take this action right now." };
}
function scandalAct(campaign, act) {
    const scandal = selectScandals(campaign).find((entry) => entry.id === act.scandal);
    return one(respondToScandal(campaign, scandal, act.verb));
}
/** The packets one act commits on `campaign`, or why the engine refuses it there. */
export function buildModelingAct(campaign, act) {
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
