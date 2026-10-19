import { selectNation, selectRelationship, selectTreaties, sharesCompact, } from "./state.js";
import { supermajorityOf } from "./congress.js";
import { voteOn } from "./congress-votes.js";
import { headOfGovernmentTitle, nationName, sentenceCase } from "./naming.js";
import { apply } from "./effects.js";
import { addDays, compareDates } from "./clock.js";
import { confidenceFromEvidence, likelihoodFromUnitInterval } from "./assessments.js";
import { counterpartDecision, counterpartRefusal } from "./treaty-counterpart.js";
export const TREATY_TERMS = {
    alliance: {
        kind: "alliance",
        name: "Treaty of Mutual Defense",
        summary: "An armed attack on either party is treated as an attack on both, and consultation is continuous.",
        senateAppeal: -0.05,
        effect: { trust: 0.18, alignment: 0.22, tension: -0.12 },
        minTrust: 0.25,
        bindsOn: "ratification",
    },
    trade: {
        kind: "trade",
        name: "Agreement on Trade and Investment",
        summary: "Tariff schedules bound at their current levels, with an arbitration panel for what the schedules do not cover.",
        senateAppeal: 0.08,
        effect: { trust: 0.1, alignment: 0.1, tension: -0.06 },
        minTrust: -0.1,
        bindsOn: "ratification",
    },
    "arms-control": {
        kind: "arms-control",
        name: "Treaty on the Limitation of Strategic Arms",
        summary: "Ceilings on deployed systems, with inspection rights on both sides and a withdrawal clause neither side expects to use.",
        // The hardest of the three, always, and hardest of all with a government
        // the Senate does not trust — which is the only kind anyone signs one with.
        senateAppeal: -0.14,
        effect: { trust: 0.12, alignment: 0.06, tension: -0.2 },
        minTrust: -0.3,
        bindsOn: "ratification",
    },
    "executive-agreement": {
        kind: "executive-agreement",
        name: "Executive Agreement",
        summary: "Concluded on the President's own authority alone. It binds this administration the moment it is signed, and nothing more permanent than that.",
        effect: { trust: 0.06, alignment: 0.05, tension: -0.04 },
        // The one instrument a government that will not sit down for a treaty will
        // still take: no Senate to fail in front of, and a narrower, revocable
        // promise is a cheaper thing for either side to be seen making.
        minTrust: -0.4,
        bindsOn: "signature",
    },
};
/**
 * The instrument a standing defense compact already is.
 *
 * A mutual-defense body is not a club that has a treaty somewhere near it: NATO
 * *is* the North Atlantic Treaty, and every member is party to the same
 * document. So the id is minted per compact rather than per pair — two members
 * hold one instrument between them, and a surface that counts what is in force
 * counts it once however many capitals are inside it.
 *
 * Distinct from `treatyRecordId` by construction, so an inherited compact can
 * never be confused with something this administration signed.
 */
export function compactTreatyId(org) {
    return `compact:${org}`;
}
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const SENATE_SEATS = 100;
function counterpartName(campaign, counterpart) {
    const nation = selectNation(campaign, counterpart);
    return nation ? nationName(nation.base.identity) : counterpart;
}
export function treatyTitle(campaign, kind, counterpart) {
    return `${TREATY_TERMS[kind].name} with ${counterpartName(campaign, counterpart)}`;
}
// --- The count --------------------------------------------------------------
/**
 * How far a compact the two countries are already in carries a treaty on the
 * floor.
 *
 * Real and worth stating separately from trust: the Senate ratifies an
 * instrument with a government the United States already sits beside in a
 * standing body far more readily than one with a government it does not,
 * whatever the two capitals privately think of each other. It composes with the
 * membership model that is already on the board rather than adding a second one.
 */
const COMPACT_APPEAL = 0.12;
/**
 * Map the whip arithmetic onto a 0..1 reading without printing the count.
 * Crossing two thirds is past "roughly even"; a comfortable surplus climbs
 * toward almost certain; a wide shortfall falls toward remote.
 */
function chanceFromVote(vote) {
    if (vote.passed) {
        return clamp01(0.62 + (vote.yeas - vote.required) / 50);
    }
    return clamp01(0.45 - (vote.required - vote.yeas) / 50);
}
function ratificationForecast(campaign, record, chance) {
    const relationship = selectRelationship(campaign, campaign.founding.nation, record.counterpart);
    const trust = Math.abs(relationship?.trust ?? 0);
    const disposition = Math.abs(campaign.congress.disposition - 0.5);
    const evidence = clamp01(0.32 + disposition * 0.4 + trust * 0.18 + (sharesCompact(campaign, record.counterpart) ? 0.14 : 0));
    const confidence = confidenceFromEvidence(evidence);
    return {
        likelihood: likelihoodFromUnitInterval(chance),
        confidence,
        confidenceBasis: confidence === "high"
            ? "Caucus posture and the relationship with the counterpart give the whip a clear read."
            : confidence === "moderate"
                ? "The whip is working from chamber mood, trust abroad, and what this kind of instrument usually costs."
                : "Little stable evidence about how this Senate answers a two-thirds ask.",
        supporting: sharesCompact(campaign, record.counterpart)
            ? "The two governments already sit in a standing body together, which carries votes the terms alone would not."
            : "How the Senate is disposed toward this administration is the strongest available factor.",
        uncertainty: "Members can still move between the send and the vote, and a missed whip is not a count the office can see in advance.",
        source: "Office of Senate Legislative Affairs",
        asOf: campaign.calendar,
    };
}
/**
 * The whip count before the treaty is sent up. Pure and seed-independent: the
 * engine still uses the exact arithmetic; ordinary play reads likelihood and
 * confidence instead of the yeas.
 */
export function projectRatification(campaign, record) {
    const terms = TREATY_TERMS[record.kind];
    const relationship = selectRelationship(campaign, campaign.founding.nation, record.counterpart);
    const trust = relationship?.trust ?? 0;
    const threat = relationship?.militaryThreat ?? 0;
    const appeal = (terms.senateAppeal ?? 0) +
        trust * 0.25 +
        (sharesCompact(campaign, record.counterpart) ? COMPACT_APPEAL : 0) -
        // Senators do not ratify an instrument with a government their own
        // intelligence briefings describe as a threat, however good the terms are.
        threat * 0.3;
    const vote = voteOn(campaign, {
        chamber: "senate",
        appeal,
        required: supermajorityOf(SENATE_SEATS),
        // Nobody's measure: consent to an instrument with another government is
        // answered on the terms and the counterpart, which is what the appeal above
        // is made of, and both caucuses answer it the same way.
        stance: "neutral",
    });
    const successChance = chanceFromVote(vote);
    return {
        vote,
        wouldRatify: vote.passed,
        successChance,
        forecast: ratificationForecast(campaign, record, successChance),
        reasoning: vote.passed
            ? "Two thirds looks reachable on the present reading of the chamber."
            : "Two thirds is not there on the present reading, and the votes that are missing are not votes about this treaty.",
    };
}
const treatyRecordId = (kind, counterpart, turn) => `treaty:${kind}:${counterpart}:${turn}`;
/**
 * Sign it abroad.
 *
 * Deliberately not gated on whether the Senate would ratify. A president who has
 * negotiated an agreement the Hill will refuse has done something real and
 * consequential, and refusing the signature here would model a presidency that
 * can only ever promise what it can already deliver — which is not this office.
 */
export function signTreaty(campaign, charter, kind, counterpart) {
    if (counterpart === campaign.founding.nation) {
        return { ok: false, reason: "A government does not sign a treaty with itself." };
    }
    if (!selectNation(campaign, counterpart))
        return { ok: false, reason: `No such nation: ${counterpart}.` };
    const relationship = selectRelationship(campaign, campaign.founding.nation, counterpart);
    if (!relationship)
        return { ok: false, reason: `There is no standing relationship with ${counterpart} to write one into.` };
    const terms = TREATY_TERMS[kind];
    if (relationship.trust < terms.minTrust) {
        return {
            ok: false,
            // No raw figure here on purpose. Trust is stored -1..1 and the engine has
            // no business formatting a scale — quoting `-0.51` beside a `0.25` floor
            // told the player nothing, because neither number names the scale it is
            // on. The gate reads `relationship.trust` on the founding-nation-to-
            // counterpart edge: our own government's trust in them, which is always
            // legible to us. Their trust in us is a separate, intel-gated read
            // (`standingToward`'s `theirs`), so the refusal never claims a view we
            // might not have.
            reason: `We do not trust ${counterpartName(campaign, counterpart)} nearly enough yet to send a delegation.`,
        };
    }
    const refusal = counterpartRefusal(campaign, counterpart, kind);
    if (refusal)
        return refusal;
    const live = selectTreaties(campaign).find((record) => record.counterpart === counterpart &&
        record.kind === kind &&
        (record.status === "signed" || record.status === "ratified" || record.status === "in-force-by-signature"));
    if (live)
        return { ok: false, reason: `${live.title} is already ${live.status === "signed" ? "signed and awaiting the Senate" : "in force"}.` };
    const title = treatyTitle(campaign, kind, counterpart);
    const who = headOfGovernmentTitle(campaign.founding.leadRole, charter.roleTitles);
    // The counterpart's yes is the reason of record for the signature, as its no
    // is for a refusal, so the Record can say why it signed.
    const accepted = counterpartDecision(campaign, counterpart, kind);
    const provenance = {
        origin: "decision",
        entities: [campaign.founding.nation, counterpart],
        systems: ["treaties"],
        ...(accepted ? { decision: accepted } : {}),
    };
    if (terms.bindsOn === "signature") {
        const record = {
            id: treatyRecordId(kind, counterpart, campaign.turn),
            treaty: `${kind}:${campaign.founding.nation}:${counterpart}`,
            title,
            kind,
            counterpart,
            signedTurn: campaign.turn,
            status: "in-force-by-signature",
            resolvedTurn: campaign.turn,
        };
        return {
            ok: true,
            record,
            packet: {
                source: "action",
                actor: "player",
                turn: campaign.turn,
                narration: {
                    summary: `${sentenceCase(who)} concludes the ${title} by executive action. It is binding the moment the ink is dry, on this administration and no other.`,
                },
                provenance,
                effects: [
                    { kind: "treaty", set: record },
                    ...inForceEffects(campaign, record),
                    // Smaller than a ratified treaty earns on both counts: the Senate
                    // gave the President nothing to claim credit for, and it resents
                    // having been gone around rather than asked.
                    { kind: "metric", deltas: { standing: EXECUTIVE_AGREEMENT_STANDING_GAIN } },
                    {
                        kind: "congress",
                        set: {
                            ...campaign.congress,
                            disposition: round3(clamp01(campaign.congress.disposition + EXECUTIVE_AGREEMENT_DISPOSITION_FALL)),
                        },
                    },
                ],
            },
        };
    }
    const record = {
        id: treatyRecordId(kind, counterpart, campaign.turn),
        treaty: `${kind}:${campaign.founding.nation}:${counterpart}`,
        title,
        kind,
        counterpart,
        signedTurn: campaign.turn,
        status: "signed",
    };
    return {
        ok: true,
        record,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: {
                summary: `${sentenceCase(who)} signs the ${title}. It binds nobody until two thirds of the Senate says so.`,
            },
            provenance,
            // Signing alone moves nothing but the room's temperature: the instrument
            // itself is written into the relationship at ratification and not before,
            // which is the whole distinction the Senate's role exists to draw.
            effects: [{ kind: "treaty", set: record }, { kind: "metric", deltas: { standing: 0.02 } }],
        },
    };
}
/**
 * How much less an in-force-by-signature instrument earns a president than the
 * ratified kind: the standing gain a chamber that was cut out of the decision
 * grants, and the fall in that chamber's own mood at having been cut out.
 * Named apart from the inline figures elsewhere in this file because these two
 * numbers are the whole of the rule that an executive agreement earns a
 * smaller standing gain and that a Congress gone around resents it — a reader
 * should be able to find them without re-deriving what "smaller" means from
 * the ratification figures.
 */
const EXECUTIVE_AGREEMENT_STANDING_GAIN = 0.03;
const EXECUTIVE_AGREEMENT_DISPOSITION_FALL = -0.02;
/** Undoing a commitment that was already in force costs more than pulling
 *  back one that was only ever a signature awaiting a vote. */
const EXECUTIVE_AGREEMENT_WITHDRAWAL_COST = -0.05;
/** What an in-force instrument does to the relationship it is with, both ways. */
function inForceEffects(campaign, record) {
    const terms = TREATY_TERMS[record.kind];
    const player = campaign.founding.nation;
    const pairs = [
        [player, record.counterpart],
        [record.counterpart, player],
    ];
    return pairs.flatMap(([from, to]) => selectRelationship(campaign, from, to)
        ? [
            {
                kind: "relationship",
                from,
                to,
                deltas: { trust: terms.effect.trust, alignment: terms.effect.alignment, tension: terms.effect.tension },
                addTreaty: record.treaty,
            },
        ]
        : []);
}
/**
 * The inverse of `inForceEffects`, for a signature-bound instrument taken back
 * off the board. A ratified treaty is never withdrawn once it is in force —
 * that is what "the presidencies after this one" means — so only the
 * signature-bound kind needs an unwind at all.
 */
function unwindInForceEffects(campaign, record) {
    const terms = TREATY_TERMS[record.kind];
    const player = campaign.founding.nation;
    const pairs = [
        [player, record.counterpart],
        [record.counterpart, player],
    ];
    return pairs.flatMap(([from, to]) => selectRelationship(campaign, from, to)
        ? [
            {
                kind: "relationship",
                from,
                to,
                deltas: { trust: -terms.effect.trust, alignment: -terms.effect.alignment, tension: -terms.effect.tension },
            },
        ]
        : []);
}
/** Days the Senate holds the instrument after it is sent up. */
const RATIFICATION_DELAY_DAYS = 3;
function pendingTreatyAct(campaign, treatyId) {
    return Object.values(campaign.issuedActs ?? {}).find((act) => act.kind === "treaty" &&
        act.treatyId === treatyId &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"));
}
function treatyActId(treatyId, campaign) {
    return `issued:treaty:${treatyId}:${campaign.turn}:${campaign.calendar.year}-${campaign.calendar.month}-${campaign.calendar.day}`;
}
/**
 * Send it to the Senate. The floor has not voted; Continue brings the count on
 * the due date. Ordinary play freezes likelihood and confidence, not the yeas.
 */
export function issueRatification(campaign, id) {
    const found = campaign.treaties[id];
    if (!found)
        return { ok: false, reason: `No such treaty: ${id}.` };
    if (TREATY_TERMS[found.kind].bindsOn === "signature") {
        return { ok: false, reason: `${found.title} took effect the moment it was signed. There is no Senate vote to send it to.` };
    }
    if (found.status !== "signed")
        return { ok: false, reason: `${found.title} is not awaiting the Senate.` };
    if (pendingTreatyAct(campaign, id)) {
        return { ok: false, reason: `${found.title} is already before the Senate.` };
    }
    const projection = projectRatification(campaign, found);
    const dueDate = addDays(campaign.calendar, RATIFICATION_DELAY_DAYS);
    const act = {
        id: treatyActId(id, campaign),
        kind: "treaty",
        status: "awaiting-response",
        treatyId: id,
        title: found.title,
        issuedTurn: campaign.turn,
        issuedDate: campaign.calendar,
        dueDate,
        chance: projection.successChance,
        forecast: { ...projection.forecast, asOf: campaign.calendar },
    };
    return {
        ok: true,
        projection,
        act,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: {
                summary: `${found.title} goes to the Senate. The floor answers in ${RATIFICATION_DELAY_DAYS} days.`,
            },
            effects: [{ kind: "issuedAct", set: act }],
            provenance: { origin: "decision", systems: ["congress", "treaties"] },
        },
    };
}
function ratificationPacket(campaign, found, projection, who, act) {
    const record = {
        ...found,
        status: projection.wouldRatify ? "ratified" : "rejected",
        vote: projection.vote,
        resolvedTurn: campaign.turn,
    };
    const resolvedAct = act
        ? {
            ...act,
            status: "resolved",
            outcome: {
                landed: projection.wouldRatify,
                account: projection.wouldRatify
                    ? `The Senate ratifies, ${projection.vote.yeas} to ${projection.vote.nays}.`
                    : `The Senate refuses, ${projection.vote.yeas} to ${projection.vote.nays}.`,
            },
        }
        : undefined;
    if (!projection.wouldRatify) {
        return {
            ok: true,
            record,
            packet: {
                source: "action",
                actor: "player",
                turn: campaign.turn,
                narration: {
                    summary: `The Senate refuses to ratify the ${found.title}, ${projection.vote.yeas} to ${projection.vote.nays}, and ${who} is left holding a document with a signature on it and nothing behind it.`,
                },
                effects: [
                    { kind: "treaty", set: record },
                    ...(resolvedAct ? [{ kind: "issuedAct", set: resolvedAct }] : []),
                    // The cost of a failed ratification is paid abroad, where every
                    // government now knows what this administration's word is worth.
                    { kind: "metric", deltas: { standing: -0.05 } },
                ],
                provenance: act
                    ? { origin: "scheduled", causeIds: [act.id], systems: ["congress", "treaties"], effectiveDate: campaign.calendar }
                    : { origin: "decision", systems: ["congress", "treaties"] },
            },
        };
    }
    return {
        ok: true,
        record,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: {
                summary: `The Senate ratifies the ${found.title}, ${projection.vote.yeas} to ${projection.vote.nays}. It is now law and it binds the presidencies after this one.`,
            },
            effects: [
                { kind: "treaty", set: record },
                ...(resolvedAct ? [{ kind: "issuedAct", set: resolvedAct }] : []),
                ...inForceEffects(campaign, record),
                { kind: "metric", deltas: { standing: 0.06 } },
                {
                    kind: "congress",
                    set: {
                        ...campaign.congress,
                        disposition: round3(clamp01(campaign.congress.disposition + 0.02)),
                    },
                },
            ],
            provenance: act
                ? { origin: "scheduled", causeIds: [act.id], systems: ["congress", "treaties"], effectiveDate: campaign.calendar }
                : { origin: "decision", systems: ["congress", "treaties"] },
        },
    };
}
/** Resolve one issued ratification whose due date has arrived. */
export function resolveIssuedTreaty(campaign, id, roleTitles) {
    const act = campaign.issuedActs?.[id];
    if (!act || act.kind !== "treaty")
        return { ok: false, reason: "That instrument is not outstanding before the Senate." };
    if (act.status === "resolved" || act.status === "reported" || act.status === "withdrawn" || act.status === "expired") {
        return { ok: false, reason: "That instrument has already closed." };
    }
    if (compareDates(campaign.calendar, act.dueDate) < 0) {
        return { ok: false, reason: "The Senate has not voted yet." };
    }
    const found = campaign.treaties[act.treatyId];
    if (!found)
        return { ok: false, reason: `No such treaty: ${act.treatyId}.` };
    if (found.status !== "signed") {
        const expired = { ...act, status: "expired" };
        return {
            ok: true,
            record: found,
            packet: {
                source: "simulate",
                actor: "world",
                turn: campaign.turn,
                narration: { summary: `${found.title} is no longer awaiting a vote.` },
                effects: [{ kind: "issuedAct", set: expired }],
            },
        };
    }
    // Live chamber at the due date — a Hill play between send and vote can still
    // move the count. The frozen forecast stays on the act for the record.
    const projection = projectRatification(campaign, found);
    const who = headOfGovernmentTitle(campaign.founding.leadRole, roleTitles);
    return ratificationPacket(campaign, found, projection, who, act);
}
export function dueIssuedTreatyActs(campaign) {
    return Object.values(campaign.issuedActs ?? {})
        .filter((act) => act.kind === "treaty" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress") &&
        compareDates(campaign.calendar, act.dueDate) >= 0)
        .sort((a, b) => a.id.localeCompare(b.id));
}
/** Every treaty still waiting on the Senate floor, whether or not it is due. */
export function outstandingIssuedTreatyActs(campaign) {
    return Object.values(campaign.issuedActs ?? {})
        .filter((act) => act.kind === "treaty" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"))
        .sort((a, b) => compareDates(a.dueDate, b.dueDate) || a.id.localeCompare(b.id));
}
/** Apply every ratification that has come due. */
export function resolveDueTreaties(campaign, roleTitles) {
    const due = dueIssuedTreatyActs(campaign);
    const packets = [];
    let working = campaign;
    for (const act of due) {
        const result = resolveIssuedTreaty(working, act.id, roleTitles);
        if (!result.ok)
            continue;
        packets.push(result.packet);
        working = apply(working, result.packet);
    }
    return { campaign: working, packets };
}
/** Take it back off the table, which a president may do and a Senate may not. */
export function withdrawTreaty(campaign, id) {
    const found = campaign.treaties[id];
    if (!found)
        return { ok: false, reason: `No such treaty: ${id}.` };
    // A treaty still awaiting the Senate has nothing live to unwind — signing
    // alone moved nothing. An in-force-by-signature instrument is the office's
    // one binding commitment a president can undo without anybody's permission,
    // which is the real-world asymmetry a ratified treaty does not share.
    if (found.status !== "signed" && found.status !== "in-force-by-signature") {
        return { ok: false, reason: `${found.title} is not a treaty that can be withdrawn.` };
    }
    const wasInForce = found.status === "in-force-by-signature";
    const record = { ...found, status: "withdrawn", resolvedTurn: campaign.turn };
    const pending = pendingTreatyAct(campaign, id);
    const expired = pending ? { ...pending, status: "withdrawn" } : undefined;
    return {
        ok: true,
        record,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: {
                summary: wasInForce
                    ? `${found.title} is revoked. It was never before the Senate, and undoing it needs nobody's permission either.`
                    : pending
                        ? `The ${found.title} is withdrawn from the Senate before the floor votes, which is the version of this that does not appear in the record as a defeat.`
                        : `The ${found.title} is withdrawn from the Senate before a vote, which is the version of this that does not appear in the record as a defeat.`,
            },
            effects: [
                { kind: "treaty", set: record },
                ...(expired ? [{ kind: "issuedAct", set: expired }] : []),
                ...(wasInForce ? unwindInForceEffects(campaign, found) : []),
                { kind: "metric", deltas: { standing: wasInForce ? EXECUTIVE_AGREEMENT_WITHDRAWAL_COST : -0.02 } },
            ],
        },
    };
}
