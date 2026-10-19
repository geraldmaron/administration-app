import type { AttentionSource } from "./attention.js";
import type { Campaign, GameDate } from "./state-campaign.js";
/**
 * The one entitlement key the paid tier sells under, restated here rather than
 * imported: the engine may not depend on the contracts package, and this layer
 * must still name the key its copy is about. The seam gate compares the two
 * files so the restatement cannot drift, and fails if either side grows a
 * second key.
 */
export type RuleEntitlementKey = "god-mode";
export type RuleKind = "setup" | "rate" | "rule" | "edit" | "view" | "clock";
export type RuleTier = "free" | "paid";
/** How a rule enters a decision. A free rule may only be an input or a slot. */
export type RuleInfluence = "input" | "slot" | "force";
/** Standard < Story < Sandbox. Stored, sticky, and never lowered. */
export type CampaignStatus = "standard" | "story" | "sandbox";
/**
 * A seam's census class: the family of call sites a rule crosses, which the
 * seam gate scans and classifies. Two of these name no scanned family:
 * `read-only` is a view rule that changes no decision, and `removal-arc` is a
 * single declaration no other site may reach, so there is nothing to sweep.
 */
export type SeamClass = "congressional-decision" | "us-debt-writer" | "election-settler" | "npc-military-path" | "war-outcome-draw" | "cabinet-exit" | "act-price" | "founding-edge" | "npc-actor-slot" | "projection" | "removal-arc" | "read-only";
/** A `path#declaration` site, the same key the seam census is written in. */
export type SeamSite = `${string}.ts#${string}`;
/**
 * Something a rule makes reachable or unreachable. Declared so the soak can
 * measure reach two ways: what a rule gains must equal `enables`, and what it
 * loses must equal `switchesOff`.
 */
export type Reach = {
    readonly kind: "ending" | "matter" | "act" | "reading";
    readonly id: string;
};
export type RuleCopy = {
    readonly name: string;
    /** What the rule holds, in the words a store listing and the seal both use. */
    readonly holds: string;
    /** What it costs the campaign — the status it takes, the endings it closes. */
    readonly costs: string;
    /** What a build without the entitlement shows instead of the control. */
    readonly locked?: string;
};
export type RuleDef<V extends RuleValue> = {
    readonly id: RuleId;
    readonly kind: RuleKind;
    readonly tier: RuleTier;
    /** `[0]` is the normal value: what every campaign reads unless a rule is set. */
    readonly values: readonly V[];
    /** One status per value, positionally. A length mismatch is a defect the tests catch. */
    readonly statuses: readonly CampaignStatus[];
    /**
     * One flag per value: whether that value is harder than the default. This is
     * what "Challenge" is read from, and it is per-value rather than derived
     * because only the rule's own author knows which direction is harder.
     */
    readonly harder: readonly boolean[];
    /** The one declaration the rule reaches the simulation at. */
    readonly seam: SeamSite;
    /** Every declaration allowed to reach the seam. The gate holds this list exactly. */
    readonly readers: readonly SeamSite[];
    readonly seamClass: SeamClass;
    readonly influence: RuleInfluence;
    /** The wave at which the rule is reachable by a player. Names a wave, not a date. */
    readonly readiness: string;
    readonly changes: "founding-only" | "logged-act";
    readonly switchesOff: readonly Reach[];
    readonly enables: readonly Reach[];
    /** Matter kinds whose outcome this rule fixes, which the clock then does not pause for. */
    readonly demotes: readonly AttentionSource[];
    readonly copy: RuleCopy;
    /** A paid rule names the key it is sold under. Free rules name none. */
    readonly entitlement?: RuleEntitlementKey;
    /** Ids are never reused. A retired rule stays here and reads as its default. */
    readonly retired?: true;
};
export type RuleValue = boolean | number | string;
/**
 * Every rule id and the type its values take. Declaring the pair here is what
 * makes `ruleValue` typed at each call site: the intel gate gets a boolean back
 * without a cast, and a rule added with no entry in the table below fails to
 * compile.
 */
type RuleValueTypes = {
    "information.omniscient": boolean;
    "removal.immune": boolean;
};
export type RuleId = keyof RuleValueTypes;
export declare const RULES: {
    readonly [Id in RuleId]: RuleDef<RuleValueTypes[Id]>;
};
export declare const RULE_IDS: readonly RuleId[];
/**
 * One dated entry in the campaign's rule log.
 *
 * The log is the whole history, which is what makes status a high-water mark
 * rather than a reading of the present: a paid option used once and set back is
 * still a Sandbox campaign, and the log is where that is written down.
 */
export type RuleChange = {
    readonly kind: "set";
    readonly rule: RuleId;
    readonly value: RuleValue;
    readonly date: GameDate;
} | {
    readonly kind: "suspend";
    readonly since: GameDate;
    readonly reason: string;
} | {
    readonly kind: "resume";
    readonly date: GameDate;
};
export type RuleSuspension = {
    readonly since: GameDate;
    readonly reason: string;
};
/** The day a change is dated, wherever the member happens to carry it. */
export declare function ruleChangeDate(change: RuleChange): GameDate;
export type RulesState = {
    readonly values: Readonly<Partial<{
        [Id in RuleId]: RuleValueTypes[Id];
    }>>;
    readonly log: readonly RuleChange[];
    readonly suspended?: RuleSuspension;
    /**
     * Per-rule bookkeeping a seam needs between weeks. The debt clamp keeps the
     * last figure it booked here, so a mid-week increase can be snapped back on
     * the books day without a second source of truth for it.
     */
    readonly state?: {
        readonly debtRule?: {
            readonly lastBooked: number;
        };
    };
};
/** Everything a read has had to fall back on, each said once. */
export declare function ruleReports(): readonly string[];
/** Between campaigns — a fresh session reports afresh. */
export declare function clearRuleReports(): void;
/**
 * What this campaign runs under for one rule, and the only way to ask.
 *
 * A paid rule reads its normal value while the campaign is suspended, and the
 * stored value is left alone — resuming restores it rather than re-deciding it.
 */
export declare function ruleValue<Id extends RuleId>(campaign: Campaign, id: Id): RuleValueTypes[Id];
/**
 * Whether this campaign sees everything — the one gate omniscience passes
 * through, so the three places a hidden thing can become legible cannot drift
 * apart from each other.
 */
export declare function omniscientRead(campaign: Campaign): boolean;
export type StatusReading = {
    readonly status: CampaignStatus;
    /**
     * Currently harder than the deal the seeded founding offers. A label, not a
     * status: it forfeits nothing, and it goes away when the setting goes back.
     */
    readonly challenge: boolean;
};
/**
 * What this campaign counts as, and whether it currently reads as a Challenge.
 *
 * The stored half is a high-water mark taken over the log, not over the current
 * values: a paid option used once and set back is still a Sandbox campaign. The
 * `godMode` flag survives as the marker of the same thing, so a campaign an
 * editor touched before this layer existed still reads Sandbox.
 */
export declare function campaignStatus(campaign: Campaign): StatusReading;
/**
 * Whether a set of stored values reads as a Challenge: at least one free option
 * currently sitting on a value its own author marked harder than the default.
 *
 * Takes the definitions rather than reading the registry so the reading can be
 * exercised before any free option is registered — the label has to be right the
 * first time one is, and a rule nothing can test yet is a rule nothing holds.
 */
export declare function challengeReading(defs: readonly RuleDef<RuleValue>[], values: Readonly<Record<string, RuleValue | undefined>>): boolean;
export {};
