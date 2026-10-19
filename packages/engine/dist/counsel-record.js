import { counselOnReply } from "./counsel.js";
import { readPlayerCommitments } from "./ledger-reading.js";
import { selectCabinetSeats, selectPlayerLedger } from "./state.js";
// A reply the minister is being asked about, for the pre-migration fallback
// only: built to carry exactly the two facts such a save preserves.
// `successChance` is absent on purpose — it is the fact that is gone, and
// counsel.ts already treats its absence as "the odds are not part of this
// judgment" rather than as good odds.
function replyFor(commitment) {
    return {
        option: {
            id: `record:${commitment.instrument}:${commitment.rung}`,
            // The register is not preserved either, and it only prices a spoken
            // position — an instrument commitment is priced by the ladder.
            tone: "firm",
            text: "",
            commitment: { kind: "instrument", instrument: commitment.instrument, rung: commitment.rung },
        },
        available: true,
        cost: {},
        risks: [],
        ripples: [],
        rippleVisibility: "always",
    };
}
function scriptFor(counterpart) {
    return { id: "record", counterpart, subject: "", opening: [], options: [] };
}
/** Where each seat's current holder took it, read off the appointment record. */
function heldSince(campaign, role) {
    const person = campaign.player.cabinet[role];
    const name = person ? campaign.people[person]?.base.name : undefined;
    if (!name)
        return Number.POSITIVE_INFINITY;
    // A minister seated at founding has held the chair for the whole campaign;
    // one appointed later answers only for what came after their appointment.
    const appointment = [...selectPlayerLedger(campaign)]
        .reverse()
        .find((entry) => entry.description === `${name} is appointed to the cabinet.`);
    return appointment?.turn ?? 0;
}
// The chair that spoke to this commitment has to be the one being scored: a
// call that went to another ministry is not this minister's record. On a
// recorded stance that is the chair the room actually gave it to; on a
// reconstructed one it is the chair counsel routes the instrument to.
function stanceFor(campaign, role, commitment) {
    const stated = commitment.counsel;
    // The room first, the primary chair second — the same read `loyalty.ts` makes.
    // A stamp now carries every seat that spoke, and reading only the primary made
    // "was the room right" a question about one chair per decision while the other
    // fifteen had their calls on the record and no score.
    if (stated) {
        const seat = stated.room?.find((voice) => voice.role === role);
        if (seat)
            return seat.stance;
        return stated.role === role ? stated.stance : undefined;
    }
    if (commitment.target === undefined)
        return undefined;
    const counsel = counselOnReply(campaign, scriptFor(commitment.target), replyFor(commitment));
    if (!counsel || counsel.kind !== "counsel" || counsel.role !== role)
        return undefined;
    return counsel.stance;
}
function callFor(campaign, role, commitment) {
    if (commitment.landed === undefined)
        return undefined;
    const stance = stanceFor(campaign, role, commitment);
    if (stance === undefined)
        return undefined;
    return {
        turn: commitment.turn,
        instrument: commitment.instrument,
        rung: commitment.rung,
        stance,
        landed: commitment.landed,
    };
}
function wasRight(call) {
    return call.stance === "for" ? call.landed : !call.landed;
}
/**
 * What a seat's current holder has been right about. Composed on demand and
 * scoped to their own tenure: a chair's record is not inherited by whoever
 * walks into it.
 */
export function selectCounselRecord(campaign, role) {
    const person = campaign.player.cabinet[role];
    if (!person)
        return undefined;
    const since = heldSince(campaign, role);
    const calls = readPlayerCommitments(campaign)
        .filter((commitment) => commitment.turn >= since)
        .flatMap((commitment) => {
        const call = callFor(campaign, role, commitment);
        return call ? [call] : [];
    });
    const contested = calls.filter((call) => call.stance !== "wary");
    return {
        role,
        person,
        contested: contested.length,
        right: contested.filter(wasRight).length,
        overruled: contested.filter((call) => call.stance === "against").length,
        calls,
    };
}
/**
 * The same record, asked for by person: the surface that has a minister in
 * front of it knows who, not which chair.
 */
export function selectCounselRecordFor(campaign, person) {
    const seat = selectCabinetSeats(campaign).find((role) => campaign.player.cabinet[role] === person);
    return seat ? selectCounselRecord(campaign, seat) : undefined;
}
