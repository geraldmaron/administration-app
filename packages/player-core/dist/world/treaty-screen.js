import { TREATY_TERMS, counterpartPreview, issueRatification, projectRatification, selectDateOfTurn, selectTreaties, signTreaty, treatyForecast, treatyTitle, withdrawTreaty, } from "@admin/engine";
import { organizationById } from "@admin/world";
import { actCell } from "../congress/act-comparison";
import { reasonLines } from "../reasons/reason-lines";
import { charterOf } from "../campaign/founding-options";
import { formatDate } from "../format/figures";
import { engagementReading, warmthWord } from "./engagement";
import { orgMembersOf } from "./org-screen";
import { mustPacket } from "./war-acts";
import { nationNameIn } from "./war-screen";
// A treaty, an executive agreement or a standing compact as a screen reads it:
// the parties, what the instrument is, whether the other government would sign
// it and the Senate would ratify it, and which of the President's acts are
// open. A draft is an instrument not yet signed (`draft:<kind>:<nation>`); a
// compact is one the United States found in force on taking office.
export const DRAFT_PREFIX = "draft:";
const COMPACT_PREFIX = "compact:";
/** The four instruments a President can sign, in the order a chooser lists them. */
export const TREATY_KIND_LABELS = {
    alliance: "Mutual defense",
    trade: "Trade and investment",
    "arms-control": "Arms control",
    "executive-agreement": "Executive agreement",
};
export function draftTreatyId(kind, nation) {
    return `${DRAFT_PREFIX}${kind}:${nation}`;
}
const STATUS_WORDS = {
    signed: "Signed, waiting for the Senate",
    ratified: "In effect, approved by the Senate",
    "in-force-by-signature": "In effect from your signature",
    rejected: "Rejected by the Senate",
    withdrawn: "Withdrawn",
};
function partiesOf(campaign, nations) {
    return nations.map((nation) => ({ nation, name: nationNameIn(campaign, nation), us: nation === campaign.founding.nation }));
}
function setOf(parties) {
    return parties.map((party) => `nation:${party.nation}`).join("|");
}
function effectWords(kind) {
    const { effect } = TREATY_TERMS[kind];
    const step = warmthWord(Math.max(Math.abs(effect.trust), Math.abs(effect.alignment), Math.abs(effect.tension)));
    return `Once in effect, it brings the two countries closer and eases tension by ${step}.`;
}
function senateOf(campaign, record) {
    const projection = projectRatification(campaign, record);
    return {
        likelihood: projection.forecast.likelihood,
        confidence: projection.forecast.confidence,
        basis: projection.forecast.confidenceBasis,
        reasoning: projection.reasoning,
        uncertainty: projection.forecast.uncertainty,
    };
}
function pendingAct(campaign, id) {
    return Object.values(campaign.issuedActs ?? {}).find((act) => act.kind === "treaty" && act.treatyId === id && (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"));
}
function voteWords(record) {
    const vote = record.vote;
    if (!vote)
        return undefined;
    return `${vote.passed ? "Approved" : "Turned down"}. ${vote.yeas} voted yes, and ${vote.required} were needed.`;
}
const RESOLVED_WORDS = {
    signed: "Resolved",
    ratified: "The Senate approved it",
    "in-force-by-signature": "In effect",
    rejected: "The Senate turned it down",
    withdrawn: "Withdrawn",
};
function historyOf(campaign, record, pending) {
    const on = (turn) => formatDate(selectDateOfTurn(campaign, turn));
    return [
        { date: on(record.signedTurn), text: "Signed by the President" },
        ...(pending ? [{ date: formatDate(pending.dueDate), text: "The Senate's vote is due" }] : []),
        ...(record.resolvedTurn !== undefined ? [{ date: on(record.resolvedTurn), text: RESOLVED_WORDS[record.status] }] : []),
    ];
}
function recordReading(campaign, record) {
    const terms = TREATY_TERMS[record.kind];
    const parties = partiesOf(campaign, [campaign.founding.nation, record.counterpart]);
    const pending = pendingAct(campaign, record.id);
    const vote = voteWords(record);
    return {
        id: record.id,
        form: "record",
        title: record.title,
        name: terms.name,
        summary: terms.summary,
        bindsOn: terms.bindsOn,
        status: STATUS_WORDS[record.status],
        statusKey: record.status,
        parties,
        set: setOf(parties),
        counterpart: record.counterpart,
        kind: record.kind,
        effect: effectWords(record.kind),
        signedOn: formatDate(selectDateOfTurn(campaign, record.signedTurn)),
        history: historyOf(campaign, record, pending),
        ...(record.status === "signed" && terms.bindsOn === "ratification" ? { senate: senateOf(campaign, record) } : {}),
        ...(pending ? { before: { date: formatDate(pending.dueDate), dueIn: "The Senate votes on that date." } } : {}),
        ...(vote ? { vote } : {}),
    };
}
function draftReading(campaign, kind, nation) {
    if (!campaign.nations[nation] || nation === campaign.founding.nation)
        return undefined;
    // Once the draft is signed it is that record: the same address then shows the instrument as it stands.
    const live = selectTreaties(campaign).find((record) => record.counterpart === nation && record.kind === kind && (record.status === "signed" || record.status === "ratified" || record.status === "in-force-by-signature"));
    if (live)
        return recordReading(campaign, live);
    const terms = TREATY_TERMS[kind];
    const parties = partiesOf(campaign, [campaign.founding.nation, nation]);
    const forecast = treatyForecast(campaign, nation, kind);
    const preview = counterpartPreview(campaign, nation, kind);
    const hypothetical = { id: draftTreatyId(kind, nation), treaty: `${kind}:${campaign.founding.nation}:${nation}`, title: treatyTitle(campaign, kind, nation), kind, counterpart: nation, signedTurn: campaign.turn, status: "signed" };
    return {
        id: hypothetical.id,
        form: "draft",
        title: hypothetical.title,
        name: terms.name,
        summary: terms.summary,
        bindsOn: terms.bindsOn,
        status: "Not yet signed",
        statusKey: "draft",
        parties,
        set: setOf(parties),
        history: [],
        counterpart: nation,
        kind,
        effect: effectWords(kind),
        ...(forecast && preview ? { signing: { forecast: forecast.forecast, reasons: reasonLines(preview, campaign).slice(0, 2).map((line) => line.text) } } : {}),
        ...(terms.bindsOn === "ratification" ? { senate: senateOf(campaign, hypothetical) } : {}),
    };
}
function compactReading(campaign, org) {
    const body = organizationById.get(org);
    if (!body)
        return undefined;
    const parties = partiesOf(campaign, orgMembersOf(campaign, org));
    return {
        id: `${COMPACT_PREFIX}${org}`,
        form: "compact",
        title: body.name,
        name: body.kind === "defense" ? "A permanent defense alliance" : "A permanent agreement",
        summary: body.history,
        bindsOn: "ratification",
        status: "In effect since before you took office",
        statusKey: "compact",
        parties,
        set: setOf(parties),
        history: [],
    };
}
/** One instrument's screen reading. Undefined for an id that is none of a record, a draft or a compact. */
export function treatyScreenReading(campaign, id) {
    const record = campaign.treaties[id];
    if (record)
        return recordReading(campaign, record);
    if (id.startsWith(COMPACT_PREFIX))
        return compactReading(campaign, id.slice(COMPACT_PREFIX.length));
    if (id.startsWith(DRAFT_PREFIX)) {
        const [kind, nation] = id.slice(DRAFT_PREFIX.length).split(":");
        return kind && nation && kind in TREATY_TERMS ? draftReading(campaign, kind, nation) : undefined;
    }
    return undefined;
}
/** What the President could sign with a government, each kind with whether it would and why, for the chooser on a treaty's screen. */
export function treatyChoices(campaign, nation) {
    return (engagementReading(campaign, nation)?.treaties ?? []).map((option) => ({ kind: option.kind, label: TREATY_KIND_LABELS[option.kind], id: draftTreatyId(option.kind, nation), forecast: option.forecast, reasons: option.reasons }));
}
// --- The acts ---------------------------------------------------------------
const FORECAST_WORDS = { likely: "Likely to sign", close: "Could go either way", unlikely: "Unlikely to sign" };
const FORECAST_STANCE = { likely: "favorable", close: "caution", unlikely: "adverse" };
const ROWS = [
    { key: "happens", label: "What happens" },
    { key: "their", label: "The other government" },
    { key: "senate", label: "The Senate" },
    { key: "cost", label: "What it costs" },
];
function senateCell(reading) {
    if (!reading)
        return actCell("No Senate vote. It takes effect when you sign it.");
    return actCell([`Senate approval is ${reading.likelihood}, with ${reading.confidence} confidence.`, reading.reasoning]);
}
/** The packet signing commits; a refusal reads in the engine's words. */
export function signPacket(campaign, kind, nation) {
    return mustPacket(signTreaty(campaign, charterOf(campaign), kind, nation));
}
/** The packet that sends a signed treaty to the Senate. */
export function ratifyPacket(campaign, id) {
    return mustPacket(issueRatification(campaign, id));
}
/** The packet that takes an instrument back. */
export function withdrawPacket(campaign, id) {
    return mustPacket(withdrawTreaty(campaign, id));
}
/** Signing a draft. */
export function signComparison(campaign, reading) {
    const kind = reading.kind;
    const nation = reading.counterpart;
    const result = signTreaty(campaign, charterOf(campaign), kind, nation);
    const their = reading.signing ? actCell([FORECAST_WORDS[reading.signing.forecast], ...reading.signing.reasons], FORECAST_STANCE[reading.signing.forecast]) : actCell("Unread");
    const head = { id: "sign", label: "Sign the treaty", verb: reading.bindsOn === "signature" ? "Sign the agreement" : "Sign the treaty" };
    const column = result.ok
        ? {
            ...head,
            review: result.packet.narration.summary,
            cells: {
                happens: actCell(reading.bindsOn === "signature" ? "It takes effect the moment you sign it." : "You sign it, and then it waits for the Senate. It doesn't take effect until two thirds of senators approve it."),
                their,
                senate: senateCell(reading.senate),
                cost: actCell(reading.bindsOn === "signature" ? "Your standing abroad rises a little, but Congress resents being left out" : "Your standing abroad rises a little"),
            },
        }
        : { ...head, refusal: result.reason, review: result.reason, cells: { their, senate: senateCell(reading.senate) } };
    return { rows: ROWS, columns: [column] };
}
/** Sending a signed treaty to the Senate. */
export function ratifyComparison(campaign, record) {
    const issued = issueRatification(campaign, record.id);
    const head = { id: "ratify", label: "Send it to the Senate", verb: "Send it to the Senate" };
    const column = issued.ok
        ? {
            ...head,
            review: issued.packet.narration.summary,
            cells: {
                happens: actCell("The Senate holds the treaty until the vote date. Until then, lobbying senators can still change the count."),
                their: actCell("Already signed"),
                senate: senateCell(record.senate),
                cost: actCell("It costs nothing, but a loss in the Senate stays on your record."),
            },
        }
        : { ...head, refusal: issued.reason, review: issued.reason, cells: { senate: senateCell(record.senate) } };
    return { rows: ROWS, columns: [column] };
}
/** Taking an instrument back. */
export function withdrawComparison(campaign, record) {
    const result = withdrawTreaty(campaign, record.id);
    const inForce = record.statusKey === "in-force-by-signature";
    const head = { id: "withdraw", label: "Withdraw it", verb: inForce ? "Cancel the agreement" : "Withdraw it from the Senate" };
    const column = result.ok
        ? {
            ...head,
            review: result.packet.narration.summary,
            cells: {
                happens: actCell(inForce ? "The agreement ends, and the goodwill it built is undone. You don't need anyone's permission." : "The Senate stops considering it before any vote, so it doesn't count as a loss."),
                their: actCell(inForce ? "The other government sees it as backing down" : "The other government is told you've pulled it back", inForce ? "adverse" : "caution"),
                senate: actCell(inForce ? "The Senate isn't involved" : "No vote is taken"),
                cost: actCell(inForce ? "Your standing abroad drops more than it would for pulling back an unapproved treaty" : "Your standing abroad drops a little", "caution"),
            },
        }
        : { ...head, refusal: result.reason, review: result.reason, cells: {} };
    return { rows: ROWS, columns: [column] };
}
