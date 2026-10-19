import {
  DISPLAY_BLOCS,
  ZERO_ISSUE,
  blocApprovals,
  displayRollup,
  opinionCourse,
  rawApproval,
  salientWeights,
  selectBlocTurnout,
  selectElectorate,
  selectOpinionCauses,
  heaviestCause,
  OPINION_CAUSE_LABELS,
  OPINION_DRIVERS,
  OPINION_WEIGHTS,
  valenceOf,
  valenceSlope,
  BLOC_HABIT,
  BLOCS,
  type Bloc,
  type Campaign,
  type DisplayBloc,
  type ElectorateReading,
  type OpinionSample,
} from "@admin/engine";
import { readingBand, type Stance } from "../reading";

// The country as the three readings a player is shown. The engine keeps five
// blocs (identifiers and leaners of each party, and the independents who lean
// neither way); the display rolls the leaners into their party. Every figure is
// the engine's own reading, rolled up by `displayRollup`; the only arithmetic
// here is a counterfactual of that same formula and a difference between two
// readings the engine already filed.

const PARTY_PLURAL = { democrat: "Democrats", republican: "Republicans" } as const;
const OTHER_PARTY = { democrat: "republican", republican: "democrat" } as const;

export type BlocMove = {
  readonly key: "record" | "rest";
  readonly label: string;
  /** In share of the bloc approving, signed. */
  readonly delta: number;
};

export type BlocHold = {
  readonly key: "scandal" | "force" | "rally";
  readonly label: string;
  /** What this holds the bloc's approval at, against the week without it, signed. */
  readonly delta: number;
};

export type BlocReading = {
  readonly id: DisplayBloc;
  readonly name: string;
  /** Where the President's own party sits; it is the base the caucus reads. */
  readonly base: boolean;
  readonly share: number;
  readonly approval: number;
  readonly stance: Stance;
  readonly word: string;
  /** What the bloc adds to the headline: its share of the country times its approval. */
  readonly contribution: number;
  /** How much of an independent's response to the record this bloc has: 1 is all of it. */
  readonly responsiveness: number;
  /** Against the previous closed week; undefined until two weeks have been observed. */
  readonly week?: { readonly change: number; readonly moves: readonly BlocMove[] };
  readonly holds: readonly BlocHold[];
  /** The share of the bloc that votes when nothing has moved it, and the share that would this week. */
  readonly turnout: { readonly habit: number; readonly now: number };
};

export type BlocTopline = {
  readonly blocs: readonly BlocReading[];
  readonly headline: number;
  /** The President's own party's identifiers' approval: the figure their caucus reads. */
  readonly ownIdentifiers: number;
};

type Rollup = Readonly<Record<DisplayBloc, { readonly share: number; readonly value: number }>>;

const rollupOf = (reading: ElectorateReading, change: Partial<Pick<ElectorateReading, "valence" | "erosion" | "issue">> = {}): Rollup =>
  displayRollup(reading.shares, blocApprovals({ ...reading, ...change }));

function nameOf(id: DisplayBloc, campaign: Campaign): string {
  const anchor = campaign.congress.caucusAnchor;
  if (id === "independent") return "Independents";
  return `${PARTY_PLURAL[id === "own" ? anchor : OTHER_PARTY[anchor]]} and those who lean their way`;
}

function valenceAt(campaign: Campaign, sample: OpinionSample): number {
  const mood = { ...campaign.player.opinion, ...sample.judgments, polarization: sample.polarization };
  return valenceOf(rawApproval(mood, salientWeights(campaign)), campaign.turn);
}

/**
 * The last closed week's move per bloc, split into what the six judgments did
 * and everything else. The split reads both weeks' judgments at this week's
 * weights and division, so it is exactly the record's part of the move; the
 * rest is scandal erosion, the force record, the fade of a new term's goodwill
 * and rounding, which the campaign does not keep week by week and cannot be
 * told apart without inventing figures.
 */
/**
 * The record's line, naming what led it: the judgment that moved most this
 * week at its weight, and the heaviest cause behind that judgment now, so the
 * record's part of a move is never a level standing without its reason.
 */
function recordLabel(campaign: Campaign, last: OpinionSample, before: OpinionSample): string {
  const moved = [...OPINION_DRIVERS].sort(
    (a, b) => Math.abs(OPINION_WEIGHTS[b] * (last.judgments[b] - before.judgments[b])) - Math.abs(OPINION_WEIGHTS[a] * (last.judgments[a] - before.judgments[a])),
  )[0]!;
  const reading = selectOpinionCauses(campaign).find((entry) => entry.driver === moved);
  const cause = reading ? heaviestCause(reading) : undefined;
  return cause ? `How people rate your work, mostly because of ${OPINION_CAUSE_LABELS[cause.key].toLowerCase()}` : "How people rate your work";
}

function weekMoves(campaign: Campaign, reading: ElectorateReading): Readonly<Partial<Record<DisplayBloc, { readonly change: number; readonly moves: readonly BlocMove[] }>>> {
  const course = opinionCourse(campaign);
  const last = course[course.length - 1];
  const before = course[course.length - 2];
  if (!last || !before) return {};
  const after = rollupOf(reading, { valence: valenceAt(campaign, last) });
  const prior = rollupOf(reading, { valence: valenceAt(campaign, before) });
  return Object.fromEntries(
    DISPLAY_BLOCS.flatMap((id) => {
      const now = last.blocs[id];
      const was = before.blocs[id];
      if (now === undefined || was === undefined) return [];
      const record = after[id].value - prior[id].value;
      const change = now - was;
      const moves: readonly BlocMove[] = [
        { key: "record", label: recordLabel(campaign, last, before), delta: record },
        { key: "rest", label: "Scandals, use of force, and your early goodwill wearing off", delta: change - record },
      ];
      return [[id, { change, moves }] as const];
    }),
  );
}

/** A war's rally in valence units. */
const rallyOf = (reading: ElectorateReading): number => reading.rally;

function holdsOf(id: DisplayBloc, reading: ElectorateReading): readonly BlocHold[] {
  const now = rollupOf(reading)[id].value;
  const rally = now - rollupOf(reading, { valence: reading.valence - rallyOf(reading) })[id].value;
  const scandal = now - rollupOf(reading, { erosion: 0 })[id].value;
  const force = now - rollupOf(reading, { issue: ZERO_ISSUE })[id].value;
  return [
    ...(id === "own" && Math.abs(scandal) >= 0.0005 ? [{ key: "scandal" as const, label: "Scandals are costing you support in your own party", delta: scandal }] : []),
    ...(Math.abs(rally) >= 0.0005 ? [{ key: "rally" as const, label: "People rallying behind the war", delta: rally }] : []),
    ...(Math.abs(force) >= 0.0005 ? [{ key: "force" as const, label: force > 0 ? "This group likes your use of force and sanctions" : "This group dislikes your use of force and sanctions", delta: force }] : []),
  ];
}

const byBloc = (read: (bloc: Bloc) => number): Readonly<Record<Bloc, number>> =>
  Object.fromEntries(BLOCS.map((bloc) => [bloc, read(bloc)])) as Record<Bloc, number>;

/** The three blocs this week, each with its share, approval, what moved it and who turns out. */
export function blocTopline(campaign: Campaign): BlocTopline {
  const reading = selectElectorate(campaign);
  const approvals = rollupOf(reading);
  const slopes = displayRollup(reading.shares, byBloc((bloc) => valenceSlope(reading.partisanship[bloc], reading.polarization)));
  const turnout = selectBlocTurnout(campaign);
  const now = displayRollup(reading.shares, byBloc((bloc) => turnout.find((row) => row.bloc === bloc)?.turnout ?? BLOC_HABIT[bloc]));
  const habit = displayRollup(reading.shares, BLOC_HABIT);
  const moves = weekMoves(campaign, reading);
  const blocs = DISPLAY_BLOCS.map((id): BlocReading => {
    const approval = approvals[id].value;
    const band = readingBand("standing", approval);
    const week = moves[id];
    return {
      id,
      name: nameOf(id, campaign),
      base: id === "own",
      share: approvals[id].share,
      approval,
      stance: band?.stance ?? "neutral",
      word: band?.word ?? "",
      contribution: approvals[id].share * approval,
      responsiveness: slopes[id].value,
      ...(week ? { week } : {}),
      holds: holdsOf(id, reading),
      turnout: { habit: habit[id].value, now: now[id].value },
    };
  });
  return { blocs, headline: reading.headline, ownIdentifiers: reading.approvals.ownId };
}
