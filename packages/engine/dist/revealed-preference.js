import { INSTRUMENT_COERCION } from "./instruments.js";
import { readPlayerCommitments } from "./ledger-reading.js";
import { selectConflicts, selectPursuits, selectRelationshipsFrom } from "./state.js";
const NEUTRAL = 0.5;
// A commitment's weight as an act, folding how coercive the instrument is with
// how far up its own ladder the government reached. The rung matters on its own
// terms: a démarche and a severance are the same instrument and not the same
// answer.
function commitmentForce(instrument, rung) {
    return INSTRUMENT_COERCION[instrument] * (0.4 + 0.6 * (rung / 5));
}
// Where a reply stops reading as a concession and where it starts reading as an
// escalation. The band between them belongs to neither: most governing is
// answers that are neither backing down nor climbing, and a partition with no
// middle would score every campaign as one or the other.
// The ceiling is set where the ladder puts a private word and a public one, and
// below where it puts a recalled ambassador: a government that answers pressure
// by talking has stepped back, one that answers it by withdrawing its mission
// has not. The floor is set at a full embargo, the lightest instrument the
// world would call an escalation on its own.
const CONCESSION_CEILING = 0.2;
const ESCALATION_FLOOR = 0.5;
// Coercion aimed at a nation this government has signed something with. Set
// below the escalation floor: turning an instrument on a friend at all is the
// fact, and it does not have to be the heaviest one.
const BETRAYAL_FLOOR = 0.4;
const FRIEND_TRUST = 0.6;
function share(matching, total) {
    return total === 0 ? NEUTRAL : matching / total;
}
function within(turn, opened, closed) {
    return turn >= opened && turn <= (closed ?? Number.POSITIVE_INFINITY);
}
/** Who was pressing the player at a given turn, read from the record's own dates. */
function pressingAt(campaign, turn) {
    const player = campaign.founding.nation;
    const pressers = new Set();
    for (const pursuit of selectPursuits(campaign)) {
        if (pursuit.target === player && within(turn, pursuit.openedTurn, pursuit.closedTurn)) {
            pressers.add(pursuit.actor);
        }
    }
    for (const conflict of selectConflicts(campaign)) {
        if (conflict.defender === player && within(turn, conflict.startedTurn, conflict.endedTurn)) {
            pressers.add(conflict.aggressor);
        }
    }
    return pressers;
}
function commitmentsUnderPressure(campaign, commitments) {
    return commitments.filter((commitment) => commitment.target !== undefined && pressingAt(campaign, commitment.turn).has(commitment.target));
}
/**
 * The nations this administration is on the record as being close to. Read from
 * the standing relationship rather than from any one moment in it: a treaty is
 * the strongest such statement, and trust past the friendly band is the
 * unsigned version of one.
 */
function friendsOf(campaign) {
    return new Set(selectRelationshipsFrom(campaign, campaign.founding.nation)
        .filter((relationship) => relationship.treaties.length > 0 || relationship.trust >= FRIEND_TRUST)
        .map((relationship) => relationship.to));
}
// Coercion turned on a friend, counted against every commitment aimed at one.
function commitmentsTowardFriends(commitments, friends) {
    const towardFriends = commitments.filter((c) => c.target !== undefined && friends.has(c.target));
    const kept = towardFriends.filter((c) => commitmentForce(c.instrument, c.rung) < BETRAYAL_FLOOR).length;
    return { tests: towardFriends.length, kept };
}
// A friend attacked in a war this government did not start and was not invaded
// in. Fighting beside the friend is support; so is an instrument turned on the
// aggressor while the fighting was on; silence through all of it is the other answer.
function standings(campaign, commitments, friends) {
    const player = campaign.founding.nation;
    const wars = selectConflicts(campaign).filter((conflict) => friends.has(conflict.defender) && conflict.aggressor !== player && conflict.defender !== player);
    const kept = wars.filter((war) => war.joined.defender.includes(player) || commitments.some((c) => c.target === war.aggressor && within(c.turn, war.startedTurn, war.endedTurn))).length;
    return { tests: wars.length, kept };
}
/**
 * The world's file on this administration, recomputed from the campaign record.
 */
export function revealedPreference(campaign) {
    const commitments = readPlayerCommitments(campaign);
    const pressed = commitmentsUnderPressure(campaign, commitments);
    const forces = pressed.map((c) => commitmentForce(c.instrument, c.rung));
    const friends = friendsOf(campaign);
    const kept = commitmentsTowardFriends(commitments, friends);
    const stood = standings(campaign, commitments, friends);
    const friendshipTests = kept.tests + stood.tests;
    return {
        concedesUnderPressure: share(forces.filter((force) => force <= CONCESSION_CEILING).length, forces.length),
        escalatesWhenTested: share(forces.filter((force) => force >= ESCALATION_FLOOR).length, forces.length),
        honorsFriends: share(kept.kept + stood.kept, friendshipTests),
        evidence: { pressedCommitments: pressed.length, friendshipTests },
    };
}
// --- The readout: what an intelligence report can print. ---
const READ_HIGH = 0.6;
const READ_LOW = 0.4;
function readingOf(value, high, low, hedged) {
    if (value >= READ_HIGH)
        return high;
    if (value <= READ_LOW)
        return low;
    return hedged;
}
/**
 * The profile in the register a foreign service would file it in — short, dry,
 * and silent about anything the record has not established. A scalar with no
 * evidence behind it produces no line at all rather than a confident 0.5.
 */
export function describeRevealedPreference(profile) {
    const lines = [];
    if (profile.evidence.pressedCommitments > 0) {
        lines.push(readingOf(profile.concedesUnderPressure, "Their file says they pay. Pressed, this government has answered softly more often than not.", "Pressed, this government has not yet been the one to step back.", "Pressed, this government has answered both ways, and neither is the safer assumption."));
        lines.push(readingOf(profile.escalatesWhenTested, "Tested, they climb. The heavier instruments are the ones this government reaches for.", "Tested, they stay low on the ladder.", "Tested, they have climbed sometimes and held sometimes."));
    }
    if (profile.evidence.friendshipTests > 0) {
        lines.push(readingOf(profile.honorsFriends, "They stand by the states they have signed with.", "Their friends are on notice: this government has left one of them to it before.", "Their record with their own friends is mixed."));
    }
    return lines;
}
// --- Pricing a probe against the file. ---
// Bounds. A weighting, not a decision: at either end the world still has to
// want the move for its own reasons, and the file only makes it dearer or
// cheaper than it would otherwise have been.
const MIN_MULTIPLIER = 0.7;
const MAX_MULTIPLIER = 1.4;
const PULL_SPAN = 0.4;
const OPPORTUNISM_WEIGHT = 0.5;
const VENGEFULNESS_WEIGHT = 0.3;
const DETERRENCE_WEIGHT = 0.2;
// A scalar as a signed reading around neutral, so a file that says nothing
// prices nothing.
function signed(value) {
    return value * 2 - 1;
}
/**
 * How much more, or less, attractive a move against this player looks to a
 * nation with these traits, given what the world has read off the record.
 *
 * An opportunist prices a probe against a government that pays; a vengeful one
 * moves earlier on a government that abandons its friends; and any of them
 * charges the difference back against a government that has shown it climbs.
 * Multiply an existing move score by it — it never chooses, it weights.
 */
export function probePricingMultiplier(profile, counterpart) {
    const pull = OPPORTUNISM_WEIGHT * counterpart.opportunism * signed(profile.concedesUnderPressure) +
        VENGEFULNESS_WEIGHT * counterpart.vengefulness * signed(1 - profile.honorsFriends) -
        DETERRENCE_WEIGHT * signed(profile.escalatesWhenTested);
    return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, 1 + PULL_SPAN * pull));
}
