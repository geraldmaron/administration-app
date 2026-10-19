import { rungBand } from "./consequences.js";
import { deedFlag, deedFromFlag, deedReceivedFlag, deedTowardFlag } from "./deeds.js";
import { markedFlags } from "./marked-flags.js";
// The record an act leaves behind, in the vocabulary `deeds.ts` fixes.
//
// The packet already stated the instrument, the rung, the target and the
// outcome and then threw all four away as far as content was concerned, so
// the game's most consequential moves were the ones the corpus was least able
// to answer. A deed flag is that same commitment, said in a closed grammar an
// authored condition can gate on: what was done, how hard, and whether it
// landed. It is a fact the resolver resolved, never a judgment a writer makes
// for itself, which is why it is derived from the commitment here rather than
// carried on any authored card.
//
// Two forms are stamped for the same act, and which two says who did it. The
// unbound one names no country, because a scenario that named one could only
// ever be cast one way; the bound one names the other capital, for the readers
// that legitimately know which — the ledger and a counterpart's own reading of
// the government.
//
// Scope: the player is one of the two parties or nothing is stamped. An act
// aimed at the player is a fact the player's content should be able to answer;
// a move two foreign capitals made between themselves is one the player was
// mostly never shown, and forty-nine squared pairs of them would grow the
// record without bound.
//
// Direction is the reason the received prefixes exist. A record that said a
// covert operation of this weight landed, without saying at whose hand, is a
// record content answers backwards half the time — and a bound flag naming the
// player is the player's own file saying something was done to it by someone
// unnamed. So the nation on the bound flag is always the counterparty, and an
// obligation to answer a capital can read that capital off the string.
//
// Idempotence: every segment of both strings is a pure function of the
// commitment, and `apply()` folds a flag effect into a keyed set, so a repeat
// of the same act writes the same keys instead of a second record. There is
// no count anywhere to double. Two acts of the same shape in the same turn
// collapse for the same reason and deliberately: the record says the
// government did this that week, not how many times it did.
// Read off the commitment rather than off the draw, so the flag content gates
// on and the fact the Record shows cannot disagree.
export function deedContribution(campaign, actor, commitment, observed) {
    const player = campaign.founding.nation;
    const nothing = { effects: [], metricDeltas: {} };
    const acted = actor === player;
    if (!acted && commitment.target !== player)
        return nothing;
    // A presidential order belongs in the President's own record even while
    // concealed. A foreign operation cannot seed player-facing callbacks that
    // identify its perpetrator before the operation is attributed.
    if (!acted && !observed)
        return nothing;
    // One commit path genuinely does not roll, and a deed with no outcome would
    // be the resolver claiming a result it never drew.
    if (commitment.landed === undefined)
        return nothing;
    const { instrument } = commitment;
    const band = rungBand(commitment.rung);
    const outcome = commitment.landed ? "landed" : "failed";
    const other = acted ? commitment.target : actor;
    const set = markedFlags(acted
        ? [deedFlag(instrument, band, outcome), deedTowardFlag(other, instrument, band, outcome)]
        : [deedReceivedFlag(instrument, band, outcome), deedFromFlag(other, instrument, band, outcome)], campaign.turn);
    return { effects: [{ kind: "flag", set }], metricDeltas: {} };
}
