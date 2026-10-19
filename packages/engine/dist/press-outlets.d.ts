import type { IdeologyVector, StateRegion } from "@admin/world";
import type { FeedItem, PressCorps } from "./state.js";
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
export type OutletFormat = "wire" | "daily" | "trade" | "weekly" | "network" | "business" | "cable" | "digital" | "talk-radio" | "podcast" | "regional";
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
export declare const FORMAT_PARTISANSHIP: Readonly<Record<OutletFormat, number>>;
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
export declare const PRESS_OUTLETS: readonly PressOutlet[];
/**
 * The desks that cover the country as a whole: every desk but the four
 * regional papers, which file their own states' home news and nothing else.
 * A national story is one of these desks' to carry and to keep alive.
 */
export declare const NATIONAL_OUTLETS: readonly PressOutlet[];
export type OutletStance = "hostile" | "skeptical" | "neutral" | "friendly";
export declare const clamp01: (value: number) => number;
export declare function outletStance(disposition: number): OutletStance;
export declare const round3: (value: number) => number;
/** How far an outlet's own lean can carry it from where the corps stands. */
export declare const LEAN_WEIGHT = 0.35;
export declare function outletDisposition(corps: PressCorps, outlet: PressOutlet): number;
/**
 * The whole roster arranged around one figure.
 *
 * This is the whole of what an outlet's disposition used to be, kept because it
 * is what a corps carrying no spread of its own means: the reading a save
 * written before the outlets had minds was already showing the player.
 */
export declare function outletSpreadAt(standing: number): Readonly<Record<string, number>>;
