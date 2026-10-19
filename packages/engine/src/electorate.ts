import { INDEPENDENT_REACH } from "./party.js";
import { selectLiveScandals } from "./press-scandal.js";
import type { RngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
import type { UsMajorParty } from "./state-legislature.js";

// The country as five partisan blocs reading one record.
//
// Every bloc reads the same valence: the six judgments the public holds the
// government to, weighted by what the week is about. What differs is where a
// bloc starts (its partisan intercept) and how far the record moves it (its
// valence slope), and both depend on one structural polarization stock. The
// headline is the share-weighted sum of the blocs; the ballot is their
// turnout-weighted vote; the caucus reads the President's own identifiers.
//
// The constants are fitted to Gallup's approval by party: seventeen readings
// from G.W. Bush year four to Biden's term, with the 2017-21 era read as
// polarization 1. Two of them are not identified by that data and are labeled
// as judgment where they are declared: the leaners' share of an identifier's
// partisanship, and the bloc turnout habits that separate identifiers from
// leaners. The fit and its out-of-sample checks are in the approval program's
// DESIGN and DESIGN-VERIFY.

export const BLOCS = ["ownId", "ownLean", "pure", "oppLean", "oppId"] as const;
export type Bloc = (typeof BLOCS)[number];

export const PARTY_BLOCS = ["republicanId", "republicanLean", "pure", "democraticLean", "democraticId"] as const;
export type PartyBloc = (typeof PARTY_BLOCS)[number];
export type PartyShares = Readonly<Record<PartyBloc, number>>;

/** Logit of the partisan intercept per unit of polarization. Fit, rescaled to the 2020s era. */
export const BLOC_INTERCEPT = 2.26;

/**
 * How much polarization flattens a partisan's response to the record. Held at
 * 0.6 on the pooled scale (weakly identified: it trades against the leaner
 * share) and rescaled to the era. Bounded with the polarization ceiling so the
 * identifiers' slope stays positive across every reachable stock.
 */
export const BLOC_FLATTENING = 0.678;

/** The least an identifier ever moves on the record, so no reachable stock lets a failing President gain among their own. */
export const IDENTIFIER_SLOPE_FLOOR = 0.1;

/**
 * A leaner's share of an identifier's partisanship. Judgment: the fit is flat
 * from 0 to 1 (RMSE 2.55 to 2.56), so the approval data cannot tell leaners
 * from identifiers. Five blocs are kept for turnout and for the caucus.
 */
export const LEANER_PARTISANSHIP = 0.65;

/** Logit per unit of weighted judgment, mapping the record's valence range onto raw 0.30 to 0.69. */
export const VALENCE_SCALE = 12;

/**
 * The weighted judgment that reads as neither good nor bad. A balance dial.
 *
 * Fitted alone, 0.60 puts careful play's term mean inside the 2020s band of
 * 0.42 to 0.52 (0.506 over twelve seeds, against 0.571 here). It is held at
 * 0.52 because the readers of the headline (Congress's disposition, removal
 * pressure, the scenario director's sense of a weak presidency) are still
 * calibrated on the headline this value produces: at 0.60 the national books
 * stopped separating borrowing-to-invest and consolidation from careful play,
 * because a lower headline leaves every Congress colder. The move comes with
 * the per-caucus disposition and removal terms that read the blocs instead.
 */
export const VALENCE_MIDPOINT = 0.52;

/** The benefit of the doubt at the oath, in valence units, gone by week 26. */
export const HONEYMOON_VALENCE = 0.3;
export const HONEYMOON_WEEKS = 26;

/**
 * Party loyalty at the ballot, in logits: a partisan who disapproves still
 * mostly votes their party. Fit to Pew's 2020 validated vote (own party 92 for
 * the incumbent, opposition 6).
 */
export const PARTY_LOYALTY = 0.9;

/**
 * The share of each bloc that votes when nothing has moved it. Partisans and
 * pure independents are derived from Pew's 2020 validated vote (turnout 66;
 * no-lean independents about 2 percent of voters and 13 of nonvoters); the
 * split between identifiers and leaners is judgment.
 */
export const BLOC_HABIT: Readonly<Record<Bloc, number>> = {
  ownId: 0.72,
  ownLean: 0.58,
  pure: 0.23,
  oppLean: 0.58,
  oppId: 0.72,
};

/** The most cohort strain may move any bloc's turnout, in turnout share, all causes together. */
export const BLOC_TURNOUT_CAP = 0.04;

/**
 * Gallup, party affiliation in 2025 (news.gallup.com/poll/700499, January 12,
 * 2026; 13,454 adults): Republicans 27, Democrats 27, independents 45 of whom
 * 15 lean Republican, 20 lean Democratic and 10 lean neither.
 */
export const GALLUP_2025_SHARES = { republicanId: 0.27, republicanLean: 0.15, pure: 0.1, democraticLean: 0.2, democraticId: 0.27 } as const;

/**
 * The leaned-party margin a campaign may open on, either way. Gallup's quarterly
 * leaned margins ran from Republicans +4 (Q4 2024) to Democrats +8 (Q4 2025),
 * a twelve-point range; the founding draws inside a symmetric range of the same
 * width so neither party is favored on average (owner, 2026-10-13).
 */
export const FOUNDING_MARGIN_HALF_RANGE = 0.06;

const LEANERS_TOTAL = GALLUP_2025_SHARES.republicanLean + GALLUP_2025_SHARES.democraticLean;

/** The founding's shares at a given leaned margin, positive toward the Democrats; the swing sits in the leaners, as Gallup's did. */
export function sharesAtMargin(margin: number): PartyShares {
  const raw = {
    republicanId: GALLUP_2025_SHARES.republicanId,
    republicanLean: LEANERS_TOTAL / 2 - margin / 2,
    pure: GALLUP_2025_SHARES.pure,
    democraticLean: LEANERS_TOTAL / 2 + margin / 2,
    democraticId: GALLUP_2025_SHARES.democraticId,
  };
  const total = PARTY_BLOCS.reduce((sum, bloc) => sum + raw[bloc], 0);
  return Object.fromEntries(PARTY_BLOCS.map((bloc) => [bloc, Math.round((raw[bloc] / total) * 10_000) / 10_000])) as PartyShares;
}

/** Drawn once at founding on its own stream and stored. */
export function openingPartyShares(streams: RngStreams): PartyShares {
  const stream = streams.stream("founding", "electorate", "party-shares");
  return sharesAtMargin((stream.next() * 2 - 1) * FOUNDING_MARGIN_HALF_RANGE);
}

/** The stored draw, or an even country on a save founded before the draw existed. */
export function partyShares(campaign: Campaign): PartyShares {
  return campaign.electorateShares ?? sharesAtMargin(0);
}

/** The five shares from the President's side of the aisle. */
export function orientedShares(shares: PartyShares, anchor: UsMajorParty): Readonly<Record<Bloc, number>> {
  const republican = anchor === "republican";
  return {
    ownId: republican ? shares.republicanId : shares.democraticId,
    ownLean: republican ? shares.republicanLean : shares.democraticLean,
    pure: shares.pure,
    oppLean: republican ? shares.democraticLean : shares.republicanLean,
    oppId: republican ? shares.democraticId : shares.republicanId,
  };
}

/** Which way each bloc leans, +1 the President's identifiers to -1 the opposition's. */
export function blocPartisanship(independentPresident: boolean): Readonly<Record<Bloc, number>> {
  // A President with no party commands only part of the pull a party ticket
  // does, on both sides, the same reach a state's lean is read through.
  const reach = independentPresident ? INDEPENDENT_REACH : 1;
  return {
    ownId: reach,
    ownLean: LEANER_PARTISANSHIP * reach,
    pure: 0,
    oppLean: -LEANER_PARTISANSHIP * reach,
    oppId: -reach,
  };
}

const logistic = (value: number): number => 1 / (1 + Math.exp(-value));
const logit = (share: number): number => {
  const bounded = Math.min(1 - 1e-6, Math.max(1e-6, share));
  return Math.log(bounded / (1 - bounded));
};
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** The honeymoon at a week of the term, in valence units. */
export function honeymoonValence(turn: number): number {
  const weeks = Math.max(0, turn - 1);
  return weeks >= HONEYMOON_WEEKS ? 0 : HONEYMOON_VALENCE * (1 - weeks / HONEYMOON_WEEKS);
}

/** The most every live rally together may add to the record, in valence units: a 9/11-scale lift and no more. */
export const RALLY_STOCK_CAP = 6;

/** The record in logits: how far the weighted judgments sit from neither good nor bad, plus the honeymoon and any rally. */
export function valenceOf(raw: number, turn: number, rally = 0): number {
  return VALENCE_SCALE * (raw - VALENCE_MIDPOINT) + honeymoonValence(turn) + Math.min(RALLY_STOCK_CAP, Math.max(0, rally));
}

/** How much the record moves a bloc of this partisanship at this stock. */
export function valenceSlope(partisanship: number, polarization: number): number {
  return Math.max(IDENTIFIER_SLOPE_FLOOR, 1 - BLOC_FLATTENING * polarization * Math.abs(partisanship));
}

/** The pass-through of a scandal to the President's own side: full in a depolarized country, half at the 2020s stock. */
export function erosionPassThrough(polarization: number): number {
  return Math.max(0.25, Math.min(1, 1.5 - polarization));
}

/**
 * How far the country's belief in this administration's honesty has fallen
 * below the line where honesty stops being a partisan question.
 */
export const EROSION_INTEGRITY_LINE = 0.4;

export function erosionGravity(campaign: Campaign): number {
  return clamp01((EROSION_INTEGRITY_LINE - campaign.player.opinion.integrity) / EROSION_INTEGRITY_LINE);
}

/** How much of it is in the open: live scandal, one story at full strength being the whole of it. */
export function erosionExposure(campaign: Campaign): number {
  return clamp01(selectLiveScandals(campaign).reduce((sum, scandal) => sum + scandal.intensity, 0));
}

/**
 * What the President's own side has given up on, 0..1. A product: a party does
 * not leave over a story about a government it still believes honest, nor over
 * a private doubt nobody is asking about.
 */
export function erosionOf(campaign: Campaign, polarization: number): number {
  return clamp01(erosionGravity(campaign) * erosionExposure(campaign) * erosionPassThrough(polarization));
}

export type BlocInputs = {
  readonly valence: number;
  readonly polarization: number;
  readonly erosion: number;
  readonly partisanship: Readonly<Record<Bloc, number>>;
  readonly issue: Readonly<Record<Bloc, number>>;
};

/** One bloc's approval in logits. */
export function blocLogit(bloc: Bloc, inputs: BlocInputs): number {
  const pi = inputs.partisanship[bloc];
  const intercept = BLOC_INTERCEPT * inputs.polarization * pi * (pi > 0 ? 1 - inputs.erosion : 1);
  return intercept + valenceSlope(pi, inputs.polarization) * inputs.valence + inputs.issue[bloc];
}

export function blocApprovals(inputs: BlocInputs): Readonly<Record<Bloc, number>> {
  return Object.fromEntries(BLOCS.map((bloc) => [bloc, logistic(blocLogit(bloc, inputs))])) as Record<Bloc, number>;
}

export function headlineOf(shares: Readonly<Record<Bloc, number>>, approvals: Readonly<Record<Bloc, number>>): number {
  return BLOCS.reduce((sum, bloc) => sum + shares[bloc] * approvals[bloc], 0);
}

/**
 * The most the issue terms may move the headline, either way. Each bloc's issue
 * term is capped where it is derived; this caps the sum, because a consensus
 * act moving every bloc the same way would otherwise pass each bloc's cap and
 * still move the headline nearly two points (owner, 2026-10-13: per-bloc caps
 * plus a cap on the headline effect). One point: an ordinary act is worth less.
 */
export const HEADLINE_ISSUE_CAP = 0.01;

/** The issue terms scaled down, if they must be, until their headline effect is inside the cap. */
export function cappedIssue(shares: Readonly<Record<Bloc, number>>, inputs: BlocInputs): Readonly<Record<Bloc, number>> {
  const without = headlineOf(shares, blocApprovals({ ...inputs, issue: ZERO_ISSUE }));
  const effect = (scale: number): number =>
    headlineOf(shares, blocApprovals({ ...inputs, issue: scaleIssue(inputs.issue, scale) })) - without;
  if (Math.abs(effect(1)) <= HEADLINE_ISSUE_CAP) return inputs.issue;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 30; step += 1) {
    const middle = (low + high) / 2;
    if (Math.abs(effect(middle)) <= HEADLINE_ISSUE_CAP) low = middle;
    else high = middle;
  }
  return scaleIssue(inputs.issue, low);
}

export const ZERO_ISSUE: Readonly<Record<Bloc, number>> = { ownId: 0, ownLean: 0, pure: 0, oppLean: 0, oppId: 0 };

function scaleIssue(issue: Readonly<Record<Bloc, number>>, scale: number): Readonly<Record<Bloc, number>> {
  return Object.fromEntries(BLOCS.map((bloc) => [bloc, issue[bloc] * scale])) as Record<Bloc, number>;
}

/** Each bloc's vote for the President's ticket at its approval. */
export function blocVote(approval: number, partisanship: number): number {
  return logistic(logit(approval) + PARTY_LOYALTY * partisanship);
}

/**
 * The President's ticket's share of the votes cast: each bloc's vote weighted
 * by how many of it there are and how many of those turn out. Composition at
 * full size, so a bloc that stays home costs exactly the votes it would have
 * cast.
 */
export function ballotOf(
  shares: Readonly<Record<Bloc, number>>,
  approvals: Readonly<Record<Bloc, number>>,
  partisanship: Readonly<Record<Bloc, number>>,
  turnout: Readonly<Record<Bloc, number>>,
): number {
  let cast = 0;
  let ours = 0;
  for (const bloc of BLOCS) {
    const voters = shares[bloc] * turnout[bloc];
    cast += voters;
    ours += voters * blocVote(approvals[bloc], partisanship[bloc]);
  }
  return cast > 0 ? ours / cast : 0.5;
}

/**
 * The share of the President's own caucus that would vote against them on a
 * removal count, read off their own identifiers. The ceiling is the 1974
 * anchor the engine already carries; the slope and midpoint are solved through
 * the 2020 and 2021 Senate counts (1 of 53, 7 of 50), so they are exactly
 * identified and labeled judgment. Clinton 1999 lands 1.9 of 45 against 0.
 */
export const CAUCUS_BREAK_CEILING = 0.65;
export const CAUCUS_BREAK_SLOPE = 18.4;
export const CAUCUS_BREAK_MIDPOINT = 0.75;

export function caucusBreakShare(ownIdentifiers: number): number {
  return CAUCUS_BREAK_CEILING * logistic(CAUCUS_BREAK_SLOPE * (CAUCUS_BREAK_MIDPOINT - ownIdentifiers));
}

/** The three readings a player is shown: the President's party with its leaners, the independents, the other party with its leaners. */
export const DISPLAY_BLOCS = ["own", "independent", "opposition"] as const;
export type DisplayBloc = (typeof DISPLAY_BLOCS)[number];

const DISPLAY_MEMBERS: Readonly<Record<DisplayBloc, readonly Bloc[]>> = {
  own: ["ownId", "ownLean"],
  independent: ["pure"],
  opposition: ["oppLean", "oppId"],
};

export function displayRollup(
  shares: Readonly<Record<Bloc, number>>,
  values: Readonly<Record<Bloc, number>>,
): Readonly<Record<DisplayBloc, { readonly share: number; readonly value: number }>> {
  return Object.fromEntries(
    DISPLAY_BLOCS.map((display) => {
      const members = DISPLAY_MEMBERS[display];
      const share = members.reduce((sum, bloc) => sum + shares[bloc], 0);
      const value = share > 0 ? members.reduce((sum, bloc) => sum + shares[bloc] * values[bloc], 0) / share : 0;
      return [display, { share, value }];
    }),
  ) as Record<DisplayBloc, { readonly share: number; readonly value: number }>;
}
