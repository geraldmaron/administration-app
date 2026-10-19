import { settleScenarioAccounting } from "./scenario-accounting.js";
import { temporaryImportSuspension } from "./trade-effects.js";
import { issueAction } from "./instrument-issued.js";
import { worldDataset } from "@admin/world";
import { signOrder } from "./orders.js";
import { takeLocaleAct } from "./locale-acts.js";
import { billTextAction, collectionAction, directiveAction, judicialNominationAction, localeProjection, orderRescissionAction, orderReviewAction, quotedPositionCost, reliefProjection, tariffAction, tariffLiftAction, transmissionAction } from "./conversation-report-actions.js";
import { selectRelationship, } from "./state.js";
import { resolveSpeaker } from "./conversation-speaker.js";
import { decisionProvenance, stampedDecision } from "./conversation-provenance.js";
import { conflictMoveEffects } from "./conversation-conflict.js";
import { roomCounselOnReply } from "./counsel.js";
import { projectPositionExposure } from "./position-exposure.js";
import { chargedQuote } from "./charged-quote.js";
import { assessPosition, realizePositionCost } from "./position-assessment.js";
import { selectConflictsInvolving, sideOf, } from "./conflicts.js";
import { joinConflict, joinCost, projectJoin } from "./war-entry.js";
import { projectAction, } from "./resolution.js";
/**
 * How far one spoken answer may move a relationship.
 *
 * A position is words, and words that could move trust as far as an act of
 * state would make the coercive ladder decorative: the cheapest rung of the
 * ladder moves a relationship by about this much, and it costs a roll, a
 * capability check and a public act to do it. A reply may reach the world; it
 * may not out-punch the instruments.
 */
export const POSITION_RELATIONSHIP_LIMIT = 0.15;
// --- The trade-off gate ---
function costedFields(cost) {
    return Object.values(cost).filter((value) => value !== undefined && value !== 0).length;
}
// A decision with nothing on the other side of it is a content defect, so it
// fails here rather than reaching a player as a free choice. Loud, like
// apply()'s narration gate: a surface can render any thread this returns.
export function assertPlayable(script) {
    if (script.options.length < 2) {
        throw new Error(`conversation ${script.id} offers fewer than two replies: there is no decision in it`);
    }
    if (new Set(script.options.map((o) => o.tone)).size < 2) {
        throw new Error(`conversation ${script.id} offers only one tone: its replies are not a choice`);
    }
    for (const option of script.options) {
        if (option.commitment.kind !== "position")
            continue;
        // A resolved impact is a cost — it is just not one the author typed into
        // the four metric fields. Content that declares what a decision did to
        // people and to money resolves it into effects before the script gets
        // here, and reading only `cost` refused exactly those replies: a scenario
        // that spent an emergency appropriation and killed forty people was thrown
        // out as a free choice while one that moved standing by a hundredth passed.
        if (costedFields(option.commitment.cost) > 0 || (option.commitment.resolved ?? []).length > 0 ||
            option.commitment.collection || option.commitment.relief || option.commitment.locale || option.commitment.transmit || option.commitment.tariff || option.commitment.tariffLift || option.commitment.directive ||
            option.commitment.billText || option.commitment.judicialNomination || option.commitment.orderRescission || option.commitment.orderReview)
            continue;
        throw new Error(`conversation ${script.id} reply ${option.id} costs nothing: no costless decisions`);
    }
}
// --- Speaker truth ---
export { resolveSpeaker } from "./conversation-speaker.js";
// --- What the board can actually be charged ---
/**
 * The board a price is charged against.
 *
 * Readiness is read off the force rather than off the panel: a readiness effect
 * is routed onto the nation's own stat and mirrored back, so the stat is the
 * balance and the metric is a copy of it.
 */
// --- Projection ---
function instrumentProjection(campaign, script, option, streams) {
    if (option.commitment.kind !== "instrument")
        throw new Error("not an instrument commitment");
    const projected = projectAction(campaign, {
        actor: campaign.founding.nation,
        target: script.counterpart,
        instrument: option.commitment.instrument,
        rung: option.commitment.rung,
    }, streams);
    if (!projected.ok) {
        return {
            option,
            available: false,
            missingCapability: projected.missingCapability,
            cost: {},
            risks: [],
            ripples: [],
            rippleVisibility: "always",
        };
    }
    return fromActionProjection(campaign, option, projected.projection);
}
function fromActionProjection(campaign, option, projection) {
    const quote = chargedQuote(projection.cost, campaign);
    return {
        option,
        available: true,
        cost: quote.cost,
        ...(quote.exhausted.length > 0 ? { exhausted: quote.exhausted } : {}),
        successChance: projection.successChance,
        ...(projection.successExposureChance !== undefined ? { successExposureChance: projection.successExposureChance } : {}),
        timing: projection.timing,
        civilianRisk: projection.civilianRisk,
        contest: projection.contest,
        risks: projection.risks,
        ripples: projection.ripples,
        rippleVisibility: projection.rippleVisibility,
        ...(projection.deterrence ? { deterrence: projection.deterrence } : {}),
        ...(projection.conflict ? { conflict: projection.conflict } : {}),
        consultation: projection.consultation,
        ...(projection.capacity ? { capacity: projection.capacity } : {}),
        ...(projection.costBasis ? { costBasis: projection.costBasis } : {}),
    };
}
/**
 * The room's opinion written onto the packet that carries the decision.
 *
 * Every voice the player was shown, not only the chair the subject routed to.
 * The screen argues with up to four ministers and the record used to keep one
 * of them, so a Secretary of Defense who filed a warning against the president's
 * course had no evidence of having done so, and nothing that wanted to model a
 * grievance, a resignation or a leak over a specific overruling had anything to
 * read. The primary keeps its own fields because the odds it was weighing are
 * the load-bearing half of a forecast; the rest of the room rides beside it.
 */
function stampCounsel(room, packet, successChance) {
    const primary = room[0];
    if (primary?.kind !== "counsel")
        return packet;
    const counsel = {
        role: primary.role,
        person: primary.person,
        stance: primary.stance,
        ...(successChance === undefined ? {} : { successChance }),
        room: room.flatMap((voice) => voice.kind === "counsel" ? [{ role: voice.role, person: voice.person, stance: voice.stance }] : []),
    };
    return { ...packet, counsel };
}
// A position is not rolled for, so it has no odds to have been read against —
// the record keeps the stance alone rather than a success chance invented for
// the sake of a uniform shape.
function withCounsel(campaign, script, option, packet, streams) {
    const projection = projectReply(campaign, script, option, streams);
    return stampCounsel(roomCounselOnReply(campaign, script, projection), packet, projection.successChance);
}
export function projectReply(campaign, script, option, streams) {
    if (option.commitment.kind === "instrument")
        return instrumentProjection(campaign, script, option, streams);
    if (option.commitment.kind === "join") {
        // A war the counterpart is not in cannot be joined, and the room is told
        // that before the player picks rather than after.
        const entry = joinEntry(campaign, script, option.commitment.side);
        const quote = chargedQuote(entry ? joinCost(campaign, entry.conflict, entry.side) : {}, campaign);
        // The same War Powers refusal and nuclear warning the Operations room
        // reads, so a reply cannot offer a door into a war the office's authority
        // does not reach, or into one against an arsenal without saying so.
        const projected = entry ? projectJoin(campaign, entry.conflict.id, entry.side) : undefined;
        return {
            option,
            available: entry !== undefined && projected?.refusal === undefined,
            ...(projected?.refusal ? { missingCapability: projected.refusal } : {}),
            ...(projected?.deterrence.defenderNuclear ? { deterrence: projected.deterrence } : {}),
            cost: quote.cost,
            ...(quote.exhausted.length > 0 ? { exhausted: quote.exhausted } : {}),
            risks: [],
            ripples: [],
            rippleVisibility: "always",
        };
    }
    const collection = collectionAction(campaign, option.commitment.collection);
    const relief = reliefProjection(campaign, option.commitment.relief);
    const locale = localeProjection(campaign, option.commitment.locale);
    const transmission = transmissionAction(campaign, option.commitment.transmit);
    const tariff = tariffAction(campaign, option.commitment.tariff);
    const tariffLift = tariffLiftAction(campaign, option.commitment.tariffLift);
    const directive = directiveAction(campaign, option.commitment.directive);
    const billText = billTextAction(campaign, option.commitment.billText);
    const judicialNomination = judicialNominationAction(campaign, option.commitment.judicialNomination);
    const orderRescission = orderRescissionAction(campaign, option.commitment.orderRescission);
    const orderReview = orderReviewAction(campaign, option.commitment.orderReview);
    const quote = chargedQuote(quotedPositionCost(campaign, option.commitment), campaign);
    const exposure = [...projectPositionExposure(campaign, script, option.commitment), ...(option.commitment.importSuspensionDays ? [{ id: "timed-import-suspension", description: `Incoming goods are suspended for ${option.commitment.importSuspensionDays} days from signature. Exports remain legally open. The suspension expires automatically; other trade restrictions still apply.` }] : [])];
    return {
        option,
        available: !option.commitment.reliefRefusal && collection.ok && relief.ok && locale.ok && transmission.ok && tariff.ok && tariffLift.ok && directive.ok && billText.ok && judicialNomination.ok && orderRescission.ok && orderReview.ok,
        ...(option.commitment.reliefRefusal ? { missingCapability: option.commitment.reliefRefusal } : !collection.ok ? { missingCapability: collection.reason } : !relief.ok ? { missingCapability: relief.reason } : !locale.ok ? { missingCapability: locale.reason } : !transmission.ok ? { missingCapability: transmission.reason } : !tariff.ok ? { missingCapability: tariff.reason } : !tariffLift.ok ? { missingCapability: tariffLift.reason } : !directive.ok ? { missingCapability: directive.reason } : !billText.ok ? { missingCapability: billText.reason } : !judicialNomination.ok ? { missingCapability: judicialNomination.reason } : !orderRescission.ok ? { missingCapability: orderRescission.reason } : !orderReview.ok ? { missingCapability: orderReview.reason } : {}),
        cost: quote.cost,
        ...(quote.exhausted.length > 0 ? { exhausted: quote.exhausted } : {}),
        assessment: assessPosition(campaign, quote.cost, { briefingDoubted: script.briefingDoubted === true }),
        risks: [],
        ...(exposure.length > 0 ? { exposure } : {}),
        ripples: [],
        rippleVisibility: "always",
    };
}
/**
 * Which war the player would be entering, and on which side of it.
 *
 * The reply names its side relative to the nation the scenario cast — "beside"
 * them or "against" them — and the side of the actual conflict is read off the
 * board here. That way a scenario cannot enlist the player onto a side its own
 * cast is not on: if the board has moved since the scenario was written, the
 * reply is simply unavailable rather than quietly wrong.
 */
function joinEntry(campaign, script, side) {
    const player = campaign.founding.nation;
    for (const conflict of selectConflictsInvolving(campaign, script.counterpart)) {
        if (conflict.status !== "active")
            continue;
        if (sideOf(conflict, player) !== undefined)
            continue;
        const theirs = sideOf(conflict, script.counterpart);
        if (theirs === undefined)
            continue;
        const ours = side === "beside" ? theirs : theirs === "aggressor" ? "defender" : "aggressor";
        return { conflict, side: ours };
    }
    return undefined;
}
export function openConversation(campaign, script, streams) {
    assertPlayable(script);
    return {
        script,
        beats: script.opening.map((beat) => ({ speaker: resolveSpeaker(campaign, script, beat.speaker), text: beat.text })),
        replies: script.options.map((option) => projectReply(campaign, script, option, streams)),
    };
}
function boundedDeltas(deltas) {
    const clamp = (value) => Math.max(-POSITION_RELATIONSHIP_LIMIT, Math.min(POSITION_RELATIONSHIP_LIMIT, value));
    return Object.fromEntries(Object.entries(deltas).map(([field, value]) => [field, clamp(value)]));
}
/**
 * What the answer did to the two governments' reading of each other.
 *
 * Both directions move, because both edges are what the board reads back: the
 * player's own edge is what a scenario's `relationship` gate and every foreign
 * screen consult, and the counterpart's edge is what decides whether it joins
 * someone else's war against you. Moving one and not the other would leave the
 * fiction agreed at the table and half the board still disagreeing with it.
 */
function relationshipEffects(campaign, script, deltas) {
    const bounded = boundedDeltas(deltas);
    const pairs = [
        [campaign.founding.nation, script.counterpart],
        [script.counterpart, campaign.founding.nation],
    ];
    return pairs
        .filter(([from, to]) => from !== to && selectRelationship(campaign, from, to) !== undefined)
        .map(([from, to]) => ({ kind: "relationship", from, to, deltas: bounded }));
}
function positionPacket(campaign, script, option, collectionEffects = []) {
    if (option.commitment.kind !== "position")
        throw new Error("not a position commitment");
    const { cost, pull, remembered, relationship, conflictMove, resolved, institutional } = option.commitment;
    const heldToward = selectRelationship(campaign, script.counterpart, campaign.founding.nation);
    const effects = [
        { kind: "metric", deltas: realizePositionCost(campaign, cost) },
        ...(resolved ?? []),
        ...collectionEffects,
        ...(option.commitment.importSuspensionDays ? temporaryImportSuspension(campaign, script.counterpart, option.commitment.importSuspensionDays) : []),
        ...(pull ? [{ kind: "alignment", pull }] : []),
        ...(relationship ? relationshipEffects(campaign, script, relationship) : []),
        ...(conflictMove ? conflictMoveEffects(campaign, script, conflictMove, remembered) : []),
        // The counterpart is the one who remembers what was said to it.
        ...(heldToward
            ? [
                {
                    kind: "relationship",
                    from: script.counterpart,
                    to: campaign.founding.nation,
                    addHistory: { turn: campaign.turn, kind: "position", description: remembered },
                },
            ]
            : []),
    ];
    return {
        source: "conversation",
        actor: "player",
        ...(script.subjects?.length ? { subjects: script.subjects } : {}),
        turn: campaign.turn,
        provenance: decisionProvenance(campaign, option.commitment.directive?.kind === "inspector-removal-notice" ? { ...script, visibility: "public" } : script, effects),
        ...(institutional && institutional.length > 0 ? { institutional } : {}),
        // The same assessment the card read, frozen onto the packet so the Record
        // can put what was assessed beside what was measured.
        assessment: assessPosition(campaign, chargedQuote(quotedPositionCost(campaign, option.commitment), campaign).cost, {
            briefingDoubted: script.briefingDoubted === true,
        }),
        narration: { summary: remembered },
        effects,
    };
}
export function commitReply(campaign, script, option, streams, extras) {
    const spoken = { speaker: resolveSpeaker(campaign, script, { kind: "player" }), text: option.text };
    if (option.commitment.kind === "position") {
        if (option.commitment.reliefRefusal)
            return { ok: false, missingCapability: option.commitment.reliefRefusal };
        const collection = collectionAction(campaign, option.commitment.collection);
        if (!collection.ok)
            return { ok: false, missingCapability: collection.reason };
        const relief = reliefProjection(campaign, option.commitment.relief);
        if (!relief.ok)
            return { ok: false, missingCapability: relief.reason };
        const locale = localeProjection(campaign, option.commitment.locale);
        if (!locale.ok)
            return { ok: false, missingCapability: locale.reason };
        const transmission = transmissionAction(campaign, option.commitment.transmit);
        if (!transmission.ok)
            return { ok: false, missingCapability: transmission.reason };
        const tariff = tariffAction(campaign, option.commitment.tariff);
        if (!tariff.ok)
            return { ok: false, missingCapability: tariff.reason };
        const tariffLift = tariffLiftAction(campaign, option.commitment.tariffLift);
        if (!tariffLift.ok)
            return { ok: false, missingCapability: tariffLift.reason };
        const directive = directiveAction(campaign, option.commitment.directive);
        if (!directive.ok)
            return { ok: false, missingCapability: directive.reason };
        const billText = billTextAction(campaign, option.commitment.billText);
        if (!billText.ok)
            return { ok: false, missingCapability: billText.reason };
        const judicialNomination = judicialNominationAction(campaign, option.commitment.judicialNomination);
        if (!judicialNomination.ok)
            return { ok: false, missingCapability: judicialNomination.reason };
        const orderRescission = orderRescissionAction(campaign, option.commitment.orderRescission);
        if (!orderRescission.ok)
            return { ok: false, missingCapability: orderRescission.reason };
        const orderReview = orderReviewAction(campaign, option.commitment.orderReview);
        if (!orderReview.ok)
            return { ok: false, missingCapability: orderReview.reason };
        const charter = option.commitment.relief ? worldDataset.charters.find((entry) => entry.id === campaign.founding.charter) : undefined;
        const signed = option.commitment.relief && charter
            ? signOrder(campaign, charter, "order-relief-program", streams, option.commitment.relief) : undefined;
        if (signed && !signed.ok)
            return { ok: false, missingCapability: signed.reason };
        const acted = option.commitment.locale
            ? takeLocaleAct(campaign, option.commitment.locale.state, option.commitment.locale.act, option.commitment.locale.cause) : undefined;
        if (acted && !acted.ok)
            return { ok: false, missingCapability: acted.reason };
        // The room argues about a position exactly as it argues about an
        // instrument, and the screen already prints that opinion beside the
        // option, so a position writes counsel onto the record the same way an
        // instrument does. Without it, nine replies in ten are argued over and then
        // forgotten, and a chair overruled on one of them has no way to hold it
        // against the president. Recorded from the same projection the screen read,
        // so what a player was shown and what the record keeps cannot come apart.
        const packet = withCounsel(campaign, script, option, positionPacket(campaign, script, option, [...collection.effects, ...transmission.effects, ...tariff.effects, ...tariffLift.effects, ...directive.effects, ...billText.effects,
            ...judicialNomination.effects, ...orderRescission.effects, ...orderReview.effects, ...(signed?.ok ? signed.packet.effects : []), ...(acted?.ok ? acted.packet.effects : [])]), streams);
        // The narrator states what was decided; the rejoinder, where one is
        // written, is somebody answering it. Order matters: the fact lands first,
        // and the reaction is a reaction to it.
        const rejoinder = option.commitment.rejoinder;
        return {
            ok: true,
            packet: settleScenarioAccounting(campaign, packet),
            beats: [
                spoken,
                { speaker: { kind: "narrator" }, text: packet.narration.summary },
                ...(signed?.ok ? [{ speaker: { kind: "narrator" }, text: signed.packet.narration.summary }] : []),
                ...(acted?.ok ? [{ speaker: { kind: "narrator" }, text: acted.packet.narration.summary }] : []),
                ...(transmission.summary ? [{ speaker: { kind: "narrator" }, text: transmission.summary }] : []),
                ...(tariff.summary ? [{ speaker: { kind: "narrator" }, text: tariff.summary }] : []),
                ...(tariffLift.summary ? [{ speaker: { kind: "narrator" }, text: tariffLift.summary }] : []),
                ...(directive.summary ? [{ speaker: { kind: "narrator" }, text: directive.summary }] : []),
                ...(billText.summary ? [{ speaker: { kind: "narrator" }, text: billText.summary }] : []),
                ...(judicialNomination.summary ? [{ speaker: { kind: "narrator" }, text: judicialNomination.summary }] : []),
                ...(orderRescission.summary ? [{ speaker: { kind: "narrator" }, text: orderRescission.summary }] : []),
                ...(orderReview.summary ? [{ speaker: { kind: "narrator" }, text: orderReview.summary }] : []),
                ...(rejoinder ? [{ speaker: resolveSpeaker(campaign, script, rejoinder.speaker), text: rejoinder.text }] : []),
            ],
        };
    }
    if (option.commitment.kind === "join") {
        const entry = joinEntry(campaign, script, option.commitment.side);
        if (!entry)
            return { ok: false, missingCapability: "a war that nation is actually fighting" };
        const joined = joinConflict(campaign, campaign.founding.nation, entry.conflict.id, entry.side);
        if (!joined.ok)
            return { ok: false, missingCapability: joined.missingCapability ?? joined.reason };
        // Entering somebody else's war is the loudest decision in the game and was
        // the one commit path that recorded neither the room that argued about it
        // nor where it sits in the graph.
        const joinPacket = withCounsel(campaign, script, option, stampedDecision(campaign, script, joined.packet), streams);
        // Same order a position keeps: the fact lands first, the reaction reacts.
        const joinRejoinder = option.commitment.rejoinder;
        return {
            ok: true,
            packet: joinPacket,
            beats: [
                spoken,
                { speaker: { kind: "narrator" }, text: joinPacket.narration.summary },
                ...(joinRejoinder
                    ? [{ speaker: resolveSpeaker(campaign, script, joinRejoinder.speaker), text: joinRejoinder.text }]
                    : []),
            ],
        };
    }
    const resolved = issueAction(campaign, {
        actor: campaign.founding.nation,
        target: script.counterpart,
        instrument: option.commitment.instrument,
        rung: option.commitment.rung,
    }, streams, "conversation", 
    // The register the player answered in is a fact only the conversation
    // knows, so it is supplied here rather than asked of every caller — an
    // explicit context from a caller still wins.
    extras ? { ...extras, context: { tone: option.tone, ...extras.context } } : undefined);
    if (!resolved.ok)
        return { ok: false, missingCapability: resolved.missingCapability };
    // The room's opinion is recorded at the moment it was held, against the odds
    // it was actually looking at. Reconstructing it later from the ledger can only
    // recover the half of counsel's scoring that a save keeps — the minister's
    // instincts — and silently loses the half that made a cautious chair flinch.
    const stamped = stampCounsel(roomCounselOnReply(campaign, script, fromActionProjection(campaign, option, resolved.projection)), stampedDecision(campaign, script, resolved.packet), resolved.projection.successChance);
    // Content-compiled effects (domestic signature, etc.) ride beside the
    // instrument packet the same way a position's `resolved` rides beside cost.
    const compiled = option.commitment.resolved ?? [];
    const packet = compiled.length === 0 ? stamped : { ...stamped, effects: [...stamped.effects, ...compiled] };
    // The resolver's narration already says what the attempt was and how it went,
    // failure branch included, so a second beat restating the risk would be the
    // same sentence twice. An authored aftermath arrives as several lines and is
    // spoken as several beats, in the thread, where the decision was made.
    const aftermath = resolved.consequence?.beats ?? [packet.narration.summary];
    // The rejoinder speaks between the order and the world's answer: it is the
    // room at the moment of commitment, written blind to the roll, so it cannot
    // come after a narration that already says how the attempt went.
    const rejoinder = option.commitment.rejoinder;
    return {
        ok: true,
        packet,
        beats: [
            spoken,
            ...(rejoinder ? [{ speaker: resolveSpeaker(campaign, script, rejoinder.speaker), text: rejoinder.text }] : []),
            ...aftermath.map((text) => ({ speaker: { kind: "narrator" }, text })),
        ],
        ...(resolved.staged ? { staged: resolved.staged } : {}),
    };
}
