import type { NationId } from "@admin/world";
import { INSTRUMENT_RUNGS, type InstrumentId, type RungLevel } from "./instruments.js";
import {
  selectNation,
  selectPlayerLedger,
  type ActionCounsel,
  type ActionRecord,
  type Campaign,
} from "./state.js";

// Reading the administration's own record back.
//
// An entry states its own commitment: the instrument, the rung, who it was
// aimed at, and how it went. That is what makes this a read of the record
// rather than an interpretation of it, and it is why an aftermath somebody
// authored does not cost the campaign its own evidence: the card's prose
// replaces the narration, and the facts underneath it are untouched.
//
// The prose parse below is the fallback for one case only: a save written
// before entries carried those fields. Two voices produce a narrating sentence
// for an instrument commitment (the resolver's own, and the ladder's when an
// attempt bypasses the resolver), and both name the rung by a name no other
// rung shares. Where the sentence is an authored card's instead, a pre-migration
// entry is dropped rather than approximated: a derived profile built partly on
// invention would be indistinguishable from one built on evidence.

export type LedgerCommitment = {
  readonly turn: number;
  readonly instrument: InstrumentId;
  readonly rung: RungLevel;
  // Absent when a pre-migration narration named a nation this campaign does not
  // carry — which an authored line can do, and a display name collision cannot.
  readonly target?: NationId;
  // Absent where the committing path does not roll, and on a pre-migration
  // entry whose narrating voice does not say how it went.
  readonly landed?: boolean;
  // What the room said about this commitment before it was taken. Carried here
  // because it belongs to the same entry, and reading it separately would mean
  // walking the ledger twice to line the two halves back up.
  readonly counsel?: ActionCounsel;
};

type RungRef = { readonly instrument: InstrumentId; readonly rung: RungLevel };

const RUNG_BY_NAME: ReadonlyMap<string, RungRef> = new Map(
  INSTRUMENT_RUNGS.map((definition) => [definition.name, { instrument: definition.instrument, rung: definition.rung }]),
);

// The ladder's own narration, used where an attempt is committed without going
// through the resolver: it states the rung outright and says nothing of outcome.
const LADDER_SHAPE = /^.+ uses (.+) \((?:diplomatic|economic|covert|military) rung [1-5]\) against (.+)\.$/;
// The resolver's two generic branches.
const LANDED_SHAPE = /^.+ uses (.+) against (.+), and it lands\.$/;
const FAILED_SHAPE = /^.+ attempts (.+?) against (.+?)\. /;

function parseNarration(description: string): { ref: RungRef; targetName: string; landed?: boolean } | undefined {
  const ladder = LADDER_SHAPE.exec(description);
  if (ladder) return refFrom(ladder[1]!, ladder[2]!);
  const landed = LANDED_SHAPE.exec(description);
  if (landed) return refFrom(landed[1]!, landed[2]!, true);
  const failed = FAILED_SHAPE.exec(description);
  if (failed) return refFrom(failed[1]!, failed[2]!, false);
  return undefined;
}

function refFrom(
  rungName: string,
  targetName: string,
  landed?: boolean,
): { ref: RungRef; targetName: string; landed?: boolean } | undefined {
  const ref = RUNG_BY_NAME.get(rungName);
  if (!ref) return undefined;
  return { ref, targetName, ...(landed === undefined ? {} : { landed }) };
}

function nationsByName(campaign: Campaign): ReadonlyMap<string, NationId> {
  const byName = new Map<string, NationId>();
  for (const id of Object.keys(campaign.nations) as NationId[]) {
    const name = selectNation(campaign, id)?.base.identity.name;
    if (name !== undefined) byName.set(name, id);
  }
  return byName;
}

// The fallback, reached only where the entry does not state its own commitment.
function parsedCommitment(
  entry: ActionRecord,
  byName: ReadonlyMap<string, NationId>,
): LedgerCommitment | undefined {
  const parsed = parseNarration(entry.description);
  if (!parsed) return undefined;
  const target = byName.get(parsed.targetName);
  return {
    turn: entry.turn,
    instrument: parsed.ref.instrument,
    rung: parsed.ref.rung,
    ...(target === undefined ? {} : { target }),
    ...(parsed.landed === undefined ? {} : { landed: parsed.landed }),
  };
}

function commitmentFrom(
  entry: ActionRecord,
  byName: ReadonlyMap<string, NationId>,
): LedgerCommitment | undefined {
  const stated = entry.commitment;
  if (!stated) return parsedCommitment(entry, byName);
  return {
    turn: entry.turn,
    instrument: stated.instrument,
    rung: stated.rung,
    target: stated.target,
    ...(stated.landed === undefined ? {} : { landed: stated.landed }),
    ...(entry.counsel ? { counsel: entry.counsel } : {}),
  };
}

/**
 * Every instrument commitment this administration made that the record can
 * still be read for, oldest first.
 */
export function readPlayerCommitments(campaign: Campaign): readonly LedgerCommitment[] {
  const byName = nationsByName(campaign);
  return selectPlayerLedger(campaign).flatMap((entry) => {
    const commitment = commitmentFrom(entry, byName);
    return commitment ? [commitment] : [];
  });
}
