import { outreachAttentionSpent, OUTREACH_DAILY_LIMIT } from "./lobbying-person.js";
import { selectBillsInProgress, selectPerson } from "./state.js";
import { chamberDisposition, selectHillMember } from "./hill.js";
import { CHAMBER_NAMES } from "./congress.js";
import { addDays, compareDates } from "./clock.js";
import { headOfGovernmentTitle, sentenceCase } from "./naming.js";
import { createRngStreams } from "./rng.js";
import { actOf } from "./legislative-acts.js";
import { advocateTerms, lobbyAdvocate } from "./lobbying-advocate.js";
import { accountOf, delayDaysFor, lobbyForecast, playCopy, reasonFor } from "./lobbying-copy.js";
import { CAMPAIGN_TRUST, NO_CREDIT_TO_SHARE, NO_HOME_STATE, PUBLIC_MISS_GRUDGE, REPEAT_CALL_CAUSE, campaignCharge, creditFiling, creditMatter, homeAlignment, peopleResenting, publicAppealRefusal, repeatCallPenalty, resentmentEffects, resentmentsFor, } from "./lobbying-person.js";
import { SHARED_CREDIT_FRACTION } from "./credit-share.js";
import { noiseFrom, projectWillingness, stampOf, weigh, } from "./willingness.js";
import { draftLobbyFavor, eligibleFiscalMatter, fiscalMatterForBill, lobbyFavorAvailability, } from "./lobbying-favors.js";
import { NEUTRAL_TRUST, figureRapport, personalGrudgeWeight, tieOf, withRapportRead } from "./ties.js";
export const LOBBY_PLAYS = {
    call: {
        approach: "call",
        name: "Private call",
        summary: "A specific request, made directly, that goodwill does not have to become a vote.",
        cost: { standing: -0.01 },
        backfire: {},
        gain: 0.07,
        loss: -0.01,
    },
    trade: {
        approach: "trade",
        name: "Budget negotiation",
        summary: "A political commitment on the next appropriation, not money leaving the treasury today.",
        cost: {},
        backfire: { standing: -0.03 },
        gain: 0.13,
        loss: -0.02,
    },
    public: {
        approach: "public",
        name: "Public appeal",
        summary: "Take the argument to their own voters. The chamber watches, and a miss can leave you worse off.",
        cost: { standing: -0.02 },
        backfire: { standing: -0.06, stability: -0.02 },
        gain: 0.11,
        loss: -0.14,
    },
    credit: {
        approach: "credit",
        name: "Share the credit",
        summary: "Put their name on a live bill. The credit it earns when it becomes law is partly theirs.",
        cost: {},
        backfire: {},
        // A member handed the credit is warmer whether or not they give the vote for it.
        gain: 0.12,
        loss: 0.03,
    },
    campaign: {
        approach: "campaign",
        name: "Campaign at home",
        summary: "Stand beside them in their own state. Your name and your standing there are what it costs.",
        cost: { standing: -0.02 },
        backfire: {},
        gain: 0.14,
        loss: 0.04,
    },
};
/** The order a screen lists them in: cheapest first, the ones that spend the President's own credit last. */
export const LOBBY_APPROACH_ORDER = ["call", "trade", "public", "credit", "campaign"];
/** Going public moves the room as well as the member. It is the only one that does. */
export const PUBLIC_ROOM_GAIN = 0.02;
export const PUBLIC_ROOM_LOSS = -0.04;
/**
 * How long the country remembers the last time this administration went to it
 * about a member of Congress.
 *
 * A president who does it every third week is not campaigning, they are
 * complaining, and the audience prices it accordingly.
 */
export const PUBLIC_APPEAL_MEMORY_TURNS = 10;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/**
 * How well the president handles one person in a room.
 *
 * The same charisma and competence the podium reads, because persuading a
 * Speaker and persuading a press corps are the same skill applied to different
 * numbers of people, and a second reading of the president would be a second
 * president.
 */
function persuasion(campaign) {
    const seated = campaign.player.cabinet[campaign.founding.leadRole];
    const president = seated ? selectPerson(campaign, seated) : undefined;
    if (!president)
        return 0.5;
    return clamp01(president.base.charisma * 0.6 + president.base.competence * 0.4);
}
/** How much of the last few weeks' public appeals is still being priced in. */
function publicFatigue(campaign) {
    const recent = campaign.congress.lobbying.filter((record) => record.approach === "public" && campaign.turn - record.turn < PUBLIC_APPEAL_MEMORY_TURNS);
    return Math.min(0.3, recent.length * 0.1);
}
/**
 * A member who has already been called this month is a member who knows what
 * the call is for. Not a refusal — a discount, and one the projection shows.
 */
function recentAttention(campaign, post) {
    const recent = campaign.congress.lobbying.filter((record) => record.post === post && campaign.turn - record.turn < 4);
    return Math.min(0.24, recent.length * 0.08);
}
/**
 * What the member brings to the question, and what the ask has to clear.
 *
 * The same numbers the projection always read, said in the vocabulary the rest
 * of the government's decisions are said in: the member's own terms are the
 * member's own — their disposition, their ambition, their integrity, and, on a
 * public appeal, how this administration stands where they have to be
 * re-elected — and everything about the *asking* is the threshold. A member who
 * refuses can now be asked why, and the answer is a list the player can check
 * rather than a percentage.
 *
 * The band a score has to clear is centered on a half, so the willingness this
 * returns and the chance the roll reads are the same figure twice.
 */
const ASK_BAND = 0.5;
function memberTerms(campaign, member, approach, creditBill) {
    // A public appeal is not won in the member's office; it is won in the country,
    // so charm and the member's own calculation give way to where their voters are.
    if (approach === "public") {
        return [{ key: "standing-at-home", source: "situation", value: standingAtHome(campaign, member) }];
    }
    const person = member.person;
    return [
        // Remembered injuries belong in this term so preview and resolution charge them once.
        { key: "disposition", source: "situation", value: (figureRapport(campaign.people, member.figure) - 0.5) * 0.4 - 0.2 * clamp01(personalGrudgeWeight(campaign, member.figure.person)) },
        // An ambitious member with a career of their own is the hard one.
        { key: "ambition", source: "trait", value: person ? (0.5 - person.ambition) * 0.2 : 0 },
        { key: "integrity", source: "trait", value: person ? (person.integrity - 0.5) * -0.1 : 0 },
        ...advocateTerms(campaign, member, approach, askedAbout(campaign, approach, creditBill)),
    ];
}
/**
 * How this administration stands in the state the member answers to.
 *
 * A public appeal asks a member's own voters to lean on them, so the only thing
 * that decides it is whether those voters are the President's to ask. Read off
 * the state's lean toward the administration — the same reading every other
 * state-level judgment uses — and zero for a member whose home state is not on
 * the record, which is a fact about the cast rather than a neutral state.
 */
function standingAtHome(campaign, member) {
    const alignment = homeAlignment(campaign, member);
    if (alignment === undefined)
        return 0;
    return round3(HOME_STANDING_WEIGHT * alignment);
}
/**
 * The bill a private ask is about, which decides who in the cabinet makes the
 * case for it. A campaign stop is the President in the member's state, not a
 * Secretary in their office, so nobody pitches a bill there.
 */
function askedAbout(campaign, approach, creditBill) {
    if (approach === "campaign")
        return undefined;
    if (approach === "trade")
        return tradeMatter(campaign)?.billId;
    if (approach === "credit")
        return creditBill ?? creditMatter(campaign)?.billId;
    return liveMatter(campaign)?.billId;
}
/** What the member's own state is worth to a public appeal, either way. */
const HOME_STANDING_WEIGHT = 0.15;
/** What the ask itself has to clear: the play, the President's skill, and how often they have called. */
function askThreshold(campaign, member, approach) {
    return round3(ASK_BAND - (askStrength(campaign, approach) - recentAttention(campaign, post(member))));
}
/**
 * How strong the ask is before the member weighs it. Credit and a campaign stop
 * ask more of the President than a call and less of the member than a deal, so
 * they sit between the two, and the President's skill matters less to them
 * because the thing offered speaks for itself.
 */
function askStrength(campaign, approach) {
    const skill = persuasion(campaign);
    if (approach === "trade")
        return 0.5 + skill * 0.15;
    if (approach === "call")
        return 0.3 + skill * 0.4;
    if (approach === "credit")
        return 0.45 + skill * 0.3;
    if (approach === "campaign")
        return 0.5 + skill * 0.25;
    return 0.15 + campaign.player.metrics.approval * 0.5 + campaign.press.standing * 0.3 - publicFatigue(campaign);
}
/** The member's answer before the draw, which is what a card may say out loud. */
function memberWillingness(campaign, member, approach, creditBill) {
    return projectWillingness("lobbied-member", memberTerms(campaign, member, approach, creditBill), {
        threshold: askThreshold(campaign, member, approach),
        // The draw is the whole of the band: everything this model does not see
        // about how a member answers a private ask on a given afternoon.
        noiseBound: ASK_BAND,
    });
}
function successChance(campaign, member, approach, creditBill) {
    return round3(clamp01(ASK_BAND + memberWillingness(campaign, member, approach, creditBill).margin));
}
/**
 * The member's answer, with the afternoon in it.
 *
 * The draw's sign is reversed on the way in: the band is symmetric, so this is
 * the same distribution either way, and reversing it keeps the answer this play
 * gave on a given seed the answer it gave before the model was written down.
 */
function memberAnswer(campaign, member, approach, draw, creditBill) {
    return weigh("lobbied-member", memberTerms(campaign, member, approach, creditBill), {
        threshold: askThreshold(campaign, member, approach),
        noiseBound: ASK_BAND,
        noise: -noiseFrom(draw, ASK_BAND),
    });
}
const post = (member) => member.figure.post;
function projectedChamber(campaign, figure, rapport, roomShift, readings) {
    const moved = {
        ...campaign.congress,
        disposition: round3(clamp01(campaign.congress.disposition + roomShift)),
    };
    return chamberDisposition(moved, figure.chamber, readings.states, withRapportRead(readings.people, figure.person, rapport));
}
function liveMatter(campaign) {
    const bill = selectBillsInProgress(campaign)[0];
    return bill ? { billId: bill.id, title: bill.title } : undefined;
}
function tradeMatter(campaign) {
    return eligibleFiscalMatter(campaign);
}
function roomShiftFor(approach, landed) {
    if (approach !== "public")
        return 0;
    return landed ? PUBLIC_ROOM_GAIN : PUBLIC_ROOM_LOSS;
}
function matterFor(campaign, approach, fiscal, frozen) {
    if (approach === "trade")
        return fiscal ? { billId: fiscal.billId, title: fiscal.title } : undefined;
    // Once credit is filed the bill no longer offers it, so the answer reads the bill the card was about.
    if (approach === "credit")
        return frozen ? frozen.matter : creditMatter(campaign);
    return liveMatter(campaign);
}
function blockedFor(campaign, member, approach, fiscal, matter, charge) {
    if (approach === "trade") {
        if (!fiscal)
            return "No eligible appropriation project is on the floor.";
        const availability = lobbyFavorAvailability(campaign, fiscal, post(member));
        return availability.ok ? undefined : availability.reason;
    }
    if (approach === "public")
        return publicAppealRefusal(campaign, member);
    if (approach === "credit")
        return matter ? undefined : NO_CREDIT_TO_SHARE;
    if (approach === "campaign")
        return charge ? undefined : NO_HOME_STATE;
    return undefined;
}
/**
 * The people and states the chamber is read from once the play has landed or
 * missed: the resentments already charged, and a campaign stop's lean.
 */
function readingsAfter(campaign, resentments, charge) {
    const people = peopleResenting(campaign.people, resentments);
    if (!charge)
        return { people, states: campaign.states };
    const runtime = campaign.states[charge.state];
    return { people, states: runtime ? { ...campaign.states, [charge.state]: { ...runtime, lean: charge.leanAfter } } : campaign.states };
}
function trustFigures(campaign, member, approach) {
    if (approach !== "campaign")
        return {};
    const trust = tieOf(campaign.people, member.figure.person)?.trust ?? NEUTRAL_TRUST;
    return { trustIfGood: round3(clamp01(trust + CAMPAIGN_TRUST.landed)), trustIfBad: round3(clamp01(trust + CAMPAIGN_TRUST.missed)) };
}
/** What the play costs beyond the member, said on the projection so the card can show it. */
function costsBeyond(approach, matter, repeat, charge) {
    return {
        ...(repeat !== 0 ? { repeatCall: repeat } : {}),
        ...(approach === "public" ? { grudgeIfMissed: PUBLIC_MISS_GRUDGE } : {}),
        ...(approach === "credit" && matter ? { credit: { ...matter, fraction: SHARED_CREDIT_FRACTION } } : {}),
        ...(charge ? { campaign: charge } : {}),
    };
}
/**
 * What the player reads before spending. Pure and seed-independent, the same
 * contract every projection in the engine holds: `issueLobbying` calls this and
 * nothing else for the odds and the prices, so the number shown is the number
 * rolled against and charged. `frozen` is what an authorized play fixed at
 * issuance, passed back when it is answered.
 */
export function projectLobbying(campaign, target, approach, frozen) {
    const member = selectHillMember(campaign, target);
    if (!member)
        return undefined;
    const play = LOBBY_PLAYS[approach];
    const title = sentenceCase(headOfGovernmentTitle(campaign.founding.leadRole));
    const fiscal = approach === "trade" ? tradeMatter(campaign) : undefined;
    const matter = matterFor(campaign, approach, fiscal, frozen);
    const chance = successChance(campaign, member, approach, matter?.billId);
    const repeat = approach === "call" ? (frozen ? frozen.repeatCall : repeatCallPenalty(campaign, target, matter !== undefined, campaign.turn)) : 0;
    const rapport = figureRapport(campaign.people, member.figure);
    const good = round3(clamp01(rapport + play.gain + repeat));
    const bad = round3(clamp01(rapport + play.loss + repeat));
    const charge = approach === "campaign" ? campaignCharge(campaign, member, title) : undefined;
    const blocked = blockedFor(campaign, member, approach, fiscal, matter, charge);
    const resentments = resentmentsFor(campaign, member, approach, title, matter?.title);
    const ifGood = readingsAfter(campaign, resentments, charge);
    // A budget negotiation nobody accepted is a deal nobody has to resent.
    const ifBad = approach === "trade" ? readingsAfter(campaign, [], charge) : ifGood;
    const copy = playCopy(approach, member, matter, fiscal, blocked);
    return {
        approach,
        play: { ...play, summary: copy.summary, name: play.name },
        post: target,
        target: member.name,
        successChance: chance,
        rapportIfGood: good,
        rapportIfBad: bad,
        chamberBefore: chamberDisposition(campaign.congress, member.figure.chamber, campaign.states, campaign.people),
        chamberIfGood: projectedChamber(campaign, member.figure, good, roomShiftFor(approach, true), ifGood),
        chamberIfBad: projectedChamber(campaign, member.figure, bad, roomShiftFor(approach, false), ifBad),
        reasoning: blocked ?? reasonFor(approach, chance, member),
        forecast: lobbyForecast(campaign, member, approach, chance),
        counterpart: { id: target, willingness: memberWillingness(campaign, member, approach, matter?.billId) },
        ...(matter ? { matter } : {}),
        ...(copy.offer ? { offer: copy.offer } : {}),
        ...(blocked ? { blocked } : {}),
        delayDays: delayDaysFor(approach),
        footer: copy.footer,
        resentments,
        ...trustFigures(campaign, member, approach),
        ...costsBeyond(approach, matter, repeat, charge),
    };
}
/** Every play, for a screen that has to put the prices beside each other. */
export function projectLobbyingOptions(campaign, target) {
    return LOBBY_APPROACH_ORDER.flatMap((approach) => {
        const projection = projectLobbying(campaign, target, approach);
        return projection ? [projection] : [];
    });
}
function pendingOn(campaign, target) {
    return Object.values(campaign.issuedActs ?? {}).find((act) => act.kind === "lobby" && act.post === target && (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"));
}
function alreadyWorked(campaign, target) {
    if (pendingOn(campaign, target))
        return true;
    return campaign.congress.lobbying.some((record) => record.turn === campaign.turn && record.post === target);
}
function actId(target, campaign) {
    return `issued:lobby:${target}:${campaign.turn}:${campaign.calendar.year}-${campaign.calendar.month}-${campaign.calendar.day}`;
}
/**
 * Authorize a play. The counterpart has not answered yet. Standing (and only
 * standing) can be spent at issuance; a budget negotiation does not move the
 * treasury until Congress appropriates it.
 */
export function issueLobbying(campaign, target, approach) {
    const projection = projectLobbying(campaign, target, approach);
    if (outreachAttentionSpent(campaign) >= OUTREACH_DAILY_LIMIT)
        return { ok: false, reason: "Today's presidential outreach time is already allocated." };
    if (!projection)
        return { ok: false, reason: "Nobody currently holds that seat on the Hill." };
    if (projection.blocked)
        return { ok: false, reason: projection.blocked };
    if (alreadyWorked(campaign, target)) {
        return { ok: false, reason: `${projection.target} is already being worked, or has already been worked this week.` };
    }
    const dueDate = addDays(campaign.calendar, projection.delayDays);
    const status = approach === "call" ? "awaiting-response" : "in-progress";
    const act = {
        id: actId(target, campaign),
        kind: "lobby",
        status,
        post: target,
        approach,
        issuedTurn: campaign.turn,
        issuedDate: campaign.calendar,
        dueDate,
        chance: projection.successChance,
        forecast: projection.forecast,
        ...(projection.matter ? { matter: projection.matter } : {}),
        ...(projection.offer ? { offer: projection.offer } : {}),
        ...(projection.repeatCall !== undefined ? { repeatCall: projection.repeatCall } : {}),
    };
    const effects = [{ kind: "issuedAct", set: act }];
    const upfront = projection.play.cost;
    if (Object.keys(upfront).length > 0)
        effects.push({ kind: "metric", deltas: upfront });
    effects.push(...chargedOnIssue(campaign, projection));
    const when = projection.delayDays === 1 ? "tomorrow" : `in ${projection.delayDays} days`;
    return {
        ok: true,
        projection,
        act,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: {
                summary: `${sentenceCase(headOfGovernmentTitle(campaign.founding.leadRole))} authorizes a ${projection.play.name.toLowerCase()} with ${projection.target}. The answer is due ${when}.`,
            },
            effects,
            provenance: { origin: "decision", entities: [target], systems: ["congress"] },
        },
    };
}
/**
 * What sharing credit and campaigning cost the moment the President acts,
 * whatever the member answers: the credit filed on the bill or the lean in their
 * state, and the people who resent it. A budget negotiation's resentment waits
 * for the deal, because an offer refused is not a deal anyone has to resent.
 */
function chargedOnIssue(campaign, projection) {
    if (projection.approach !== "credit" && projection.approach !== "campaign")
        return [];
    const member = selectHillMember(campaign, projection.post);
    const filing = member && projection.approach === "credit" && projection.matter ? creditFiling(campaign, member, projection.matter) : undefined;
    return [
        ...(filing ? [filing] : []),
        ...(projection.campaign?.effects ?? []),
        ...resentmentEffects(projection.resentments),
    ];
}
function resolveFromProjection(campaign, projection, act) {
    const member = selectHillMember(campaign, projection.post);
    const title = sentenceCase(headOfGovernmentTitle(campaign.founding.leadRole));
    const dayIndex = campaign.calendar.year * 10000 + campaign.calendar.month * 100 + campaign.calendar.day;
    const draw = createRngStreams(campaign.seed).stream("lobbying-outcome", dayIndex, projection.post).next();
    // The member's own answer decides it. With nobody in the seat — a post that
    // changed hands between the ask and the answer — there is no member to weigh,
    // and the projection's own chance is the honest fallback.
    const answer = member ? memberAnswer(campaign, member, projection.approach, draw, projection.matter?.billId) : undefined;
    const landed = answer ? answer.acts : draw < projection.successChance;
    const account = accountOf(projection.approach, projection.target, landed, title);
    const advocate = member ? lobbyAdvocate(campaign, member, projection.approach, projection.matter?.billId) : undefined;
    const actId = projection.matter ? actOf(campaign.bills[projection.matter.billId])?.id : undefined;
    const record = {
        id: `lobby:${projection.post}:${campaign.turn}`,
        post: projection.post,
        ...(member ? { member: member.figure.person } : {}),
        ...(projection.matter ? { billId: projection.matter.billId } : {}),
        ...(advocate?.person && member && actId ? { cooperation: [{ from: advocate.person.id, to: member.figure.person, actId, date: campaign.calendar, accepted: landed, account: "The department advocate made this bill's case during the recorded lobbying conversation." }] } : {}),
        approach: projection.approach,
        turn: campaign.turn,
        landed,
        account,
    };
    const roomShift = roomShiftFor(projection.approach, landed);
    const congress = {
        ...campaign.congress,
        disposition: round3(clamp01(campaign.congress.disposition + roomShift)),
        lobbying: [...campaign.congress.lobbying, record],
    };
    const resolved = { ...act, status: "resolved", outcome: { landed, account } };
    const effects = [
        { kind: "congress", set: congress },
        ...(member ? [memberMoved(campaign, projection, member, landed, record)] : []),
        ...(landed && projection.approach === "trade" ? resentmentEffects(projection.resentments) : []),
        { kind: "issuedAct", set: resolved },
    ];
    if (!landed && Object.keys(projection.play.backfire).length > 0) {
        effects.push({ kind: "metric", deltas: projection.play.backfire });
    }
    const chamber = member ? CHAMBER_NAMES[member.figure.chamber] : undefined;
    const aftermath = landed && chamber
        ? `${account} The whip marks ${chamber} a little closer.`
        : !landed && chamber
            ? `${account} The whip does not move ${chamber} on the strength of this.`
            : account;
    return {
        ok: true,
        projection,
        landed,
        record,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary: aftermath },
            effects,
            provenance: {
                origin: "scheduled",
                causeIds: [act.id],
                entities: [projection.post],
                systems: ["congress"],
                effectiveDate: campaign.calendar,
                // Why they answered the way they did, on the record with the answer. A
                // member's reasoning is public: they are answerable for it, which is the
                // difference between this and a foreign capital's.
                ...(answer && member
                    ? {
                        decision: stampOf(answer, member.person ? member.person.id : projection.post, projection.matter?.billId, "public"),
                    }
                    : {}),
            },
        },
    };
}
/**
 * What the play leaves with the member: their new rapport; on a landed budget
 * negotiation the favor the President now owes them; after a campaign stop
 * their trust; and after a public appeal that missed, the grudge.
 */
function memberMoved(campaign, projection, member, landed, record) {
    const rapport = landed ? projection.rapportIfGood : projection.rapportIfBad;
    return {
        kind: "tie",
        person: member.figure.person,
        cause: projection.repeatCall ? `${record.account} ${REPEAT_CALL_CAUSE}` : record.account,
        rapport: { set: rapport },
        ...(projection.approach === "campaign" ? { trust: { delta: landed ? CAMPAIGN_TRUST.landed : CAMPAIGN_TRUST.missed } } : {}),
        ...(landed && projection.approach === "trade" ? offeredFavor(campaign, projection, record) : {}),
        ...(!landed && projection.grudgeIfMissed !== undefined
            ? { grudge: { cause: record.account, weight: projection.grudgeIfMissed, turn: campaign.turn } }
            : {}),
    };
}
function offeredFavor(campaign, projection, record) {
    const matter = projection.matter ? fiscalMatterForBill(campaign, projection.matter.billId) : undefined;
    if (!matter || !lobbyFavorAvailability(campaign, matter, projection.post).ok)
        return {};
    return { openFavor: draftLobbyFavor(campaign, projection.post, matter, record.id) };
}
/** Resolve one issued Hill play whose due date has arrived. */
export function resolveIssuedLobbying(campaign, id) {
    const act = campaign.issuedActs?.[id];
    if (!act || act.kind !== "lobby")
        return { ok: false, reason: "That play is not outstanding." };
    if (act.status === "resolved" || act.status === "reported" || act.status === "withdrawn" || act.status === "expired") {
        return { ok: false, reason: "That play has already closed." };
    }
    if (compareDates(campaign.calendar, act.dueDate) < 0) {
        return { ok: false, reason: "The counterpart has not answered yet." };
    }
    if (!selectHillMember(campaign, act.post)) {
        return { ok: false, reason: "The seat is empty, so the play lapses." };
    }
    const projection = projectLobbying(campaign, act.post, act.approach, {
        repeatCall: act.repeatCall ?? 0,
        ...(act.matter ? { matter: act.matter } : {}),
    });
    if (!projection)
        return { ok: false, reason: "Nobody currently holds that seat on the Hill." };
    const frozen = {
        ...projection,
        successChance: act.chance,
        forecast: act.forecast,
    };
    return resolveFromProjection(campaign, frozen, act);
}
