import type { RoleId } from "@admin/world";
import type { PolicyStatPath } from "./policy-stats.js";
export * from "./policy-stats.js";
export * from "./policy-program.js";
import { type AlignmentVector, type Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import type { MetricDeltas } from "./effect-types.js";
export type PolicyDomain = "fiscal" | "industry" | "trade" | "civil" | "security" | "defense";
export declare const POLICY_DOMAINS: readonly PolicyDomain[];
export type PolicyDomainSpec = {
    readonly name: string;
    /**
     * The chair answerable for it, as hints resolved against the charter's own
     * seats rather than as one hardcoded role id.
     *
     * A single id was a claim that one constitution's answer is every
     * constitution's. It is not: civil liberties are the Attorney General's brief
     * in a presidential republic and the interior ministry's in a parliamentary
     * one, and trade is run out of Commerce in Washington and out of the foreign
     * ministry almost everywhere else. Hardcoding either meant the table was
     * wrong for one set of charters or the other, and the way it was wrong was
     * silent — `legislableDomains` simply dropped a domain whose named chair a
     * charter did not seat, so correcting it for the United States would have
     * quietly removed civil-liberties policy from the nine charters that seat no
     * attorney general.
     *
     * Order is precedence: the first hint that matches a seated role wins, so the
     * list reads most-specific first and falls back to the seat that carries the
     * brief where the specific one does not exist. `matchRole` does the matching,
     * the same function the instrument stewardship and the scenario speaker hints
     * already use. No chair resolves, no program — which is the honest reading of
     * a government with nobody to sign one.
     */
    readonly chairHints: readonly string[];
    /** What the domain is, in the terms the player is choosing between. */
    readonly question: string;
};
export declare const POLICY_DOMAIN_SPECS: Readonly<Record<PolicyDomain, PolicyDomainSpec>>;
/**
 * Signed per-turn movement. `treasuryOfGdp` is a fraction of the nation's own
 * gross domestic product rather than a flat sum: a tax rise is worth
 * proportionally the same to a large economy and a small one, where a flat
 * figure would be a rounding error in one and the entire budget in the other.
 *
 * The share is an *annual* one — the scale a budget is actually written at.
 * `POLICY_TURN_SHARE` prorates it to the week a turn covers.
 */
export type PolicyMovement = {
    readonly stability?: number;
    /**
     * Kept on the type and unused by the defense stances on purpose. A standing
     * program's effect on the force belongs in `nationEffects` with the rest of
     * what a program does to the country: that path runs for every government
     * that adopts the stance rather than only the player's, it is what the
     * ladder's gates and the capacity ceiling actually read, and it is clamped to
     * the schema's own range. Declared here as well and a program would raise the
     * same force twice, at a weekly rate that outran refit and left the top of
     * the military ladder permanently open to anyone who bought the stance.
     */
    readonly militaryReadiness?: number;
    readonly standing?: number;
    readonly treasuryOfGdp?: number;
};
/**
 * Signed per-turn movement on the nation's own stats — the program's teeth.
 *
 * Without this a stance was only ever five numbers on the player's dashboard,
 * which made every program in a domain the same kind of thing at a different
 * magnitude, and left the country itself untouched by how it was governed. It
 * is also what makes an NPC's program mean anything at all: a nation the
 * player does not govern has no `MetricSet` for a stance to move.
 */
export type PolicyNationMovement = Partial<Record<PolicyStatPath, number>>;
export type PolicyStance = {
    readonly id: string;
    readonly domain: PolicyDomain;
    readonly name: string;
    /** In-fiction: what the program is, in the words the player is choosing in. */
    readonly summary: string;
    /** The founding default for its domain — what the administration inherited. */
    readonly inherited?: true;
    readonly perTurn: PolicyMovement;
    /** The one-off price of putting it in place, paid the turn it is enacted. */
    readonly enactment: PolicyMovement;
    /**
     * What holding this program does to the country week by week. Every
     * non-inherited stance must declare at least one path, and every path it
     * declares must be a stat something else in the engine already reads — both
     * enforced by `policy-teeth.test.ts` against the authored-field consumer
     * registry, so a program cannot be decor.
     */
    readonly nationEffects: PolicyNationMovement;
    readonly alignment: Partial<AlignmentVector>;
};
export declare const POLICY_STANCES: readonly PolicyStance[];
export declare function policyStance(id: string): PolicyStance | undefined;
export declare function stancesForDomain(domain: PolicyDomain): readonly PolicyStance[];
/** The stance every campaign starts each domain on. */
export declare function inheritedStance(domain: PolicyDomain): PolicyStance;
export type PolicySet = Readonly<Record<PolicyDomain, string>>;
/** What a founding opens on: continuity everywhere, which is a position too. */
export declare function inheritedPolicies(): PolicySet;
/**
 * The domains this campaign can hold a policy in: the ones whose responsible
 * chair the charter actually seats.
 *
 * This is not a rule written about juntas — it is the charter's own cabinet list
 * read honestly. A charter with no treasury minister has nobody who could sign a
 * budget, so it has no fiscal policy, and the screen says so in those terms.
 */
/**
 * The chair a given charter's seats put in charge of a domain, if any of them.
 *
 * Takes the seats rather than a campaign so founding — which has a charter and
 * no campaign yet — resolves through the identical rule the game in play does.
 * Two resolvers would be two answers to "who signs this", which is the defect
 * the hint list was introduced to end. Given the charter, a charter with a
 * written ownership table answers from the table and the hints serve the rest.
 */
export declare function resolveDomainChair(seats: readonly RoleId[], domain: PolicyDomain, charter?: string): RoleId | undefined;
/** The chair answerable for a domain in this campaign, if the charter seats one. */
export declare function domainChair(campaign: Campaign, domain: PolicyDomain): RoleId | undefined;
export declare function legislableDomains(campaign: Campaign): readonly PolicyDomain[];
/**
 * What a given chair is answerable for. The inverse of the spec table's own
 * `chair` field rather than a second list beside it, so a domain cannot be
 * reassigned in one place and keep answering to the old minister in the other.
 *
 * Scoped to the legislable set: a domain this charter seats nobody for is not
 * this minister's brief either.
 */
export declare function domainsChairedBy(campaign: Campaign, role: RoleId): readonly PolicyDomain[];
export declare function selectPolicies(campaign: Campaign): PolicySet;
export declare function selectPolicyStance(campaign: Campaign, domain: PolicyDomain): PolicyStance;
/**
 * The width of the competence band, exported so a government with no cabinet to
 * read — every nation the player does not run — can be scored on the same scale
 * rather than on a second one invented for it. A quality of 0.6 means the same
 * thing wherever it came from.
 */
export declare const POLICY_QUALITY_RANGE = 0.8;
export declare const CARETAKER_QUALITY = 0.6;
export declare function executionQuality(campaign: Campaign, domain: PolicyDomain): number;
export declare const round3: (value: number) => number;
/**
 * The share of an annual budget movement one turn actually collects or spends.
 *
 * A `treasuryOfGdp` figure is written the way a budget is: a share of GDP over
 * a year. A turn is a week, and applying the annual figure once a week made the
 * fiscal lever the only lever in the game — the program was not a decision, it
 * was a tide.
 *
 * Re-measured against the shipped scale rather than the two retired ones this
 * comment used to quote: the heaviest money line any stance carries is 0.012 of
 * output, which is 329,986 a year for the United States. Applied once a week it
 * would be 92% of the 357,485 of budget authority an administration founds on,
 * every week. Prorated it is 6,346 — under two points of the stock, which is
 * the same order of magnitude as a turn of statecraft, so the accounts are a
 * constraint the player weighs rather than a current they are carried on.
 */
export declare const POLICY_TURN_SHARE: number;
/**
 * The share of the gap between the country's order and where it rests that
 * closes each week (the pull itself is `conditionPhase`'s).
 *
 * It is what makes a stance's weekly stability a level rather than a rate. A
 * program that writes a point of order a week holds the country ten points
 * above where it would otherwise settle, and no higher however long it is held;
 * one that costs a point a week holds it ten below, and no lower. Before
 * anything pulled back, careful government's program spent a point and a half
 * of order every week forever and ended every year at zero, and a program with
 * a gift in it ended at one. A tenth is the horizon `horizonFit` already weighs a
 * stance's weekly movement over, so a government choosing a program and a
 * country living under one read it on the same scale.
 */
export declare const STABILITY_REVERSION = 0.1;
export declare function playerGdp(campaign: Campaign): number;
/**
 * A movement as actual metric deltas, with the minister's competence applied.
 *
 * Quality scales what a program *delivers*, never what it costs: a weak
 * treasury minister running a consolidation raises less money and still closes
 * the same clinics. Scaling both would make an incompetent appointment a way of
 * buying a cheaper policy, which is the opposite of the thing being modeled.
 */
export declare function movementToDeltas(movement: PolicyMovement, gdp: number, quality: number, treasuryShare?: number): MetricDeltas;
export type PolicyOutlookLine = {
    readonly domain: PolicyDomain;
    readonly stance: PolicyStance;
    /** The chair carrying it, and whether anyone is in it. */
    readonly chair: RoleId;
    readonly minister?: string;
    readonly quality: number;
    /** This domain's own per-turn contribution, competence already applied. */
    readonly perTurn: MetricDeltas;
};
export type PolicyOutlook = {
    readonly lines: readonly PolicyOutlookLine[];
    /** Every domain's per-turn contribution, summed — what a turn actually applies. */
    readonly perTurn: MetricDeltas;
};
export declare function sumDeltas(entries: readonly MetricDeltas[]): MetricDeltas;
/**
 * The standing program, domain by domain, with what each is worth per turn.
 *
 * Pure and cheap, so the policy screen can show the player exactly what the
 * turn will do before they end it — and the turn phase below applies this same
 * computation rather than a second one that could disagree with it.
 */
export declare function selectPolicyOutlook(campaign: Campaign): PolicyOutlook;
/**
 * Where the program as a whole stands, on the three axes every stance already
 * declares an `alignment` on.
 *
 * Each stance says which direction it pushes the country; nothing until now
 * added them up, so a government holding four right-leaning programs and a
 * left-leaning one had no reading of what it was, only a list of what it did.
 * The sum is clamped per axis rather than averaged: holding three
 * market-leaning positions is a more committed government than holding one, and
 * an average would flatten exactly that difference.
 *
 * This is the program's own shape, deliberately *not* `campaign.player
 * .alignments` — that is the record of what the player has said in
 * conversations. A government can talk one way and legislate another, and the
 * two readings existing separately is what lets a player see it.
 */
export declare function selectProgramAlignment(campaign: Campaign): AlignmentVector;
/**
 * One packet a turn for the whole program, not one per domain: six ledger
 * entries every week saying "policy happened" is noise the record has to be
 * read around, where one entry naming what the program actually did to the
 * country is the thing a player wants their own record to say.
 */
export declare const policyPhase: TurnPhase;
export declare function sentenceList(items: readonly string[]): string;
