import { BLOCS, type Bloc } from "./electorate.js";
import { atWarAsParty } from "./war-party.js";
import { selectRelationshipsFrom, type Campaign } from "./state.js";
import type { UsMajorParty } from "./state-legislature.js";

// Force and sanctions divide the country by party, not only through what they
// cost (owner, 2026-10-13). The outcomes already reach every bloc through the
// six judgments: casualties, prices and wars move security and prosperity for
// everyone. This term is the other half: Republicans are more willing than
// Democrats to see force used, so an administration that uses it gains a little
// among the one and loses a little among the other, whichever party it is.
//
// The positions are Pew's (American Trends Panel wave 53, September 2019,
// "6. Views of foreign policy", December 17, 2019): asked whether good
// diplomacy or military strength is the best way to ensure peace, 46 percent
// of Republicans and Republican leaners chose military strength against about
// 10 percent of Democrats and Democratic leaners (90 chose diplomacy), and 26
// percent of all adults. Pew does not split identifiers from leaners on this
// item, so both carry the party figure. The no-lean figure is inferred, not
// published: it is the value that reproduces the 26 percent national figure
// from Gallup's 2025 shares, about 20 percent.
//
// The term is centered on the share-weighted mean, so it divides the blocs and
// does not on its own make force unpopular: what the public thinks of a war it
// does not like is the war's own cost, billed once, through the judgments.

/** Share of each party's blocs preferring military strength to diplomacy as the way to keep the peace. */
export const MILITARY_STRENGTH_SHARE = {
  republican: 0.46,
  democrat: 0.1,
  pure: 0.2,
} as const;

/** The most the force term may move one bloc, in logits: inside the per-bloc issue cap of 0.30. */
export const FORCE_ISSUE_WEIGHT = 0.6;

/** How long an act of force or a sanction stays part of the record the public holds this administration to. */
export const FORCE_ISSUE_MEMORY_WEEKS = 26;

/**
 * How much of the record each kind of act is. A war the country is fighting is
 * the whole of it; an invasion nearly so; a single strike or a sanctions package
 * a part. Design judgment, labeled: no survey prices one act against another.
 */
const ACT_WEIGHT: Readonly<Record<string, number>> = {
  invasion: 1,
  blockade: 0.6,
  strike: 0.5,
  embargo: 0.35,
  sanctions: 0.25,
};

/** How much of a force record this administration is carrying, 0..1. */
export function forceRecord(campaign: Campaign): number {
  if (atWarAsParty(campaign)) return 1;
  let record = 0;
  for (const edge of selectRelationshipsFrom(campaign, campaign.founding.nation)) {
    for (const event of edge.history ?? []) {
      const weight = ACT_WEIGHT[event.kind];
      const age = campaign.turn - event.turn;
      if (weight === undefined || age < 0 || age >= FORCE_ISSUE_MEMORY_WEEKS) continue;
      record += weight * (1 - age / FORCE_ISSUE_MEMORY_WEEKS);
    }
  }
  return Math.min(1, record);
}

function strengthShareFor(bloc: Bloc, anchor: UsMajorParty): number {
  if (bloc === "pure") return MILITARY_STRENGTH_SHARE.pure;
  const own = bloc === "ownId" || bloc === "ownLean";
  const party: UsMajorParty = own ? anchor : anchor === "republican" ? "democrat" : "republican";
  return MILITARY_STRENGTH_SHARE[party];
}

/** Each bloc's force term in logits, from the President's side of the aisle. */
export function forceIssueTerms(
  record: number,
  shares: Readonly<Record<Bloc, number>>,
  anchor: UsMajorParty,
): Readonly<Record<Bloc, number>> {
  const strength = Object.fromEntries(BLOCS.map((bloc) => [bloc, strengthShareFor(bloc, anchor)])) as Record<Bloc, number>;
  const mean = BLOCS.reduce((sum, bloc) => sum + shares[bloc] * strength[bloc], 0);
  return Object.fromEntries(
    BLOCS.map((bloc) => [bloc, FORCE_ISSUE_WEIGHT * record * 2 * (strength[bloc] - mean)]),
  ) as Record<Bloc, number>;
}
