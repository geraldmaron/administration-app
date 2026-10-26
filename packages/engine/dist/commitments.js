import { forceAssetNoun, forceAssetPersonnel, organizations } from "@admin/world";
import { selectConditionsFor, selectNation, selectRelationship, } from "./state.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { ARREARS_STABILITY_COST } from "./budget.js";
import { obligationAvailability } from "./funding.js";
import { createGrudge } from "./relationships.js";
import { markedFlags } from "./marked-flags.js";
import { deploymentLocation } from "./commitment-locations.js";
import { isOrderCourtSuspended, prospectiveOrderAuthority } from "./order-authority.js";
/** The location a new commitment is written with, where it has one: a deployment stands in its target's zone. */
function located(campaign, draft) {
    const location = deploymentLocation(campaign, draft.kind, draft.actor, draft.target);
    return location ? { location } : {};
}
export function commitmentId(draft, turn) {
    return `commitment:${draft.kind}:${draft.actor}:${draft.target.id}:${turn}`;
}
const sameOperation = (a, draft) => JSON.stringify([a.resource, a.source]) === JSON.stringify([draft.resource, draft.source]);
/**
 * The id a draft opens under. The base id names kind, actor, target and turn,
 * which two different operations can share (an aid line and an arms line
 * to one nation in one week). A stored commitment under that id that is the
 * same operation keeps it, so resubmitting is idempotent; a different one
 * pushes this draft to the next free suffix, so neither overwrites the other.
 */
export function openingCommitmentId(campaign, draft) {
    const base = commitmentId(draft, campaign.turn);
    for (let n = 1;; n += 1) {
        const id = n === 1 ? base : `${base}:${n}`;
        const held = campaign.commitments[id];
        if (!held || sameOperation(held, draft))
            return id;
    }
}
/** Every commitment a nation is currently keeping. */
export function activeCommitments(campaign, actor) {
    return Object.values(campaign.commitments)
        .filter((commitment) => commitment.actor === actor && commitment.status === "active")
        .sort((a, b) => a.startedTurn - b.startedTurn || a.id.localeCompare(b.id));
}
/** Everything a nation has ever committed to, kept or abandoned. */
export function selectCommitments(campaign, actor) {
    return Object.values(campaign.commitments)
        .filter((commitment) => commitment.actor === actor)
        .sort((a, b) => a.startedTurn - b.startedTurn || a.id.localeCompare(b.id));
}
/** What a nation has standing toward one particular country, war or body. */
export function commitmentsToward(campaign, actor, targetId) {
    return activeCommitments(campaign, actor).filter((commitment) => commitment.target.id === targetId);
}
/**
 * Whether the administration has the authority to promise this.
 *
 * A year of it, because a year is what the appropriation is written for: a
 * president may promise abroad out of money Congress has voted, and a promise
 * whose first year does not fit inside the authority on hand is a promise that
 * would be discovered as empty exactly when it was called on — the same
 * argument `forceShortfall` already makes about brigades, applied to money.
 *
 * Only the player's own commitments are asked. Another capital's promises are
 * not drawn on this appropriation, and refusing them against it would be the
 * United States budget deciding what Brazil can afford.
 */
function moneyShortfall(campaign, draft) {
    if (draft.actor !== campaign.founding.nation)
        return undefined;
    if (draft.resource.spec.kind !== "currency")
        return undefined;
    const year = draft.resource.amountPerTurn * TURNS_PER_YEAR;
    if (year <= 0)
        return undefined;
    const funded = obligationAvailability(campaign, year, { excepted: draft.excepted });
    return funded.ok ? undefined : `This needs ${funded.missing}.`;
}
/**
 * Open a commitment.
 *
 * Refused rather than silently trimmed when the forces it names are not there:
 * a deployment the order of battle cannot supply is a promise that would be
 * discovered as empty at exactly the moment it was called on, which is a worse
 * outcome than being told now.
 */
export function openCommitment(campaign, draft) {
    if (!selectNation(campaign, draft.actor))
        return { ok: false, reason: `No such nation: ${draft.actor}.` };
    if (draft.resource.amountPerTurn < 0)
        return { ok: false, reason: "A commitment cannot be negative." };
    const shortfall = forceShortfall(campaign, draft);
    if (shortfall)
        return { ok: false, reason: shortfall };
    const unfunded = moneyShortfall(campaign, draft);
    if (unfunded)
        return { ok: false, reason: unfunded };
    const commitment = {
        id: openingCommitmentId(campaign, draft),
        kind: draft.kind,
        actor: draft.actor,
        target: draft.target,
        resource: draft.resource,
        source: draft.source,
        startedTurn: campaign.turn,
        review: draft.review,
        status: "active",
        rationale: draft.rationale,
        addressedCondition: draft.addressedCondition,
        ...(draft.authorizedBy ? { authorizedBy: draft.authorizedBy } : {}),
        ...located(campaign, draft),
    };
    const deed = commitmentDeed(campaign, commitment, "pledge");
    return {
        ok: true,
        packet: {
            source: "action",
            actor: draft.actor === campaign.founding.nation ? "player" : "world",
            turn: campaign.turn,
            narration: { summary: openingSummary(commitment, campaign) },
            effects: deed ? [{ kind: "commitment", set: commitment }, deed] : [{ kind: "commitment", set: commitment }],
        },
    };
}
// The two cuts that turn a commitment's weight into a `RungBand`: below 0.1%
// of the actor's own means is `low`, below 0.5% `mid`, at or above `high`. Deliberately not fit to what has been authored so far —
// `standingCommitment`'s shareOfGdp figures all sit far under the low cut —
// because the cuts describe what would actually register as a serious
// national commitment, not the handful of rungs the ladder happens to author
// today. A force commitment is banded on the same two cuts against the
// fraction of the branch's order of battle it removes, so a money pledge and
// a force pledge of comparable weight land in the same band.
const COMMITMENT_LOW_SHARE = 0.001;
const COMMITMENT_MID_SHARE = 0.005;
function bandOfShare(share) {
    if (share < COMMITMENT_LOW_SHARE)
        return "low";
    return share < COMMITMENT_MID_SHARE ? "mid" : "high";
}
// A pledge or withdrawal has no rung to read a band off, so this is the
// derivation content's brief has to trust instead: how much of the actor's
// own means the commitment actually draws on, not a judgment call.
function commitmentBand(campaign, commitment) {
    if (commitment.source.kind === "orderOfBattle") {
        return bandOfShare(orderOfBattleShare(campaign, commitment.actor, commitment.source));
    }
    const gdp = selectNation(campaign, commitment.actor)?.stats.economy.gdp ?? 0;
    return bandOfShare(gdp > 0 ? commitment.resource.amountPerTurn / gdp : 0);
}
function orderOfBattleShare(campaign, actor, source) {
    const order = selectNation(campaign, actor)?.stats.military.orderOfBattle;
    const held = order?.[source.branch].units?.find((unit) => unit.type === source.unitType)?.count;
    // No authored decomposition is not a zero-size bench — see forceShortfall's
    // own reading of the same field. It is a bench this dataset never wrote
    // down, and `low` is the honest answer for it: the act cannot be shown to
    // have consumed a serious share of a bench nobody described.
    if (!held)
        return 0;
    return source.count / held;
}
// One flag builder for both directions of the commitment pair. `pledge` and
// `withdrawal` are the two families §1.2 names for `openCommitment` and this
// file's own wind-down path, and both are stamped the same way once the
// commitment and its band are known.
//
// Scope matches §1.6: only the player's own commitments are stamped, because
// a pledge or a withdrawal is machinery only this government operates — every
// authored path into `openCommitment` already refuses to run for anyone else
// (see `standingCommitment`'s own guard in instruments.ts), so this is the
// same invariant restated at the one place that could otherwise drift from
// it. `deed-received:pledge:...` and `deed-from:<nation>:pledge:...` do not
// exist in `deeds.ts` for the same reason: no foreign capital operates this
// machinery, so there is nothing for either form to name.
function commitmentDeed(campaign, commitment, family) {
    if (commitment.actor !== campaign.founding.nation)
        return undefined;
    const band = commitmentBand(campaign, commitment);
    const flags = [deedFlagLocal(family, band, "landed")];
    if (commitment.target.kind === "nation") {
        flags.push(deedTowardFlagLocal(commitment.target.id, family, band, "landed"));
    }
    return { kind: "flag", set: markedFlags(flags, campaign.turn) };
}
// Kept byte-for-byte identical to deeds.ts's `deedFlag`/`deedTowardFlag` —
// see the import comment above for why this file cannot call those directly.
function deedFlagLocal(family, band, outcome) {
    return `deed:${family}:${band}:${outcome}`;
}
function deedTowardFlagLocal(nation, family, band, outcome) {
    return `deed-toward:${nation}:${family}:${band}:${outcome}`;
}
function forceShortfall(campaign, draft) {
    if (draft.source.kind !== "orderOfBattle")
        return undefined;
    const { branch, unitType, count } = draft.source;
    const order = selectNation(campaign, draft.actor)?.stats.military.orderOfBattle;
    // No authored decomposition is not an empty one. A nation that has never had
    // its formations written down is not a nation with no formations, and
    // refusing it here would make authoring depth into a capability.
    if (!order)
        return undefined;
    const held = order[branch].units?.find((unit) => unit.type === unitType)?.count ?? 0;
    const free = held - unitsSpokenFor(campaign, draft.actor, branch, unitType);
    if (count <= free)
        return undefined;
    return `The ${branch} has ${free} of ${held} ${forceAssetNoun(unitType, held)} uncommitted; this needs ${count}.`;
}
/** How many of one formation a government already has promised somewhere. */
function unitsSpokenFor(campaign, actor, branch, unitType) {
    return Object.values(campaign.commitments)
        .filter((existing) => existing.actor === actor &&
        existing.status === "active" &&
        existing.source.kind === "orderOfBattle" &&
        existing.source.branch === branch &&
        existing.source.unitType === unitType)
        .reduce((total, existing) => total + (existing.source.kind === "orderOfBattle" ? existing.source.count : 0), 0);
}
/**
 * Suspend, resume or wind down a commitment.
 *
 * Winding one down is a decision with a document rather than a slider, so the
 * caller states its reason and the packet narrates it — a country whose aid
 * was cut finds out that it was cut, and by whom.
 */
export function setCommitmentStatus(campaign, id, status, reason) {
    const current = campaign.commitments[id];
    if (!current)
        return { ok: false, reason: `No such commitment: ${id}.` };
    if (current.status === status)
        return { ok: false, reason: "That commitment already stands as it is." };
    // Forces sent under an order stay as long as the order does: the order is
    // the legal instrument a court reviews, and ending the mission without it
    // would leave a signed order with nothing under it.
    if (current.authorizedBy)
        return { ok: false, reason: "Rescind the order that sent them." };
    if (current.status === "wound-down")
        return { ok: false, reason: "A commitment that has been wound down cannot be reopened; open a new one." };
    const next = {
        ...current,
        status,
        ...(status === "wound-down" ? { endedTurn: campaign.turn } : {}),
    };
    const grudge = withdrawalGrudge(campaign, current, status);
    // The deed is a fact on the record — that the government pulled back — and
    // the grudge above is a feeling the target forms about it; they are stamped
    // off the same `isEarlyWithdrawal` test because they answer to the same
    // act, but they cannot double-count anything, because they are not the same
    // kind of effect. A flag effect never touches a metric or a relationship,
    // and `withdrawalGrudge` never touches a flag — one write to
    // `campaign.player.flags`, a separate write to `campaign.relationships`,
    // neither reads the other's output. A campaign with `withdrawalGrudge`
    // reverted to a no-op still carries the deed, and one without the deed still
    // carries the grudge: the two are independent facts about the same act, not
    // one cost counted twice.
    const deed = isEarlyWithdrawal(current, status) ? commitmentDeed(campaign, current, "withdrawal") : undefined;
    const effects = [{ kind: "commitment", set: next }];
    if (grudge)
        effects.push(grudge);
    if (deed)
        effects.push(deed);
    return {
        ok: true,
        packet: {
            source: "action",
            actor: current.actor === campaign.founding.nation ? "player" : "world",
            turn: campaign.turn,
            narration: { summary: `${statusVerb(status)} ${describeCommitment(current, campaign)}. ${reason}` },
            effects,
        },
    };
}
// Winding down or suspending a commitment by hand is a choice with a document
// behind it, the kind commitmentPhase's automatic lapse at a stated end date
// never is — a term that ran to its own review date was a promise kept, not
// broken, so it earns no grudge here. What does is a live promise a country
// was relying on being cut off before its own paper said it would end: the
// target notices exactly what was still owed to it.
const EARLY_WITHDRAWAL_STATUSES = ["suspended", "wound-down"];
// Shared by the grudge and the deed: was this call actually pulling back on a
// commitment that was standing, rather than shelving one that was never
// begun (`proposed`) or reopening one already closed? Both readers need the
// same yes/no here, and only the grudge additionally asks how much was cut
// short — a question the deed does not need answered, because a deed does not
// grade the act, it just records that it happened.
function isEarlyWithdrawal(current, next) {
    return EARLY_WITHDRAWAL_STATUSES.includes(next) && (current.status === "active" || current.status === "suspended");
}
function withdrawalGrudge(campaign, current, next) {
    if (current.target.kind !== "nation")
        return undefined;
    if (!isEarlyWithdrawal(current, next))
        return undefined;
    const targetId = current.target.id;
    if (!selectRelationship(campaign, targetId, current.actor))
        return undefined;
    const cutShort = remainingTermFraction(current, campaign.turn);
    if (cutShort <= 0)
        return undefined; // its own paper said it should have ended by now — nothing broken
    const gdp = selectNation(campaign, current.actor)?.stats.economy.gdp ?? 0;
    // A commitment is opened at a stated share of the actor's own GDP (see
    // standingCommitment in instruments.ts); reading amountPerTurn back against
    // that same GDP recovers how big the promise was. Authored shares run from
    // roughly one part in six hundred thousand to one part in a hundred and
    // fifty thousand of GDP per week, so SIZE_SCALE brings that range up to
    // where it can actually move a grudge weight instead of rounding to zero.
    const sizeFactor = gdp > 0 ? clamp01((current.resource.amountPerTurn / gdp) * SIZE_SCALE) : 0;
    // Suspending can still be reversed; winding down cannot, so it is judged
    // the harsher of the two.
    const severityFactor = next === "wound-down" ? 1 : 0.5;
    const weight = clamp01(sizeFactor * cutShort * severityFactor);
    if (weight <= 0)
        return undefined;
    const vengefulness = selectNation(campaign, targetId)?.traits.vengefulness ?? 0.5;
    return {
        kind: "relationship",
        from: targetId,
        to: current.actor,
        deltas: { trust: -weight * TRUST_SCALE, tension: weight * TENSION_SCALE },
        addGrudge: createGrudge("commitment-withdrawn", weight, campaign.turn, vengefulness),
    };
}
// How much of the promised term was still ahead of it. A standing commitment
// named no end date, so cutting it off breaks the whole open-ended promise —
// the maximum. A commitment given a term is judged by how much of that term
// remained; one stopped at or after its own end date had nothing left to owe.
function remainingTermFraction(commitment, turn) {
    if (commitment.review === "standing")
        return 1;
    const { endsTurn } = commitment.review;
    const total = endsTurn - commitment.startedTurn;
    if (total <= 0)
        return 0;
    return clamp01((endsTurn - turn) / total);
}
// Whether the hardship a commitment was opened to answer is still open, read
// only off the one condition it was named against at open time — see
// `Commitment.addressedCondition`'s own comment for why the target's whole
// condition list is refused here. No named condition reads as "cannot say",
// the same as a condition that has since resolved: both cost nothing.
function lapseNeedStillStands(campaign, commitment) {
    const need = commitment.addressedCondition;
    if (!need)
        return false;
    return selectConditionsFor(campaign, need.nation).some((condition) => condition.kind === need.kind);
}
// Owed only when the term ran out on a need that is still live; kept below
// any deliberate withdrawal's floor (0.5, a mere suspension) by construction,
// because letting a promise quietly run out is a lesser act than choosing to
// cut it off, and the design that grudge was built on is worth keeping. A
// lapse has no "how much was cut short" question the way `withdrawalGrudge`
// does — `remainingTermFraction` is 0 for a lapse by its own definition — so
// size is the only input a lapse's weight can honestly have.
const LAPSE_SEVERITY = 0.35;
function lapseGrudge(campaign, commitment) {
    if (commitment.target.kind !== "nation")
        return undefined;
    if (!lapseNeedStillStands(campaign, commitment))
        return undefined;
    const targetId = commitment.target.id;
    if (!selectRelationship(campaign, targetId, commitment.actor))
        return undefined;
    const gdp = selectNation(campaign, commitment.actor)?.stats.economy.gdp ?? 0;
    const sizeFactor = gdp > 0 ? clamp01((commitment.resource.amountPerTurn / gdp) * SIZE_SCALE) : 0;
    const weight = clamp01(sizeFactor * LAPSE_SEVERITY);
    if (weight <= 0)
        return undefined;
    const vengefulness = selectNation(campaign, targetId)?.traits.vengefulness ?? 0.5;
    return {
        kind: "relationship",
        from: targetId,
        to: commitment.actor,
        deltas: { trust: -weight * TRUST_SCALE, tension: weight * TENSION_SCALE },
        addGrudge: createGrudge("commitment-lapsed", weight, campaign.turn, vengefulness),
    };
}
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const SIZE_SCALE = 50_000;
const TRUST_SCALE = 0.3;
const TENSION_SCALE = 0.2;
function statusVerb(status) {
    switch (status) {
        case "active":
            return "The administration resumes";
        case "suspended":
            return "The administration suspends";
        case "wound-down":
            return "The administration winds down";
        case "proposed":
            return "The administration tables";
    }
}
const KIND_WORDS = {
    aid: "an assistance package to",
    arms: "an arms transfer to",
    deployment: "a deployment to",
    basing: "a basing arrangement with",
    sustainment: "the sustainment of",
    program: "a standing program toward",
};
const ORG_NAMES = new Map(organizations.map((org) => [org.id, org.name]));
// The target named as a reader would name it. Without the campaign only the id
// is known, which is what a caller that has no board to read gets back.
function targetName(target, campaign) {
    if (!campaign)
        return target.id;
    if (target.kind === "nation")
        return selectNation(campaign, target.id)?.base.identity.name ?? target.id;
    if (target.kind === "org")
        return ORG_NAMES.get(target.id) ?? target.id;
    if (target.kind === "state")
        return campaign.states[target.id]?.base.name ?? target.id;
    const conflict = campaign.conflicts[target.id];
    if (!conflict)
        return target.id;
    const name = (id) => selectNation(campaign, id)?.base.identity.name ?? id;
    return `the war between ${name(conflict.aggressor)} and ${name(conflict.defender)}`;
}
export function describeCommitment(commitment, campaign) {
    return `${KIND_WORDS[commitment.kind]} ${targetName(commitment.target, campaign)}`;
}
function openingSummary(commitment, campaign) {
    const review = commitment.review === "standing" ? "with no end date set" : `through week ${commitment.review.endsTurn}`;
    return `The administration commits ${describeCommitment(commitment, campaign)}, ${review}. ${commitment.rationale}`;
}
/**
 * A week of everything the administration is carrying.
 *
 * One packet for all of them rather than one each: a president does not get a
 * separate bill for every promise, they get the week's total, and a ledger
 * with forty entries a week in it is a ledger nobody reads. What the packet
 * says is what a treasury statement says — the total, and how many promises it
 * is the total of.
 */
export const commitmentPhase = (state) => {
    const standing = activeCommitments(state, state.founding.nation);
    const due = standing.filter((commitment) => !expired(state, commitment));
    const lapsed = standing.filter((commitment) => expired(state, commitment));
    const effects = lapsed.map((commitment) => ({
        kind: "commitment",
        set: { ...commitment, status: "wound-down", endedTurn: state.turn },
    }));
    // A term that ran out is not an act the government performed — see
    // `EARLY_WITHDRAWAL_STATUSES`'s own comment — so it never stamps the
    // withdrawal deed `setCommitmentStatus` stamps for a hand-called wind-down;
    // there is nothing here to record as an act, only, sometimes, a gap the
    // recipient feels. `lapseGrudge` is that second, narrower thing, and it is
    // the only effect a lapse can add.
    for (const commitment of lapsed) {
        const grudge = lapseGrudge(state, commitment);
        if (grudge)
            effects.push(grudge);
    }
    // Money is charged in the week's share of the annual figure, the same
    // proration every other per-turn cost in the engine uses, so a commitment and
    // a policy stance cost comparable amounts for comparable promises.
    const money = due
        .filter((commitment) => commitment.resource.spec.kind === "currency")
        .reduce((total, commitment) => total + commitment.resource.amountPerTurn, 0)
        + lapsed.reduce((total, commitment) => total + minimumOwed(state, commitment), 0);
    const deltas = {};
    // A promise the authority cannot carry is short-funded, not forgiven: the
    // part left unpaid is paid in stability, at the budget's own arrears rate.
    const paid = Math.min(money, Math.max(0, state.player.metrics.treasury));
    const shortfall = money - paid;
    if (paid > 0)
        deltas.treasury = -Math.round(paid);
    if (shortfall > 0) {
        const gdp = Math.max(1, state.nations[state.founding.nation]?.stats.economy.gdp ?? 1);
        deltas.stability = -round3(((shortfall * TURNS_PER_YEAR) / gdp) * ARREARS_STABILITY_COST);
    }
    // Standing promises are standing evidence that a government keeps its word,
    // which is the one thing they buy that nothing else does.
    // A promise the administration inherited at the oath — a base, the Gulf
    // posture — is not evidence of this government's word; only its own are.
    // Nor is a deployment into one of its own states: nobody abroad was promised it.
    const kept = due.filter((commitment) => commitment.startedTurn > 0 && commitment.target.kind !== "state");
    if (kept.length > 0)
        deltas.standing = round3(Math.min(0.01, 0.002 * kept.length));
    if (Object.keys(deltas).length > 0)
        effects.push({ kind: "metric", deltas });
    if (effects.length === 0)
        return [];
    return [
        {
            source: "simulate",
            actor: "player",
            turn: state.turn + 1,
            narration: { summary: phaseSummary(due.length, money, lapsed.length) },
            effects,
        },
    ];
};
/**
 * The fewest weeks a mission is billed once ordered. Troops and a federalized
 * Guard are mobilized, moved and housed before the first week on the street,
 * and that is paid whether or not the order stands; a President who rescinds
 * in the first week still pays for the second.
 */
export const MISSION_MINIMUM_WEEKS = 2;
/**
 * What a mission rescinded inside its minimum still owes. A court's pause or
 * strike-down owes nothing: the government did not choose to end it.
 */
function minimumOwed(campaign, commitment) {
    if (!commitment.authorizedBy || commitment.resource.spec.kind !== "currency")
        return 0;
    const record = campaign.orders.find((entry) => entry.id === commitment.authorizedBy);
    if (record?.rescindedTurn === undefined || record.review?.status === "struck-down" || isOrderCourtSuspended(campaign, record.id))
        return 0;
    const served = campaign.turn - commitment.startedTurn;
    return Math.max(0, MISSION_MINIMUM_WEEKS - served) * commitment.resource.amountPerTurn;
}
function expired(campaign, commitment) {
    if (commitment.authorizedBy && prospectiveOrderAuthority(campaign, commitment.authorizedBy) !== "operative")
        return true;
    return commitment.review !== "standing" && campaign.turn >= commitment.review.endsTurn;
}
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
function phaseSummary(kept, money, lapsed) {
    if (kept === 0 && lapsed > 0)
        return `${lapsed === 1 ? "A commitment reaches" : `${lapsed} commitments reach`} the end of its term and lapses.`;
    const bill = money > 0 ? `, at ${Math.round(money).toLocaleString("en-US")} million this week` : "";
    const ending = lapsed > 0 ? ` ${lapsed} reaches the end of its term.` : "";
    return `The government keeps ${kept} standing commitment${kept === 1 ? "" : "s"}${bill}.${ending}`;
}
/**
 * The commitments a war was carrying, ended because the war has.
 *
 * A rung-5 act opens a conflict and, in the same packet, a sustainment
 * commitment against the country it is being fought with. Ending a war has to
 * release both, or the force stays committed, the order of battle stays short
 * of it, and the treasury goes on paying to sustain a front that no longer
 * exists for the rest of the campaign, because a `standing` review never lapses
 * on its own.
 *
 * Both halves of "tied to this war" are released: a commitment made against the
 * conflict itself, and a fighting commitment against the counterpart. Aid,
 * arms, basing and standing programs toward that country are deliberately left
 * alone — a guarantee or an assistance package outlives the war it was made
 * during, and winding those down is a decision with a document behind it.
 */
const WAR_BORNE_KINDS = ["deployment", "sustainment"];
export function releaseWarCommitments(campaign, conflictId, belligerents, reason) {
    const parties = new Set(belligerents.map((id) => id));
    const ours = activeCommitments(campaign, campaign.founding.nation).filter((commitment) => towardConflict(commitment, conflictId) ||
        (commitment.target.kind === "nation" && parties.has(commitment.target.id) && WAR_BORNE_KINDS.includes(commitment.kind)));
    // Another government's forces committed to the war come home with it too,
    // or its order of battle stays short of a front that no longer exists.
    const theirs = Object.values(campaign.commitments)
        .filter((commitment) => commitment.actor !== campaign.founding.nation && commitment.status === "active" && towardConflict(commitment, conflictId))
        .sort((a, b) => a.id.localeCompare(b.id));
    return [...ours, ...theirs].map((commitment) => windDown(commitment, campaign.turn, reason));
}
function towardConflict(commitment, conflictId) {
    return commitment.target.kind === "conflict" && commitment.target.id === conflictId;
}
function windDown(commitment, turn, reason) {
    return { kind: "commitment", set: { ...commitment, status: "wound-down", endedTurn: turn, rationale: reason } };
}
/**
 * What one party that leaves a war takes home with it: the forces it
 * committed to that war. The President's country also releases the fighting
 * it committed against the side it was fighting, the rule a war's end holds
 * it to.
 */
export function releaseCommitmentsOf(campaign, conflictId, nation, against, reason) {
    if (nation === campaign.founding.nation)
        return releaseWarCommitments(campaign, conflictId, [against], reason);
    return activeCommitments(campaign, nation)
        .filter((commitment) => towardConflict(commitment, conflictId))
        .map((commitment) => windDown(commitment, campaign.turn, reason));
}
// --- Another government's forces in a war it joined ---
//
// A government that goes into a war goes in with something, and until this
// existed the war file could only say "no commitment on record" beside every
// joiner. Sized from the joiner's own means rather than from any figure the
// administration's rungs use, because Estonia and Poland do not send the same
// corps. Never billed: the treasury a commitment is drawn on is the
// administration's, and there is no second one for the world.
/** How much of its land force, and of its defense budget, a government that joins a war puts into it (planning value). */
const JOINER_FORCE_SHARE = 0.25;
/** The land formation that holds most of a government's soldiers, and how many of it are still free. */
function landBackbone(campaign, nation) {
    const units = selectNation(campaign, nation)?.stats.military.orderOfBattle?.army.units ?? [];
    const backbone = [...units].sort((a, b) => forceAssetPersonnel(b.type, b.count) - forceAssetPersonnel(a.type, a.count) || a.type.localeCompare(b.type))[0];
    if (!backbone)
        return undefined;
    return { type: backbone.type, free: backbone.count - unitsSpokenFor(campaign, nation, "army", backbone.type) };
}
/**
 * Where the joiner's forces are drawn from: named formations where its order
 * of battle is written down, otherwise its defense budget. A dataset that never
 * decomposed a country's army has not made that army nothing, and refusing it
 * a commitment would make authoring depth into a capability.
 */
function joinerSource(campaign, nation) {
    const backbone = landBackbone(campaign, nation);
    if (!backbone)
        return { kind: "budgetLine", line: "defense" };
    if (backbone.free <= 0)
        return undefined;
    const count = Math.min(backbone.free, Math.max(1, Math.round(backbone.free * JOINER_FORCE_SHARE)));
    return { kind: "orderOfBattle", branch: "army", unitType: backbone.type, count };
}
/** The forces a government commits to a war it has just joined, or nothing where every formation it names is spoken for. */
export function joinerCommitment(campaign, nation, conflictId) {
    if (nation === campaign.founding.nation)
        return undefined;
    const runtime = selectNation(campaign, nation);
    const source = runtime ? joinerSource(campaign, nation) : undefined;
    if (!runtime || !source)
        return undefined;
    const draft = {
        kind: "deployment",
        actor: nation,
        target: { kind: "conflict", id: conflictId },
        resource: {
            spec: { kind: "currency", scale: 6, suffix: "USD" },
            amountPerTurn: Math.round((runtime.stats.military.budget * JOINER_FORCE_SHARE) / TURNS_PER_YEAR),
        },
        source,
        review: "standing",
        rationale: "Forces sent into the war it joined.",
    };
    return {
        id: commitmentId(draft, campaign.turn),
        kind: draft.kind,
        actor: draft.actor,
        target: draft.target,
        resource: draft.resource,
        source: draft.source,
        startedTurn: campaign.turn,
        review: draft.review,
        status: "active",
        rationale: draft.rationale,
        ...located(campaign, draft),
    };
}
/**
 * The commitment a government owes a war it joined and has not yet backed
 * with forces, when it acts against the side it is fighting. Nothing where it
 * is fighting no such war, or already has forces in it.
 */
export function joinedWarCommitment(campaign, actor, target) {
    const war = Object.values(campaign.conflicts)
        .filter((conflict) => conflict.status === "active")
        .sort((a, b) => a.id.localeCompare(b.id))
        .find((conflict) => {
        const side = ["aggressor", "defender"].find((each) => conflict.joined[each].includes(actor));
        if (side === undefined)
            return false;
        const enemies = side === "aggressor" ? [conflict.defender, ...conflict.joined.defender] : [conflict.aggressor, ...conflict.joined.aggressor];
        return enemies.includes(target);
    });
    if (!war || activeCommitments(campaign, actor).some((commitment) => towardConflict(commitment, war.id)))
        return [];
    const committed = joinerCommitment(campaign, actor, war.id);
    return committed ? [{ kind: "commitment", set: committed }] : [];
}
/** What the week of commitments costs, for a screen that has to preview it. */
export function commitmentWeeklyCost(campaign) {
    return Math.round(activeCommitments(campaign, campaign.founding.nation)
        .filter((commitment) => commitment.resource.spec.kind === "currency")
        .reduce((total, commitment) => total + commitment.resource.amountPerTurn, 0));
}
