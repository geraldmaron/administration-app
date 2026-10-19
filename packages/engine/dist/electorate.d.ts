import type { RngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
import type { UsMajorParty } from "./state-legislature.js";
export declare const BLOCS: readonly ["ownId", "ownLean", "pure", "oppLean", "oppId"];
export type Bloc = (typeof BLOCS)[number];
export declare const PARTY_BLOCS: readonly ["republicanId", "republicanLean", "pure", "democraticLean", "democraticId"];
export type PartyBloc = (typeof PARTY_BLOCS)[number];
export type PartyShares = Readonly<Record<PartyBloc, number>>;
/** Logit of the partisan intercept per unit of polarization. Fit, rescaled to the 2020s era. */
export declare const BLOC_INTERCEPT = 2.26;
/**
 * How much polarization flattens a partisan's response to the record. Held at
 * 0.6 on the pooled scale (weakly identified: it trades against the leaner
 * share) and rescaled to the era. Bounded with the polarization ceiling so the
 * identifiers' slope stays positive across every reachable stock.
 */
export declare const BLOC_FLATTENING = 0.678;
/** The least an identifier ever moves on the record, so no reachable stock lets a failing President gain among their own. */
export declare const IDENTIFIER_SLOPE_FLOOR = 0.1;
/**
 * A leaner's share of an identifier's partisanship. Judgment: the fit is flat
 * from 0 to 1 (RMSE 2.55 to 2.56), so the approval data cannot tell leaners
 * from identifiers. Five blocs are kept for turnout and for the caucus.
 */
export declare const LEANER_PARTISANSHIP = 0.65;
/** Logit per unit of weighted judgment, mapping the record's valence range onto raw 0.30 to 0.69. */
export declare const VALENCE_SCALE = 12;
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
export declare const VALENCE_MIDPOINT = 0.52;
/** The benefit of the doubt at the oath, in valence units, gone by week 26. */
export declare const HONEYMOON_VALENCE = 0.3;
export declare const HONEYMOON_WEEKS = 26;
/**
 * Party loyalty at the ballot, in logits: a partisan who disapproves still
 * mostly votes their party. Fit to Pew's 2020 validated vote (own party 92 for
 * the incumbent, opposition 6).
 */
export declare const PARTY_LOYALTY = 0.9;
/**
 * The share of each bloc that votes when nothing has moved it. Partisans and
 * pure independents are derived from Pew's 2020 validated vote (turnout 66;
 * no-lean independents about 2 percent of voters and 13 of nonvoters); the
 * split between identifiers and leaners is judgment.
 */
export declare const BLOC_HABIT: Readonly<Record<Bloc, number>>;
/** The most cohort strain may move any bloc's turnout, in turnout share, all causes together. */
export declare const BLOC_TURNOUT_CAP = 0.04;
/**
 * Gallup, party affiliation in 2025 (news.gallup.com/poll/700499, January 12,
 * 2026; 13,454 adults): Republicans 27, Democrats 27, independents 45 of whom
 * 15 lean Republican, 20 lean Democratic and 10 lean neither.
 */
export declare const GALLUP_2025_SHARES: {
    readonly republicanId: 0.27;
    readonly republicanLean: 0.15;
    readonly pure: 0.1;
    readonly democraticLean: 0.2;
    readonly democraticId: 0.27;
};
/**
 * The leaned-party margin a campaign may open on, either way. Gallup's quarterly
 * leaned margins ran from Republicans +4 (Q4 2024) to Democrats +8 (Q4 2025),
 * a twelve-point range; the founding draws inside a symmetric range of the same
 * width so neither party is favored on average (owner, 2026-10-13).
 */
export declare const FOUNDING_MARGIN_HALF_RANGE = 0.06;
/** The founding's shares at a given leaned margin, positive toward the Democrats; the swing sits in the leaners, as Gallup's did. */
export declare function sharesAtMargin(margin: number): PartyShares;
/** Drawn once at founding on its own stream and stored. */
export declare function openingPartyShares(streams: RngStreams): PartyShares;
/** The stored draw, or an even country on a save founded before the draw existed. */
export declare function partyShares(campaign: Campaign): PartyShares;
/** The five shares from the President's side of the aisle. */
export declare function orientedShares(shares: PartyShares, anchor: UsMajorParty): Readonly<Record<Bloc, number>>;
/** Which way each bloc leans, +1 the President's identifiers to -1 the opposition's. */
export declare function blocPartisanship(independentPresident: boolean): Readonly<Record<Bloc, number>>;
/** The honeymoon at a week of the term, in valence units. */
export declare function honeymoonValence(turn: number): number;
/** The most every live rally together may add to the record, in valence units: a 9/11-scale lift and no more. */
export declare const RALLY_STOCK_CAP = 6;
/** The record in logits: how far the weighted judgments sit from neither good nor bad, plus the honeymoon and any rally. */
export declare function valenceOf(raw: number, turn: number, rally?: number): number;
/** How much the record moves a bloc of this partisanship at this stock. */
export declare function valenceSlope(partisanship: number, polarization: number): number;
/** The pass-through of a scandal to the President's own side: full in a depolarized country, half at the 2020s stock. */
export declare function erosionPassThrough(polarization: number): number;
/**
 * How far the country's belief in this administration's honesty has fallen
 * below the line where honesty stops being a partisan question.
 */
export declare const EROSION_INTEGRITY_LINE = 0.4;
export declare function erosionGravity(campaign: Campaign): number;
/** How much of it is in the open: live scandal, one story at full strength being the whole of it. */
export declare function erosionExposure(campaign: Campaign): number;
/**
 * What the President's own side has given up on, 0..1. A product: a party does
 * not leave over a story about a government it still believes honest, nor over
 * a private doubt nobody is asking about.
 */
export declare function erosionOf(campaign: Campaign, polarization: number): number;
export type BlocInputs = {
    readonly valence: number;
    readonly polarization: number;
    readonly erosion: number;
    readonly partisanship: Readonly<Record<Bloc, number>>;
    readonly issue: Readonly<Record<Bloc, number>>;
};
/** One bloc's approval in logits. */
export declare function blocLogit(bloc: Bloc, inputs: BlocInputs): number;
export declare function blocApprovals(inputs: BlocInputs): Readonly<Record<Bloc, number>>;
export declare function headlineOf(shares: Readonly<Record<Bloc, number>>, approvals: Readonly<Record<Bloc, number>>): number;
/**
 * The most the issue terms may move the headline, either way. Each bloc's issue
 * term is capped where it is derived; this caps the sum, because a consensus
 * act moving every bloc the same way would otherwise pass each bloc's cap and
 * still move the headline nearly two points (owner, 2026-10-13: per-bloc caps
 * plus a cap on the headline effect). One point: an ordinary act is worth less.
 */
export declare const HEADLINE_ISSUE_CAP = 0.01;
/** The issue terms scaled down, if they must be, until their headline effect is inside the cap. */
export declare function cappedIssue(shares: Readonly<Record<Bloc, number>>, inputs: BlocInputs): Readonly<Record<Bloc, number>>;
export declare const ZERO_ISSUE: Readonly<Record<Bloc, number>>;
/** Each bloc's vote for the President's ticket at its approval. */
export declare function blocVote(approval: number, partisanship: number): number;
/**
 * The President's ticket's share of the votes cast: each bloc's vote weighted
 * by how many of it there are and how many of those turn out. Composition at
 * full size, so a bloc that stays home costs exactly the votes it would have
 * cast.
 */
export declare function ballotOf(shares: Readonly<Record<Bloc, number>>, approvals: Readonly<Record<Bloc, number>>, partisanship: Readonly<Record<Bloc, number>>, turnout: Readonly<Record<Bloc, number>>): number;
/**
 * The share of the President's own caucus that would vote against them on a
 * removal count, read off their own identifiers. The ceiling is the 1974
 * anchor the engine already carries; the slope and midpoint are solved through
 * the 2020 and 2021 Senate counts (1 of 53, 7 of 50), so they are exactly
 * identified and labeled judgment. Clinton 1999 lands 1.9 of 45 against 0.
 */
export declare const CAUCUS_BREAK_CEILING = 0.65;
export declare const CAUCUS_BREAK_SLOPE = 18.4;
export declare const CAUCUS_BREAK_MIDPOINT = 0.75;
export declare function caucusBreakShare(ownIdentifiers: number): number;
/** The three readings a player is shown: the President's party with its leaners, the independents, the other party with its leaners. */
export declare const DISPLAY_BLOCS: readonly ["own", "independent", "opposition"];
export type DisplayBloc = (typeof DISPLAY_BLOCS)[number];
export declare function displayRollup(shares: Readonly<Record<Bloc, number>>, values: Readonly<Record<Bloc, number>>): Readonly<Record<DisplayBloc, {
    readonly share: number;
    readonly value: number;
}>>;
