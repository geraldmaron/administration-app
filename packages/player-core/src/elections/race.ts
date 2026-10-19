import {
  addDays,
  campaignFoundingDate,
  contestAhead,
  contestDay,
  daysBetween,
  marginHalfWidth,
  matchupKnown,
  opposingParty,
  selectOpponent,
  usPartyWord,
  type Campaign,
  type GameDate,
  type PersonRuntime,
} from "@admin/engine";
import type { PersonId } from "@admin/world";
import { electionProjectionReading } from "../congress/congress-reading";
import { formatDate } from "../format/figures";
import { BAND_CAPTION, BAND_WORD, opponentIntroduction, seasonStage, type SeasonStage } from "./finale-copy";

// The President's own race, all term: who the other party is putting up, and
// the band the night can still land in.
//
// The middle of the band is the engine's own projection, the count the night
// will run. Its width is the part of the matchup nobody knows yet, which is a
// fact about the calendar rather than a guess, so the whole cone from today to
// Election Day can be drawn. What cannot be drawn is where the middle was in
// weeks already gone: no projection was kept for them, and a line invented for
// the past would be the one false thing on the chart.

export type RaceOpponent = {
  readonly id: PersonId;
  readonly name: string;
  readonly party: "Democrat" | "Republican";
  /** Where they sit now, in the words a paper would use: "Governor of Ohio". */
  readonly office: string;
  readonly introduction: string;
};

export type BandPoint = {
  /** Days from the oath. */
  readonly at: number;
  readonly label: string;
  readonly low: number;
  readonly high: number;
};

export type RaceReading = {
  readonly opponent?: RaceOpponent;
  readonly stage: SeasonStage;
  readonly share: number;
  readonly low: number;
  readonly high: number;
  /** How much of the matchup is known, 0..1. */
  readonly known: number;
  readonly bandWord: string;
  readonly caption: string;
  readonly electoralVotes?: number;
  readonly electoralMajority: number;
  readonly wouldHold: boolean;
  readonly contestDate: string;
  /** Days from the oath to today and to Election Day, the chart's two marks. */
  readonly todayAt: number;
  readonly contestAt: number;
  /** The band from today to the night, at monthly steps and on the night itself. */
  readonly cone: readonly BandPoint[];
};

const CONE_STEP_DAYS = 28;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const COMMITTEE_WORD = "a committee chair in Congress";

function officeOf(campaign: Campaign, runtime: PersonRuntime): string {
  const roles = runtime.base.eligibleRoles.map(String);
  const party = usPartyWord(opposingParty(campaign));
  if (roles.includes("role-governor")) {
    const state = runtime.state ? campaign.states[runtime.state]?.base.name : undefined;
    return state ? `Governor of ${state}` : "a sitting governor";
  }
  if (roles.includes("role-congressional-leader")) return `a leader of the ${party}s in Congress`;
  if (roles.includes("role-opposition-leader")) return `the ${party}s' leader`;
  return COMMITTEE_WORD;
}

function raceOpponent(campaign: Campaign, stage: SeasonStage): RaceOpponent | undefined {
  const opponent = selectOpponent(campaign);
  const runtime = opponent ? campaign.people[opponent.person] : undefined;
  if (!opponent || !runtime) return undefined;
  const party = usPartyWord(opposingParty(campaign)) as "Democrat" | "Republican";
  const office = officeOf(campaign, runtime);
  return {
    id: opponent.person,
    name: runtime.base.name,
    party,
    office,
    introduction: opponentIntroduction(stage, runtime.base.name, office, party),
  };
}

function conePoint(campaign: Campaign, founded: GameDate, date: GameDate, share: number): BandPoint {
  const half = marginHalfWidth(campaign, date);
  return {
    at: daysBetween(founded, date),
    label: formatDate(date),
    low: clamp01(share - half),
    high: clamp01(share + half),
  };
}

function cone(campaign: Campaign, share: number): readonly BandPoint[] {
  const founded = campaignFoundingDate(campaign);
  const night = contestDay(campaign);
  const days = daysBetween(campaign.calendar, night);
  if (days < 0) return [];
  const steps = Math.floor(days / CONE_STEP_DAYS);
  const dates = Array.from({ length: steps + 1 }, (_, index) => addDays(campaign.calendar, index * CONE_STEP_DAYS));
  const withNight = days % CONE_STEP_DAYS === 0 ? dates : [...dates, night];
  return withNight.map((date) => conePoint(campaign, founded, date, share));
}

/** The race as it stands this week. Undefined once the President has no contest left to run. */
export function raceReading(campaign: Campaign): RaceReading | undefined {
  if (!contestAhead(campaign)) return undefined;
  const projection = electionProjectionReading(campaign);
  const known = matchupKnown(campaign);
  const stage = seasonStage(known, true);
  const opponent = raceOpponent(campaign, stage);
  // With nobody on the other side's bench there is no matchup left to learn.
  const half = opponent ? marginHalfWidth(campaign) : 0;
  const founded = campaignFoundingDate(campaign);
  return {
    ...(opponent ? { opponent } : {}),
    stage,
    share: projection.share,
    low: clamp01(projection.share - half),
    high: clamp01(projection.share + half),
    known,
    bandWord: BAND_WORD[stage],
    caption: BAND_CAPTION[stage],
    ...(projection.electoralVotes === undefined ? {} : { electoralVotes: projection.electoralVotes }),
    electoralMajority: projection.electoralMajority,
    wouldHold: projection.wouldHold,
    contestDate: formatDate(contestDay(campaign)),
    todayAt: daysBetween(founded, campaign.calendar),
    contestAt: daysBetween(founded, contestDay(campaign)),
    cone: opponent ? cone(campaign, projection.share) : [],
  };
}

/** The opponent as the contest named them, for a night or an ending that is already decided. */
export function decidedOpponent(campaign: Campaign): RaceOpponent | undefined {
  return raceOpponent(campaign, "decided");
}
