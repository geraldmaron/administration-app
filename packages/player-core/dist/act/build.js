import { createRngStreams, engagementPacket, imposeTariff, openTariffInvestigation, issueAction, issueForceAuthorization, liftMeasure, RUNG_LEVELS, signTreaty, tradeSector, withdrawInstrumentAct, } from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { formatDate } from "../format/figures";
import { formatMoney } from "../format/money";
import { configUnder } from "./catalogue";
import { engagementReading } from "../world/engagement";
import { holdingCount } from "../world/nation-forces";
import { WILLINGNESS_WORDS, instrumentDraft, instrumentProjection, tariffDraft, timingWords } from "./preview";
/** What a packet takes out of budget authority, as a positive figure. */
export function chargedBy(packet) {
    const spent = packet.effects.reduce((sum, effect) => (effect.kind === "metric" ? sum + (effect.deltas.treasury ?? 0) : sum), 0);
    return Math.max(0, -spent);
}
/** How each instrument's act reads once it is ordered: a warning is delivered, a force is ordered, help is sent. */
const INSTRUMENT_DONE = {
    diplomatic: "delivered",
    economic: "ordered",
    covert: "authorized",
    military: "ordered",
    assistance: "sent",
};
/** What each kind of meeting reads as when the other government takes it, and when it does not. */
const ANSWERS = {
    call: { took: "They took the call", declined: "They didn't take the call" },
    envoy: { took: "They received the envoy", declined: "They turned the envoy away" },
    visit: { took: "They will host the visit", declined: "They declined to host the visit" },
    summit: { took: "They agreed to meet", declined: "They declined to meet" },
    declaration: { took: "They signed on to the declaration", declined: "They declined to sign on" },
};
/** What a treaty reads as once it is signed. */
const TREATY_SIGNED = {
    alliance: "Mutual defense treaty signed",
    trade: "Trade and investment agreement signed",
    "arms-control": "Arms control treaty signed",
    "executive-agreement": "Executive agreement signed",
};
const refused = (reason) => ({ ok: false, reason });
function chargedLine(charged) {
    return { label: "Charged", value: charged > 0 ? formatMoney(charged) : "No money" };
}
function buildInstrument(campaign, nation, option, config) {
    if (option.ref.kind !== "instrument")
        return refused("That is not an instrument rung.");
    const draft = instrumentDraft(campaign, nation, option.ref.instrument, option.ref.rung, config.count, configUnder(option.ref, config));
    const result = issueAction(campaign, draft.request, createRngStreams(campaign.seed));
    if (!result.ok)
        return refused(result.reason);
    const projected = instrumentProjection(campaign, draft);
    const timing = projected.ok ? timingWords(projected.projection) : "";
    const pending = result.pending === true;
    const { instrument, rung } = option.ref;
    const sent = draft.request.force;
    const lines = [
        chargedLine(chargedBy(result.packet)),
        ...(sent ? [{ label: "Sent", value: holdingCount(sent.unitType, sent.count), unitType: sent.unitType }] : []),
        { label: "How hard it pushes", value: `Step ${rung} of ${RUNG_LEVELS.length}` },
        ...(timing ? [{ label: "When", value: timing }] : []),
    ];
    if (!pending && "success" in result)
        lines.push({ label: "Result", value: result.success ? "It worked" : "It didn't work" });
    return { ok: true, packet: result.packet, title: `${result.projection.rungName} ${INSTRUMENT_DONE[instrument]}`, lines, charged: chargedBy(result.packet) };
}
function buildEngagement(campaign, nation, option) {
    if (option.ref.kind !== "engagement")
        return refused("That is not a meeting.");
    const result = engagementPacket(campaign, { actor: campaign.founding.nation, target: nation, kind: option.ref.engagement }, createRngStreams(campaign.seed));
    if (!result.ok)
        return refused(result.reason);
    const kind = option.ref.engagement;
    const forecast = engagementReading(campaign, nation)?.options.find((entry) => entry.kind === kind)?.forecast;
    return {
        ok: true,
        packet: result.packet,
        title: result.received ? `${option.name}: accepted` : `${option.name}: declined`,
        lines: [chargedLine(0), ...(forecast ? [{ label: "Forecast beforehand", value: WILLINGNESS_WORDS[forecast] }] : []), { label: "Their answer", value: result.received ? ANSWERS[kind].took : ANSWERS[kind].declined }],
        ...(result.received ? {} : { outcome: "refused" }),
        charged: 0,
    };
}
function buildInvestigation(campaign, nation, draft) {
    const statute = draft.law.statute;
    if (statute !== "s232" && statute !== "s301" && statute !== "s201")
        return refused(draft.law.reason);
    const result = openTariffInvestigation(campaign, statute, nation, draft.sector.sector);
    if (!result.ok)
        return refused(result.reason);
    return {
        ok: true,
        packet: result.packet,
        title: `${draft.law.name} investigation ordered`,
        lines: [
            chargedLine(0),
            { label: "Law", value: `${draft.law.name} (${draft.law.cite})` },
            ...(result.finding.sector ? [{ label: "Goods", value: tradeSector(result.finding.sector)?.name ?? result.finding.sector }] : []),
            { label: "Finding due", value: formatDate(result.finding.dueDate) },
        ],
        charged: 0,
    };
}
function buildTariff(campaign, nation, option, config) {
    const draft = tariffDraft(campaign, nation, config.sector, config.rate, config.statute);
    if (!draft)
        return refused("Pick goods we buy from them and a whole-number rate above zero. The total tariff can't go over 100%, or the trade law's own limit.");
    if (draft.law.orders === "investigation")
        return buildInvestigation(campaign, nation, draft);
    if (draft.law.orders !== "tariff")
        return refused(draft.law.reason);
    const result = imposeTariff(campaign, draft.law.statute, nation, draft.sector.sector, draft.rate / 100);
    if (!result.ok)
        return refused(result.reason);
    const ends = result.packet.effects.find((effect) => effect.kind === "trade" && effect.measure?.expiresDate);
    const endsOn = ends?.kind === "trade" ? ends.measure?.expiresDate : undefined;
    return {
        ok: true,
        packet: result.packet,
        title: `${option.name} imposed`,
        lines: [
            chargedLine(0),
            { label: "Law", value: `${draft.law.name} (${draft.law.cite})` },
            { label: "Goods", value: tradeSector(draft.sector.sector)?.name ?? draft.sector.sector },
            { label: "Revenue", value: `${formatMoney(result.incidence.revenue)} a year coming in` },
            { label: "Additional rate", value: `${draft.rate}%` },
            { label: "Total rate", value: `${draft.standing + draft.rate}%` },
            ...(endsOn ? [{ label: "Ends", value: formatDate(endsOn) }] : []),
        ],
        charged: 0,
    };
}
function buildAuthorization(campaign, nation) {
    const result = issueForceAuthorization(campaign, nation);
    if (!result.ok)
        return refused(result.reason);
    return { ok: true, packet: result.packet, title: "Request to use force sent to Congress", lines: [chargedLine(0), { label: "Answer due", value: formatDate(result.act.dueDate) }], charged: 0 };
}
/** The packet for a chosen act, or the engine's own refusal in its words. */
export function buildAct(campaign, nation, option, config) {
    switch (option.ref.kind) {
        case "instrument":
            return buildInstrument(campaign, nation, option, config);
        case "engagement":
            return buildEngagement(campaign, nation, option);
        case "tariff":
            return buildTariff(campaign, nation, option, config);
        case "authorization":
            return buildAuthorization(campaign, nation);
        case "treaty":
            return buildTreaty(campaign, nation, option);
    }
}
function buildTreaty(campaign, nation, option) {
    if (option.ref.kind !== "treaty")
        return refused("That is not a treaty.");
    const kind = option.ref.treaty;
    const result = signTreaty(campaign, charterOf(campaign), kind, nation);
    if (!result.ok)
        return refused(result.reason);
    return { ok: true, packet: result.packet, title: TREATY_SIGNED[kind], lines: [chargedLine(0), { label: "Takes effect on", value: result.record.status === "signed" ? "Senate approval" : "Signing" }], charged: 0 };
}
/** Recall a pending operation before it executes. */
export function buildStandDown(campaign, id) {
    const act = campaign.issuedActs?.[id];
    const result = withdrawInstrumentAct(campaign, id);
    if (!result.ok)
        return refused(result.missingCapability);
    const returned = act?.kind === "instrument" ? act.reservedTreasury : 0;
    return { ok: true, packet: result.packet, title: "Operation called off", lines: [{ label: "Returned", value: returned > 0 ? `${formatMoney(returned)} in approved funds` : "No money was set aside" }], charged: 0 };
}
/** Lift a measure the administration imposed. */
export function buildLift(campaign, id) {
    const result = liftMeasure(campaign, id);
    if (!result.ok)
        return refused(result.reason);
    const measure = campaign.trade.measures[id];
    return { ok: true, packet: result.packet, title: "Measure lifted", lines: [{ label: "Charged", value: "No money" }, ...(measure ? [{ label: "In force since", value: formatDate(measure.imposedDate) }] : [])], charged: 0 };
}
