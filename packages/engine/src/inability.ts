import type { Charter } from "@admin/world";
import { seatedOf, supermajorityOf } from "./congress.js";
import { voteOn, type CaucusVote } from "./congress-votes.js";
import { caucusBreakShare } from "./electorate.js";
import { ownIdentifierApproval } from "./opinion.js";
import { turnsFor } from "./pace.js";
import type { Campaign, RemovalArc } from "./state.js";

// Removal for inability rather than for a crime (owner, 2026-10-13: an honest,
// failing President can be removed without a grave charge).
//
// The removal ladder ends a presidency over conduct: its last rung is a charge
// grave enough that the President's own caucus breaks. A President who has
// committed no such act but has lost their own party entirely had no way out
// short of the next election. The Twenty-fifth Amendment's fourth section is
// the constitutional path for that case: the Vice President and a majority of
// the principal officers declare the President unable to discharge the office,
// and if the President contests it, two thirds of each chamber must agree
// within twenty-one days.
//
// No roll call has ever been taken under that section, so nothing anchors when
// a party gives up on its own President for incapacity. The two thresholds
// below are design judgments, labeled as such, and the votes reuse the caucus
// break the grave-charge path is fitted to (2020 and 2021 Senate counts) with
// the President's own identifiers as its reading.

/**
 * Where the President's own identifiers' approval has to fall before their
 * party's officers will move against them: seven in ten still approving is
 * deeper than any President's own party has gone in Gallup's series outside
 * Nixon's last months. At the 2020s stock that is a headline in the mid
 * twenties. Design judgment, labeled.
 */
export const INABILITY_OWN_LINE = 0.7;

/** How long below that line before the declaration comes: a full season, so one bad quarter is not an inability. Design judgment, labeled. */
export const INABILITY_SUSTAIN_DAYS = 91;

/** How long after a failed declaration before another can be made: half a year. Design judgment, labeled. */
export const INABILITY_RETRY_DAYS = 182;

/** How much the case for inability moves members outside the President's caucus, on the removal arc's appeal scale. */
const INABILITY_APPEAL = 0.3;

export type InabilityState = {
  /** The turn the President's own identifiers went below the line, while they stay there. */
  readonly belowSince?: number;
  /** The turn the last declaration failed in Congress. */
  readonly failedTurn?: number;
};

export type InabilityCount = {
  readonly ownIdentifiers: number;
  readonly breaking: number;
  readonly house: CaucusVote;
  readonly senate: CaucusVote;
  readonly passed: boolean;
};

/** The week's update of the inability watch: when the President's own side went under the line, if it has. */
export function nextInabilityState(campaign: Campaign, ownIdentifiers: number): InabilityState {
  const current = campaign.removal.inability ?? {};
  const below = ownIdentifiers < INABILITY_OWN_LINE;
  const { belowSince: _since, ...rest } = current;
  void _since;
  if (!below) return rest;
  return { ...rest, belowSince: current.belowSince ?? campaign.turn };
}

/**
 * Whether a declaration is due this week. Section 4 needs the Vice President to
 * join the cabinet, so an empty vice presidency (a death before the successor
 * is confirmed) leaves nobody to make it; the watch keeps running meanwhile.
 */
export function inabilityDeclarationDue(campaign: Campaign, state: InabilityState): boolean {
  if (campaign.vicePresident === undefined) return false;
  if (state.belowSince === undefined) return false;
  if (campaign.turn - state.belowSince < turnsFor(INABILITY_SUSTAIN_DAYS)) return false;
  return state.failedTurn === undefined || campaign.turn - state.failedTurn >= turnsFor(INABILITY_RETRY_DAYS);
}

/** Two thirds of each chamber, with the President's own caucus breaking by their identifiers. */
export function countInability(campaign: Campaign, ownIdentifiers: number): InabilityCount {
  const breaking = caucusBreakShare(ownIdentifiers);
  const count = (chamber: "house" | "senate") =>
    voteOn(campaign, {
      chamber,
      appeal: INABILITY_APPEAL,
      required: supermajorityOf(seatedOf(campaign.congress, chamber)),
      stance: "opposition",
      counted: "against",
      administrationBreak: breaking,
    });
  const house = count("house");
  const senate = count("senate");
  return { ownIdentifiers, breaking, house, senate, passed: house.passed && senate.passed };
}

export const INABILITY_ENDING =
  "The Vice President and a majority of the cabinet declared the President unable to discharge the office, and two thirds of each chamber upheld them. No charge was brought; the President's own party had given up.";

/**
 * The inability path's week: the watch updated, and, when a declaration is due
 * on a charter that removes by impeachment, the count and its outcome. Returns
 * the arc as it stands after the week.
 */
export function advanceInability(campaign: Campaign, charter: Charter, arc: RemovalArc): { readonly arc: RemovalArc; readonly count?: InabilityCount } {
  if (arc.resolved || charter.removalMechanism !== "impeachment") return { arc };
  const ownIdentifiers = ownIdentifierApproval(campaign);
  const watch = nextInabilityState(campaign, ownIdentifiers);
  if (!inabilityDeclarationDue(campaign, watch)) return { arc: { ...arc, inability: watch } };
  const count = countInability(campaign, ownIdentifiers);
  if (!count.passed) return { arc: { ...arc, inability: { ...watch, failedTurn: campaign.turn } }, count };
  return { arc: { ...arc, inability: watch, resolved: true, endingSummary: INABILITY_ENDING }, count };
}
