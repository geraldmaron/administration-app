import { US_ID, worldDataset } from "@admin/world";
import { deescalateConflict, selectConflictsInvolving, settleByAgreement, sideOf, termsOfferedFlag, } from "./conflicts.js";
import { strengthRatio } from "./war-tick.js";
import { headOfGovernmentTitle, nationName, sentenceCase } from "./naming.js";
import { relationshipKey, selectNation } from "./state.js";
import { releaseCommitmentsOf, releaseWarCommitments } from "./commitments.js";
import { noiseFrom, projectWillingness, stampOf, weigh, willDraw, } from "./willingness.js";
import { FIDELITY_WEIGHT, isWorldActor, liveTemperament } from "./temperament.js";
import { regimeDanger } from "./war-join.js";
import { settlementEffects } from "./war-outcomes.js";
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const r4 = (value) => Math.round(value * 10000) / 10000 + 0;
/** Where willingness has to reach before a government signs rather than fights on. */
export const ACCEPTS_TERMS = 0.5;
/** How far the persistent noise can move another government's answer. The President's table reads it without. */
export const PEACE_NOISE = 0.05;
/** How much a grudge holds a government in a war it is losing (planning value). */
const VENGEFULNESS_WEIGHT = 0.3;
/** How far danger to the government at home lowers its bar for a settlement (planning value). */
const REGIME_DANGER_RELIEF = 0.15;
/** What walking out of a war costs the President at home and with the ally left fighting (planning values). */
const LEAVE_STANDING = 0.03;
const LEAVE_TRUST = 0.2;
/** What a government's walking out costs it with the principal it left fighting (planning value). */
const DEPARTURE_TRUST = 0.1;
function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length === 0)
        return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
/**
 * The authored world's middle on vengefulness, a dataset constant for the
 * reason the other temperament centers are: a reshaped world must still move
 * the verdict, which a center taken from the live campaign would absorb.
 */
export const VENGEFULNESS_CENTER = median(worldDataset.nations.filter((nation) => nation.id !== US_ID).map((nation) => nation.traits.vengefulness));
function otherSide(side) {
    return side === "aggressor" ? "defender" : "aggressor";
}
function principal(conflict, side) {
    return side === "aggressor" ? conflict.aggressor : conflict.defender;
}
function displayName(campaign, nation) {
    const identity = selectNation(campaign, nation)?.base.identity;
    return identity ? nationName(identity) : nation;
}
/**
 * What the war has cost the side, weighted toward the cost rather than the
 * map: a government whose country is worn out and whose people have stopped
 * backing the war signs while still holding ground, and one that is winning
 * does not sign because it is asked nicely. A grudge holds it in, weighted by
 * how well the dataset knows its character; danger at home lowers the bar,
 * because for a government that may fall a settlement is survival.
 */
export function peaceReading(campaign, conflict, side, nation = principal(conflict, side)) {
    const ratio = strengthRatio(campaign, conflict);
    const losing = side === "aggressor" ? clamp01(1 - ratio) : clamp01(1 - 1 / ratio);
    const runtime = selectNation(campaign, nation);
    const temper = liveTemperament(campaign, nation);
    const f = FIDELITY_WEIGHT[runtime?.base.fidelity ?? "full"];
    const grudge = temper ? -f * VENGEFULNESS_WEIGHT * (temper.vengefulness - VENGEFULNESS_CENTER) : 0;
    const danger = runtime ? regimeDanger(runtime) : 0;
    return {
        nation,
        side,
        terms: [
            { key: "exhaustion", source: "situation", value: r4(conflict.exhaustion[side] * 0.5) },
            { key: "lost-support", source: "situation", value: r4((1 - conflict.warSupport[side]) * 0.3) },
            { key: "losing", source: "situation", value: r4(losing * 0.2) },
            { key: "vengefulness", source: "trait", value: r4(grudge) },
        ],
        threshold: r4(ACCEPTS_TERMS - REGIME_DANGER_RELIEF * danger),
    };
}
/** The decision: the reading weighed, with the noise the caller drew (none for the President's table). */
export function weighPeace(reading, noise = 0) {
    return weigh("accept-peace", reading.terms, { threshold: reading.threshold, noiseBound: PEACE_NOISE, noise });
}
function drawnPeace(reading, conflict, streams) {
    return weighPeace(reading, noiseFrom(willDraw(streams, "accept-peace", reading.nation, conflict.id), PEACE_NOISE));
}
/** The verdict in words, naming the term that decided it where it was the government's own character or its danger at home. */
function reasonFor(name, reading, accepts, offered) {
    const lead = sentenceCase(name);
    const grudge = reading.terms.find((term) => term.key === "vengefulness")?.value ?? 0;
    const relieved = reading.threshold < ACCEPTS_TERMS - 0.02;
    if (accepts) {
        const why = relieved ? " Trouble at home makes a settlement look like survival." : "";
        return offered
            ? `${lead} is worn down enough to sign, and the terms are already on the table.${why}`
            : `${lead} would sign if terms were put to them. Nothing has been put to them yet.${why}`;
    }
    const why = grudge <= -0.02 ? " It holds a grudge over this war that outweighs what the war has cost it." : "";
    return `${lead} is not finished. Terms put to them now are read as an admission that this administration is the one that wants out.${why}`;
}
/**
 * What a peace move would find, before it is made. Pure and seed-independent,
 * the same contract every projection in the engine holds: the decision with
 * the noise left out, which is exactly what `settleWar` holds the counterpart
 * to.
 */
export function projectPeace(campaign, conflictId) {
    const conflict = campaign.conflicts[conflictId];
    if (!conflict || conflict.status !== "active")
        return undefined;
    const ourSide = sideOf(conflict, campaign.founding.nation);
    if (!ourSide)
        return undefined;
    const reading = peaceReading(campaign, conflict, otherSide(ourSide));
    const decided = weighPeace(reading);
    const projected = projectWillingness("accept-peace", reading.terms, { threshold: reading.threshold, noiseBound: PEACE_NOISE });
    const offered = campaign.player.flags[termsOfferedFlag(conflict.id)] === true;
    const name = displayName(campaign, reading.nation);
    return {
        conflict,
        ourSide,
        counterpart: reading.nation,
        counterpartName: name,
        willingness: round3(clamp01(decided.score)),
        wouldAccept: decided.acts,
        offered,
        reasoning: reasonFor(name, reading, decided.acts, offered),
        terms: reading.terms,
        threshold: reading.threshold,
        forecast: projected.forecast,
        leading: projected.leading,
    };
}
/** Every war this government is a party to, with the peace table read for each. */
export function selectPeaceTables(campaign) {
    return selectConflictsInvolving(campaign, campaign.founding.nation)
        .filter((conflict) => conflict.status === "active")
        .flatMap((conflict) => {
        const projection = projectPeace(campaign, conflict.id);
        return projection ? [projection] : [];
    });
}
function packet(campaign, summary, effects) {
    return {
        source: "action",
        actor: "player",
        turn: campaign.turn,
        narration: { summary },
        effects: [...effects],
    };
}
/**
 * Sue for peace.
 *
 * Costs standing whatever comes of it, and deliberately does not depend on
 * whether the other side will take it: putting terms to a government that is
 * still winning is a thing presidents do, and it is exactly the version of this
 * act that is read at home as weakness.
 */
export function offerTerms(campaign, conflictId) {
    const projection = projectPeace(campaign, conflictId);
    if (!projection)
        return { ok: false, reason: "There is no live war of this government's to put terms to." };
    if (projection.offered) {
        return { ok: false, reason: `Terms are already on the table with ${projection.counterpartName}.` };
    }
    const who = headOfGovernmentTitle(campaign.founding.leadRole);
    const summary = `${who} puts terms to ${projection.counterpartName}. Whether they are taken is now somebody else's decision.`;
    return {
        ok: true,
        projection,
        packet: packet(campaign, summary, [
            { kind: "flag", set: [termsOfferedFlag(projection.conflict.id)] },
            { kind: "metric", deltas: { standing: -0.02 } },
        ]),
    };
}
/**
 * End it at a table.
 *
 * Requires both that terms are on the table and that the other government would
 * take them — the two halves of an agreement, refused separately so a player
 * who cannot end a war is told which half is missing. A country that joined
 * somebody else's war cannot sign that war's peace for the government it came
 * in beside; it can leave. The settled war carries `settleByAgreement`'s own
 * shape, so a war ended here and a war ended by a scenario reply are
 * indistinguishable to everything downstream.
 */
export function settleWar(campaign, conflictId) {
    const projection = projectPeace(campaign, conflictId);
    if (!projection)
        return { ok: false, reason: "There is no live war of this government's to settle." };
    if (projection.conflict.joined[projection.ourSide].includes(campaign.founding.nation)) {
        const alongside = displayName(campaign, principal(projection.conflict, projection.ourSide));
        return { ok: false, reason: `The settlement is ${alongside}'s to sign. The United States joined this war; it can leave it.` };
    }
    if (!projection.offered) {
        return { ok: false, reason: `Nothing has been put to ${projection.counterpartName}. Terms come before a signature.` };
    }
    if (!projection.wouldAccept) {
        return { ok: false, reason: projection.reasoning };
    }
    const summary = `The war with ${projection.counterpartName} ends at a table. Both governments sign, and the front stops costing the country a week at a time.`;
    const answer = weighPeace(peaceReading(campaign, projection.conflict, otherSide(projection.ourSide)));
    const settled = settleByAgreement(projection.conflict, campaign.turn, summary);
    return {
        ok: true,
        projection,
        // No metric of its own: what a war did to this administration is already
        // written every week it ran, and pricing the ending as well would charge
        // the same thing twice.
        packet: {
            ...packet(campaign, summary, [
                { kind: "conflict", set: settled },
                // A war ended at a table leaves the same grudges as one ended by exhaustion.
                ...settlementEffects(campaign, settled),
                // The front stops costing the country a week at a time only if the
                // promises made to fight it stop too.
                ...releaseWarCommitments(campaign, projection.conflict.id, [projection.counterpart], summary),
            ]),
            provenance: {
                origin: "decision",
                entities: [projection.counterpart, projection.conflict.id],
                systems: ["alliances"],
                visibility: "public",
                decision: stampOf(answer, projection.counterpart, projection.conflict.id, "public"),
            },
        },
    };
}
/**
 * Cool the front without ending it.
 *
 * One step down for one week's worth of restraint, which is exactly the size of
 * the step a strike puts up — so a president who pulls back and then hits again
 * has spent a week and arrived where they started.
 */
export function coolFront(campaign, conflictId) {
    const projection = projectPeace(campaign, conflictId);
    if (!projection)
        return { ok: false, reason: "There is no live war of this government's to cool." };
    if (projection.conflict.intensity <= 0) {
        return { ok: false, reason: "The front is already as quiet as a war gets without ending." };
    }
    const front = selectNation(campaign, projection.counterpart)?.base.identity.name ?? projection.counterpartName;
    const summary = `The administration pulls back on the ${front} front for the week, and the fighting cools without stopping.`;
    return {
        ok: true,
        projection,
        packet: packet(campaign, summary, [
            { kind: "conflict", set: deescalateConflict(projection.conflict, campaign.turn, summary) },
        ]),
    };
}
// --- Leaving a war one joined ---
/** The war with one co-belligerent gone from it: off its side, onto the list of those who left, with the beat that says so. */
function withoutParty(conflict, nation, side, turn, description) {
    return {
        ...conflict,
        joined: { ...conflict.joined, [side]: conflict.joined[side].filter((id) => id !== nation) },
        left: [...(conflict.left ?? []).filter((id) => id !== nation), nation],
        beats: [...conflict.beats, { turn, description }],
    };
}
/**
 * What walking out of a war would cost, stated before it is done, from the
 * same constants `leaveWar` spends. Only a war the country joined can be
 * left; a war it is a principal of ends at a table.
 */
export function projectLeave(campaign, conflictId) {
    const conflict = campaign.conflicts[conflictId];
    if (!conflict || conflict.status !== "active")
        return undefined;
    const side = sideOf(conflict, campaign.founding.nation);
    if (!side)
        return undefined;
    const joinedHere = conflict.joined[side].includes(campaign.founding.nation);
    return {
        conflict,
        side,
        alongside: principal(conflict, side),
        against: principal(conflict, otherSide(side)),
        cost: { standing: -LEAVE_STANDING },
        ...(joinedHere ? {} : { refusal: "This is the country's own war. It ends at a table, not by walking away from it." }),
    };
}
/**
 * Leave the war. The principals fight on, and their peace, when it comes, is
 * not this country's to sign. The forces committed to it come home, and the
 * government left fighting remembers.
 */
export function leaveWar(campaign, conflictId) {
    const projection = projectLeave(campaign, conflictId);
    if (!projection)
        return { ok: false, reason: "There is no live war of this government's to leave." };
    if (projection.refusal)
        return { ok: false, reason: projection.refusal };
    const us = campaign.founding.nation;
    const summary = `The United States leaves the war, and ${displayName(campaign, projection.alongside)} fights on without it.`;
    const abandoned = campaign.relationships[relationshipKey(projection.alongside, us)]
        ? [{ kind: "relationship", from: projection.alongside, to: us, deltas: { trust: -LEAVE_TRUST } }]
        : [];
    return {
        ok: true,
        projection,
        packet: {
            ...packet(campaign, summary, [
                { kind: "conflict", set: withoutParty(projection.conflict, us, projection.side, campaign.turn, summary) },
                ...releaseCommitmentsOf(campaign, conflictId, us, projection.against, summary),
                { kind: "metric", deltas: { standing: projection.cost.standing } },
                ...abandoned,
                { kind: "feed", items: [{ turn: campaign.turn, kind: "conflict", visibility: "public", headline: summary, actor: us, target: projection.alongside }] },
            ]),
            provenance: { origin: "decision", entities: [conflictId, projection.alongside], systems: ["alliances"], visibility: "public" },
        },
    };
}
function decisionProvenance(conflict, answer, entities) {
    const visibility = "public";
    return {
        origin: "world",
        entities: [...entities, conflict.id],
        systems: ["alliances"],
        visibility,
        decision: stampOf(answer.willingness, answer.reading.nation, conflict.id, visibility),
    };
}
/**
 * Two governments ending their own war at a table, when both would sign.
 * The same willingness the President's counterpart answers, with the
 * persistent noise in, so no victor is named and neither side is told it won.
 * Nothing where the President's country is a principal: that table is the
 * President's.
 */
export function npcSettlementPacket(campaign, conflict, streams) {
    if (conflict.status !== "active")
        return undefined;
    if (!isWorldActor(campaign, conflict.aggressor) || !isWorldActor(campaign, conflict.defender))
        return undefined;
    const answers = ["aggressor", "defender"].map((side) => {
        const reading = peaceReading(campaign, conflict, side);
        return { reading, willingness: drawnPeace(reading, conflict, streams) };
    });
    if (!answers.every((answer) => answer.willingness.acts))
        return undefined;
    // The reluctant signature is the one that decided it.
    const binding = answers.reduce((a, b) => (b.willingness.margin < a.willingness.margin ? b : a));
    const summary = `${sentenceCase(displayName(campaign, conflict.aggressor))} and ${displayName(campaign, conflict.defender)} sign an end to their war. Neither side can claim a victory.`;
    const settled = settleByAgreement(conflict, campaign.turn, summary);
    return {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary },
        effects: [
            { kind: "conflict", set: settled },
            ...settlementEffects(campaign, settled),
            ...releaseWarCommitments(campaign, conflict.id, [conflict.aggressor, conflict.defender], summary),
            { kind: "feed", items: [{ turn: campaign.turn + 1, kind: "conflict", visibility: "public", headline: summary, actor: conflict.aggressor, target: conflict.defender }] },
        ],
        provenance: decisionProvenance(conflict, binding, [conflict.aggressor, conflict.defender]),
    };
}
/** One co-belligerent going home: off the war, its forces released, and a mark against it with the principal it left. */
function departurePacket(campaign, conflict, answer) {
    const { nation, side } = answer.reading;
    const alongside = principal(conflict, side);
    const summary = `${sentenceCase(displayName(campaign, nation))} withdraws from the war and leaves ${displayName(campaign, alongside)} to fight on.`;
    const after = withoutParty(conflict, nation, side, campaign.turn, summary);
    const resentment = campaign.relationships[relationshipKey(alongside, nation)]
        ? [{ kind: "relationship", from: alongside, to: nation, deltas: { trust: -DEPARTURE_TRUST } }]
        : [];
    const packet = {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary },
        effects: [
            { kind: "conflict", set: after },
            ...releaseCommitmentsOf(campaign, conflict.id, nation, principal(conflict, otherSide(side)), summary),
            ...resentment,
            { kind: "feed", items: [{ turn: campaign.turn + 1, kind: "conflict", visibility: "public", headline: summary, actor: nation, target: alongside }] },
        ],
        provenance: decisionProvenance(conflict, answer, [nation, alongside]),
    };
    return { packet, after };
}
/**
 * The governments that came into this war and now want out, each leaving on
 * its own answer to the same question a principal answers. The President's
 * country is not among them: it leaves only by the President's act.
 */
export function departurePackets(campaign, conflict, streams) {
    if (conflict.status !== "active")
        return [];
    const packets = [];
    let working = conflict;
    for (const side of ["aggressor", "defender"]) {
        for (const nation of conflict.joined[side]) {
            if (!isWorldActor(campaign, nation))
                continue;
            const reading = peaceReading(campaign, conflict, side, nation);
            const willingness = drawnPeace(reading, conflict, streams);
            if (!willingness.acts)
                continue;
            const left = departurePacket(campaign, working, { reading, willingness });
            packets.push(left.packet);
            working = left.after;
        }
    }
    return packets;
}
/**
 * The peace questions a war's week asks before it is fought: whether its two
 * principals end it at a table, and otherwise which of the governments that
 * joined it go home. A war that settles loses nobody first.
 */
export function alliancePackets(campaign, conflict, streams) {
    const settled = npcSettlementPacket(campaign, conflict, streams);
    return settled ? [settled] : departurePackets(campaign, conflict, streams);
}
