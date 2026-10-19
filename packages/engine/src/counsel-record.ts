import type { NationId, PersonId, RoleId } from "@admin/world";
import { counselOnReply, type CounselStance } from "./counsel.js";
import type { ConversationScript, ReplyProjection } from "./conversations.js";
import type { InstrumentId, RungLevel } from "./instruments.js";
import { readPlayerCommitments, type LedgerCommitment } from "./ledger-reading.js";
import { selectCabinetSeats, selectPlayerLedger, type Campaign } from "./state.js";

// Whether the room was right.
//
// A minister argues with every reply the player weighs (counsel.ts) and is
// never held to it afterwards, which makes the advice free — the player has no
// way to learn that the chair that sounds most certain has been wrong four
// times running. This composes that account on demand, from the record, the
// same way a dossier is composed rather than stored.
//
// A conversation records the stance the chair actually took and the odds it was
// reading, so a call is scored from what was said rather than from a guess at
// it, including when an authored consequence card dressed the aftermath.
//
// One honest limit remains, and it is not about old data. An act taken outside
// a conversation — an instrument sent straight up the ladder — records the
// commitment but no stated stance, because no chair was asked. There the stance
// is reconstructed from the half of counsel's scoring the entry does keep: the
// minister's instincts against what the reply asked. A cautious minister's
// flinch at thin odds cannot be recovered from it and is not invented. That
// narrows what counts as a call; it makes none up.

export type CounselCall = {
  readonly turn: number;
  readonly instrument: InstrumentId;
  readonly rung: RungLevel;
  readonly stance: CounselStance;
  readonly landed: boolean;
};

export type CounselTrackRecord = {
  readonly role: RoleId;
  readonly person: PersonId;
  // Calls where the chair took a side. A hedge is not a prediction, so a
  // "wary" reading is left out of the arithmetic rather than scored as a miss.
  readonly contested: number;
  readonly right: number;
  // Whether the room was listened to, which is a different question from
  // whether it was correct and is the one that explains a chair's standing with
  // the player. Every call here is read off a commitment the player *made*, so
  // a chair that argued against it was overruled and the rest of `contested`
  // was heeded — no second record has to be kept to know which.
  readonly overruled: number;
  readonly calls: readonly CounselCall[];
};

// A reply the minister is being asked about, for the pre-migration fallback
// only: built to carry exactly the two facts such a save preserves.
// `successChance` is absent on purpose — it is the fact that is gone, and
// counsel.ts already treats its absence as "the odds are not part of this
// judgment" rather than as good odds.
function replyFor(commitment: LedgerCommitment): ReplyProjection {
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

function scriptFor(counterpart: NationId): ConversationScript {
  return { id: "record", counterpart, subject: "", opening: [], options: [] };
}

/** Where each seat's current holder took it, read off the appointment record. */
function heldSince(campaign: Campaign, role: RoleId): number {
  const person = campaign.player.cabinet[role];
  const name = person ? campaign.people[person]?.base.name : undefined;
  if (!name) return Number.POSITIVE_INFINITY;
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
function stanceFor(campaign: Campaign, role: RoleId, commitment: LedgerCommitment): CounselStance | undefined {
  const stated = commitment.counsel;
  // The room first, the primary chair second — the same read `loyalty.ts` makes.
  // A stamp now carries every seat that spoke, and reading only the primary made
  // "was the room right" a question about one chair per decision while the other
  // fifteen had their calls on the record and no score.
  if (stated) {
    const seat = stated.room?.find((voice) => voice.role === role);
    if (seat) return seat.stance;
    return stated.role === role ? stated.stance : undefined;
  }
  if (commitment.target === undefined) return undefined;
  const counsel = counselOnReply(campaign, scriptFor(commitment.target), replyFor(commitment));
  if (!counsel || counsel.kind !== "counsel" || counsel.role !== role) return undefined;
  return counsel.stance;
}

function callFor(campaign: Campaign, role: RoleId, commitment: LedgerCommitment): CounselCall | undefined {
  if (commitment.landed === undefined) return undefined;
  const stance = stanceFor(campaign, role, commitment);
  if (stance === undefined) return undefined;
  return {
    turn: commitment.turn,
    instrument: commitment.instrument,
    rung: commitment.rung,
    stance,
    landed: commitment.landed,
  };
}

function wasRight(call: CounselCall): boolean {
  return call.stance === "for" ? call.landed : !call.landed;
}

/**
 * What a seat's current holder has been right about. Composed on demand and
 * scoped to their own tenure: a chair's record is not inherited by whoever
 * walks into it.
 */
export function selectCounselRecord(campaign: Campaign, role: RoleId): CounselTrackRecord | undefined {
  const person = campaign.player.cabinet[role];
  if (!person) return undefined;
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
export function selectCounselRecordFor(campaign: Campaign, person: PersonId): CounselTrackRecord | undefined {
  const seat = selectCabinetSeats(campaign).find((role) => campaign.player.cabinet[role] === person);
  return seat ? selectCounselRecord(campaign, seat) : undefined;
}
