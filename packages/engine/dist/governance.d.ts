import { type NationId, type PartyId, type RemovalMechanism } from "@admin/world";
import type { Effect } from "./effects.js";
import { type PolicyDomain, type PolicySet, type PolicyStance, type PolicyStatPath, type ProgramRestingOffset } from "./policy.js";
import { type NationBooks } from "./national-books.js";
import { type AlignmentVector, type Campaign, type NationRuntime } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
/**
 * A government's standing program, by nation. The player's own is
 * `campaign.player.policies`: it is charter-gated, drafted, priced and enacted
 * by a person, and none of that is true of anyone else's. `selectGovernment` is
 * the one read path across both, so a caller asking "what is this country
 * doing" never has to know which of the two it is asking about.
 */
export type GovernmentGraph = Readonly<Record<NationId, PolicySet>>;
export declare const GOVERNANCE_REVIEW_INTERVAL = 13;
/**
 * How well a government delivers what it decides.
 *
 * The player's figure is their minister's competence (`executionQuality`); a
 * nation with no cabinet in state has to be read from the state itself. A
 * corrupt administration loses part of every program on the way down, and one
 * nobody accepts as legitimate cannot make the country carry it — so the same
 * 0.6..1.4 band the player's ministers are scored on is spanned by the two
 * figures that decide whether an order given is an order carried out.
 */
export declare function governmentQuality(runtime: NationRuntime): number;
/**
 * What kind of state this is, on the same three axes the player accumulates by
 * governing. Read from live stats and traits rather than authored, so a country
 * that is drifting shut — press freedom falling, borders closing — starts
 * preferring the programs that suit what it has become.
 */
export declare function governmentCharacter(runtime: NationRuntime, governing?: PartyId): AlignmentVector;
/**
 * How much a government has to carry somebody else with it before it can
 * commit the country to something serious.
 *
 * Read off who can remove it, which is the structural fact rather than the
 * prose one: a cabinet that can lose a confidence vote this week cannot open a
 * front without the chamber, an elected government has to answer for it at a
 * date it does not control, and a junta or a throne answers to nobody it has
 * to persuade in advance. Charters are matched by id against the shipped
 * catalogue; a nation governed under a charter this build does not carry reads
 * as no drag, because a constitution nothing describes cannot be said to place
 * a body in the way.
 */
export declare const RATIFICATION_DRAG: Readonly<Record<RemovalMechanism, number>>;
export declare function ratificationDrag(runtime: NationRuntime): number;
export declare function audienceCost(runtime: NationRuntime): number;
/**
 * What a government losing its own hold does about it.
 *
 * Signed, because the two answers are opposite and the dataset says which one
 * this state reaches for: a shaky government whose elite is united reaches
 * outward for something to be seen winning, and a shaky government whose elite
 * is at each other's throats has no attention left to spend abroad. A secure
 * government reads zero either way — survival is not what it is deciding.
 */
export declare function regimeSurvivalDrive(runtime: NationRuntime): number;
/**
 * Where each stat actually sits across the world this campaign, per path.
 *
 * A government judges its own condition against the countries around it, not
 * against a schema. `economy.unemployment` is allowed 0..1 and no nation is
 * ever above a quarter of it, so measuring urgency against the schema range put
 * every state in the world within a few points of every other and nothing a
 * program did about unemployment could be worth more to one government than
 * to another. Measured against the spread that exists, the worst-affected state
 * reads 1 and the best reads 0, which is what "badly" means when a finance
 * ministry says it.
 */
export type WorldNorms = Readonly<Record<PolicyStatPath, readonly [number, number]>>;
export declare function worldNorms(nations: Readonly<Record<NationId, NationRuntime>>): WorldNorms;
/**
 * What a government's books look like to its own finance ministry, the part
 * of the purse the scorer cannot read off the stats: the rate its debt is
 * carried at, and whether a debt crisis is already open. A founding reads
 * neither and falls back on the rate its letter carries.
 */
export type PurseContext = {
    readonly books?: NationBooks;
    readonly inCrisis: boolean;
};
/**
 * How far this government's finance ministry is refusing things, 0..1: from
 * its debt as a share of output, its rating, and what its interest costs it
 * as a share of output. Strain starts where the trouble starts — measured from
 * zero, every state carries enough debt to register some and the accounts
 * decide every domain for everybody. A government already in a debt crisis is
 * at full strain, which is what makes it consolidate.
 */
export declare function purseStrain(runtime: NationRuntime, context?: PurseContext): number;
export type GovernmentStanceScore = {
    readonly stance: PolicyStance;
    readonly score: number;
    readonly needFit: number;
    readonly characterFit: number;
    readonly purseFit: number;
    readonly horizonFit: number;
    readonly ambition: number;
};
/**
 * Every stance in a domain, priced for this nation, best first. Exposed whole
 * rather than only its winner: the same read that lets an NPC's choice be
 * explained is the one a dossier or god mode needs to show why a country is
 * governed the way it is.
 */
export declare function scoreDomain(runtime: NationRuntime, domain: PolicyDomain, norms: WorldNorms, purse?: PurseContext, governing?: PartyId): readonly GovernmentStanceScore[];
/**
 * The program this nation would hold if it decided today. Pure in the
 * runtime: no rng, so two campaigns from one seed govern the world identically
 * and a replay cannot drift.
 */
export declare function chooseGovernmentProgram(runtime: NationRuntime, norms: WorldNorms, purse?: PurseContext, governing?: PartyId): PolicySet;
/** The books and the crisis a government reviewing its program this week is looking at. */
export declare function purseContext(campaign: Campaign, nation: NationId): PurseContext;
/** Every nation's opening program. The world is already governed at founding. */
export declare function openingGovernments(nations: Readonly<Record<NationId, NationRuntime>>, player: NationId): GovernmentGraph;
/** What a nation is running, whoever governs it. */
export declare function selectGovernment(campaign: Campaign, nation: NationId): PolicySet;
export declare function selectGovernmentStance(campaign: Campaign, nation: NationId, domain: PolicyDomain): PolicyStance;
export declare function reviewsProgramThisTurn(nation: NationId, turn: number): boolean;
/**
 * Where any nation's standing program puts the five rates `macro.ts` reverts.
 *
 * One reader for both halves of the world, because `macroDriftPhase` runs over
 * every nation on earth and must not have to know which of them has a cabinet
 * in state: the player's program is charter-gated and delivered by a named
 * minister, everyone else's is delivered by the state they have.
 */
export declare function programRestingOffset(campaign: Campaign, nation: NationId, override?: Partial<PolicySet>): ProgramRestingOffset;
/** `programRestingOffset` with no override, memoized on the campaign object it was read from. */
export declare function restingProgram(campaign: Campaign, nation: NationId): ProgramRestingOffset;
/**
 * The program a new government brings in, the week it is seated.
 *
 * A change of party does not wait for the season's review: the incoming
 * government reads its own platform against the country it has inherited and
 * adopts what that reading chooses, reported the way any change of program is.
 * Nothing is returned where the new government would keep what it found.
 */
export declare function programOfNewGovernment(campaign: Campaign, nation: NationId, party: PartyId | undefined): readonly Effect[];
/**
 * The world's week of governing, as one packet.
 *
 * One rather than fifty: a ledger that carried a line per country per week
 * would be unreadable, and the player's own record — the thing `actor` exists
 * to separate out — would be buried under it. What is worth naming individually
 * is a change of program, and that goes to the feed, where the player reads
 * about a world deciding things without them.
 */
export declare const governancePhase: TurnPhase;
