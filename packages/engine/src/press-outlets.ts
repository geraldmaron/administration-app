import type { IdeologyVector, StateRegion } from "@admin/world";
import type { FeedItem, PressCorps } from "./state.js";

// The mastheads and the one reading taken off them, kept apart from `press.ts`
// deliberately.
//
// `press.ts` reaches coalition scoring for the corps's standing target, which
// reaches the fiscal and policy modules, which reach the turn loop. Anything
// importing the roster through `press.ts` therefore pulls that whole chain in
// at module-initialization time, and a module that the chain also reaches ends
// up initializing against half-built exports — the failure mode is a top-level
// constant that silently reads NaN rather than an error anyone can see.
//
// The roster is data and `outletDisposition` is arithmetic over it. Neither
// needs the corps's standing target, so neither belongs behind that import.
// `press.ts` re-exports both, so every existing caller is unchanged.

/**
 * How an outlet reads the same administration, relative to the corps as a
 * whole. Lean is what the masthead is before this president: the hostile end
 * will not be talked round by a good week, and the friendly end will carry a bad
 * one further than it deserves.
 *
 * The mastheads are the ones the article composer already prints, moved here so
 * that there is one press vocabulary rather than a list of names in the
 * formatter and a list of dispositions somewhere else.
 */
export type PressOutlet = {
  readonly id: string;
  readonly name: string;
  /**
   * What this masthead believes, on the three axes every other actor in the
   * game believes things on: Person.ideology, Party.beliefs, the cohort
   * centroids and the player's own accumulated alignment. An outlet was the
   * last actor whose worldview was one number.
   */
  readonly beliefs: IdeologyVector;
  /**
   * Standing posture toward the executive, −1 hostile .. 1 friendly.
   *
   * Derived, never authored: it is `beliefs.authLibertarian`, and every
   * outlet is constructed through `outlet()` below so there is exactly one
   * place either can be changed. A paper's default posture toward *any*
   * president is what it thinks about executive authority — the daily of record
   * whose reporters hold subpoenas sits at the liberty end and treats every
   * administration as something to be checked; the weekly whose access depends
   * on staying sympathetic sits at the authority end. The economic and
   * nationalist axes are what the lean cannot carry, and they are where two
   * desks come apart over the same order.
   */
  readonly lean: number;
  /** What it is for, in the words a media page would use. */
  readonly beat: string;
  /** Feed kinds this masthead is most likely to carry. */
  readonly coverage: readonly FeedItem["kind"][];
  /** Default hero band when no scene still is mapped. */
  readonly heroAmbiance: "editorial-press" | "editorial-press-b" | "editorial-press-c";
  /** What kind of newsroom it is, which decides how hard its politics bend its coverage. */
  readonly format: OutletFormat;
  /**
   * The share of American adults who get news from it in a given week, 0..1.
   *
   * Authored against the published audience surveys for the real outlet of the
   * same format, lean and size, never measured in play. It decides how often a
   * desk carries a story and who reads it, and nothing else: standing stays the
   * equal-weight mean of the dispositions, so no save's approval moves because a
   * bigger masthead joined the roster.
   */
  readonly reach: number;
  /** How far its readers across the country trust it, 0..1; printed on its profile. */
  readonly credibility: number;
  /** A regional paper's census region. It files the home news from its own states and nothing else. */
  readonly region?: StateRegion;
};

export type OutletFormat =
  | "wire"
  | "daily"
  | "trade"
  | "weekly"
  | "network"
  | "business"
  | "cable"
  | "digital"
  | "talk-radio"
  | "podcast"
  | "regional";

/**
 * How far a format's politics carry it toward or away from a President of a
 * given party, as a multiple of the reading every desk takes.
 *
 * The papers of record, the wire, the network and the regional press are read
 * at face value. The formats built on an audience's politics are not: a cable
 * channel whose viewers chose it for its side, a talk network, a partisan site
 * and a podcast all turn on who the President is far harder than on what the
 * President did, which is the most familiar fact about American media and the
 * one a single worldview dial could not express. Every such format comes in
 * mirrored left and right pairs, so the multiplier cancels across the roster
 * exactly as the beliefs do.
 */
export const FORMAT_PARTISANSHIP: Readonly<Record<OutletFormat, number>> = {
  wire: 1,
  daily: 1,
  trade: 1,
  weekly: 1,
  network: 1,
  business: 1,
  regional: 1,
  digital: 2,
  podcast: 2,
  cable: 2.5,
  "talk-radio": 3,
};

/**
 * One masthead, with its lean read off its beliefs rather than authored beside
 * them. The single writer of `lean`.
 */
function outlet(spec: Omit<PressOutlet, "lean">): PressOutlet {
  return { ...spec, lean: spec.beliefs.authLibertarian };
}

type OutletSpec = Omit<PressOutlet, "lean">;
type TwinSpec = Pick<OutletSpec, "id" | "name" | "beat" | "reach" | "credibility"> & Pick<Partial<OutletSpec>, "region">;

/**
 * A left-hand desk and its right-hand twin, the twin believing exactly the
 * negative of the first on every axis. The one way a partisan or regional desk
 * joins the roster, so the pair cannot drift out of balance by an edit to one
 * side.
 */
function mirrored(left: OutletSpec, right: TwinSpec): readonly [PressOutlet, PressOutlet] {
  const beliefs = {
    economicLeftRight: -left.beliefs.economicLeftRight + 0,
    authLibertarian: -left.beliefs.authLibertarian + 0,
    nationalistGlobalist: -left.beliefs.nationalistGlobalist + 0,
  };
  const { region: _leftRegion, ...shared } = left;
  return [outlet(left), outlet({ ...shared, ...right, beliefs })];
}

/**
 * The corps, and what each masthead believes.
 *
 * Every name is a fictional analogue: no real outlet is named, and each desk
 * mirrors a real one by format, lean, reach and credibility. The first six are
 * the shape of a real morning read: the adversarial daily of record; the trade
 * paper that covers the building rather than the party; the wire that files
 * first and is quoted by everyone who files second; the opinion weekly whose
 * access depends on staying friendly; the evening network with the broadest
 * audience and the shortest story; and the markets daily that prices an act
 * before it judges it.
 *
 * The other twelve are what those six left out: the partisan formats most
 * Americans actually get their politics from, in mirrored left and right pairs
 * (two cable channels, two sites, two talk networks, two podcasts), and four
 * regional papers, one per census region, that file the home news from their
 * own states. Mirrored means the right-hand desk believes exactly the negative
 * of its left-hand twin; the audiences are not mirrored, because the real ones
 * are not.
 *
 * Every axis sums to exactly zero across the roster, and that is a
 * load-bearing property rather than a tidy one: `corpsFrom` makes the corps's
 * standing the mean of the dispositions, so a belief term whose values did not
 * cancel would quietly move the aggregate the coalitions and the six judgments
 * read. Because they cancel, the mean of the outlet targets is still
 * `pressStandingTarget` — the substance rearranges the corps without moving
 * it — for every standing where no masthead hits the 0..1 clamp. Below that
 * band the clamp decides the mean instead and biases it upward, which is the
 * honest reading of a corps whose most hostile paper is already pinned at
 * zero. A mirrored pair is immune even there, because the clamp is symmetric
 * about the middle. `press-outlets.test.ts` pins the balance, the pairing and
 * that boundary.
 */
export const PRESS_OUTLETS: readonly PressOutlet[] = [
  outlet({
    id: "outlet-washington-chronicle",
    name: "The Washington Chronicle",
    beliefs: { economicLeftRight: -0.45, authLibertarian: -0.8, nationalistGlobalist: -0.35 },
    beat: "Adversarial daily of record; two of its reporters hold standing subpoenas.",
    coverage: ["press", "pursuit", "governance", "operator", "condition", "conflict", "npc-action"],
    heroAmbiance: "editorial-press",
    format: "daily",
    reach: 0.2,
    credibility: 0.55,
  }),
  outlet({
    id: "outlet-capital-register",
    name: "The Capital Register",
    beliefs: { economicLeftRight: -0.1, authLibertarian: -0.25, nationalistGlobalist: 0.1 },
    beat: "Covers the building rather than the party, and prints what the building says badly.",
    coverage: ["press", "player-action", "governance", "drift", "bloc"],
    heroAmbiance: "editorial-press-b",
    format: "trade",
    reach: 0.06,
    credibility: 0.5,
  }),
  outlet({
    id: "outlet-national-wire",
    name: "The National Wire",
    beliefs: { economicLeftRight: -0.05, authLibertarian: -0.15, nationalistGlobalist: 0 },
    beat: "The wire. Files first, adds nothing, and is quoted by everyone who files second.",
    coverage: ["npc-action", "condition", "conflict", "drift", "bloc", "operator", "governance", "pursuit"],
    heroAmbiance: "editorial-press-c",
    format: "wire",
    reach: 0.4,
    credibility: 0.75,
  }),
  outlet({
    id: "outlet-american-review",
    name: "The American Review",
    beliefs: { economicLeftRight: 0.05, authLibertarian: 0.3, nationalistGlobalist: 0 },
    beat: "Opinion weekly whose access depends on staying friendly, and which knows it.",
    coverage: ["press", "player-action", "governance", "bloc"],
    heroAmbiance: "editorial-press",
    format: "weekly",
    reach: 0.03,
    credibility: 0.45,
  }),
  outlet({
    id: "outlet-continental-broadcasting",
    name: "Continental Broadcasting",
    beliefs: { economicLeftRight: 0.15, authLibertarian: 0.35, nationalistGlobalist: 0.45 },
    beat: "Evening network news: the broadest audience in the country and the shortest story.",
    coverage: ["npc-action", "condition", "conflict", "drift", "player-action", "press"],
    heroAmbiance: "editorial-press-b",
    format: "network",
    reach: 0.35,
    credibility: 0.55,
  }),
  outlet({
    id: "outlet-business-record",
    name: "The Business Record",
    beliefs: { economicLeftRight: 0.4, authLibertarian: 0.55, nationalistGlobalist: -0.2 },
    beat: "Prices an act before it judges it; its editorial page and its newsroom disagree in public.",
    coverage: ["drift", "bloc", "player-action", "governance", "condition", "operator"],
    heroAmbiance: "editorial-press-c",
    format: "business",
    reach: 0.12,
    credibility: 0.6,
  }),
  ...mirrored(
    {
      id: "outlet-meridian-news",
      name: "Meridian News Channel",
      beliefs: { economicLeftRight: -0.45, authLibertarian: -0.1, nationalistGlobalist: -0.4 },
      beat: "Cable news for the left: prime time is opinion, and the daytime desk knows who is watching.",
      coverage: ["press", "player-action", "governance", "pursuit", "conflict", "npc-action"],
      heroAmbiance: "editorial-press-b",
      format: "cable",
      reach: 0.15,
      credibility: 0.35,
    },
    {
      id: "outlet-frontier-channel",
      name: "The Frontier Channel",
      beat: "The most-watched cable channel on the right, and the first call any Republican returns.",
      reach: 0.24,
      credibility: 0.35,
    },
  ),
  ...mirrored(
    {
      id: "outlet-undercurrent",
      name: "Undercurrent",
      beliefs: { economicLeftRight: -0.5, authLibertarian: -0.15, nationalistGlobalist: -0.3 },
      beat: "Progressive news site: explainers by day, a campaign against somebody by night.",
      coverage: ["press", "player-action", "drift", "pursuit", "operator"],
      heroAmbiance: "editorial-press-c",
      format: "digital",
      reach: 0.1,
      credibility: 0.3,
    },
    {
      id: "outlet-rampart",
      name: "The Rampart",
      beat: "Conservative news site that writes for the base and is read by the staff who answer to it.",
      reach: 0.09,
      credibility: 0.3,
    },
  ),
  ...mirrored(
    {
      id: "outlet-main-street-radio",
      name: "Main Street Radio",
      beliefs: { economicLeftRight: -0.4, authLibertarian: -0.1, nationalistGlobalist: -0.45 },
      beat: "Progressive talk network: three hosts, a union audience, and a long memory.",
      coverage: ["press", "player-action", "pursuit"],
      heroAmbiance: "editorial-press",
      format: "talk-radio",
      reach: 0.03,
      credibility: 0.25,
    },
    {
      id: "outlet-american-frequency",
      name: "American Frequency",
      beat: "Conservative talk radio, three hours a day on six hundred stations, callers first.",
      reach: 0.12,
      credibility: 0.25,
    },
  ),
  ...mirrored(
    {
      id: "outlet-long-table",
      name: "The Long Table",
      beliefs: { economicLeftRight: -0.35, authLibertarian: 0.1, nationalistGlobalist: -0.2 },
      beat: "A podcast by former party staffers for the people who used to be them.",
      coverage: ["press", "player-action", "drift"],
      heroAmbiance: "editorial-press-b",
      format: "podcast",
      reach: 0.05,
      credibility: 0.3,
    },
    {
      id: "outlet-straight-shot",
      name: "Straight Shot",
      beat: "A three-hour interview show on the right that trusts nobody in the building, friends included.",
      reach: 0.1,
      credibility: 0.3,
    },
  ),
  ...mirrored(
    {
      id: "outlet-seaboard-courier",
      name: "The Seaboard Courier",
      beliefs: { economicLeftRight: -0.15, authLibertarian: -0.1, nationalistGlobalist: -0.2 },
      beat: "The Northeast's regional paper: statehouses, storms and the commuter lines.",
      coverage: ["condition"],
      heroAmbiance: "editorial-press",
      format: "regional",
      reach: 0.06,
      credibility: 0.6,
      region: "northeast",
    },
    {
      id: "outlet-crossroads-herald",
      name: "The Crossroads Herald",
      beat: "The South's regional paper: the Gulf, the bases, and hurricane season.",
      reach: 0.07,
      credibility: 0.6,
      region: "south",
    },
  ),
  ...mirrored(
    {
      id: "outlet-western-correspondent",
      name: "The Western Correspondent",
      beliefs: { economicLeftRight: -0.1, authLibertarian: -0.05, nationalistGlobalist: -0.15 },
      beat: "The West's regional paper: fire season, water rights and the public lands.",
      coverage: ["condition"],
      heroAmbiance: "editorial-press-c",
      format: "regional",
      reach: 0.06,
      credibility: 0.6,
      region: "west",
    },
    {
      id: "outlet-midland-dispatch",
      name: "The Midland Dispatch",
      beat: "The Midwest's regional paper: plants, farms, and the floods on the rivers.",
      reach: 0.05,
      credibility: 0.6,
      region: "midwest",
    },
  ),
];

/**
 * The desks that cover the country as a whole: every desk but the four
 * regional papers, which file their own states' home news and nothing else.
 * A national story is one of these desks' to carry and to keep alive.
 */
export const NATIONAL_OUTLETS: readonly PressOutlet[] = PRESS_OUTLETS.filter((outlet) => outlet.region === undefined);

export type OutletStance = "hostile" | "skeptical" | "neutral" | "friendly";

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function outletStance(disposition: number): OutletStance {
  if (disposition < 0.3) return "hostile";
  if (disposition < 0.45) return "skeptical";
  if (disposition < 0.62) return "neutral";
  return "friendly";
}
export const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

/** How far an outlet's own lean can carry it from where the corps stands. */
export const LEAN_WEIGHT = 0.35;

export function outletDisposition(corps: PressCorps, outlet: PressOutlet): number {
  // A masthead with no figure of its own — one added to the roster after a save
  // was written — sits where the single-figure reading would have put it, which
  // is the same fill the schema migration writes.
  return round3(corps.dispositions?.[outlet.id] ?? clamp01(corps.standing + outlet.lean * LEAN_WEIGHT));
}

/**
 * The whole roster arranged around one figure.
 *
 * This is the whole of what an outlet's disposition used to be, kept because it
 * is what a corps carrying no spread of its own means: the reading a save
 * written before the outlets had minds was already showing the player.
 */
export function outletSpreadAt(standing: number): Readonly<Record<string, number>> {
  return Object.fromEntries(
    PRESS_OUTLETS.map((outlet) => [outlet.id, round3(clamp01(standing + outlet.lean * LEAN_WEIGHT))]),
  );
}
