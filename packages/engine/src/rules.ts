// The world-rules registry: every setting that changes how the simulation runs,
// declared in one table instead of scattered as flags.
//
// The problem this replaces: one boolean with five readers. God mode was a
// single flag that meant omniscience, removal immunity and unrankability all at
// once, so nothing could be sold, suspended, explained or measured
// independently, and a reader added later inherited all three meanings whether
// or not it wanted them. Here each rule is its own entry with its own seam, its
// own declared readers and its own copy, and the only way to read one is
// `ruleValue`.
//
// What this layer promises, and what the seam gate proves:
//
//   One seam per rule. A rule reaches the simulation at exactly one declaration.
//   That is what keeps a projection and the week it projects from disagreeing,
//   and it is what makes a sentence about what a rule holds checkable.
//
//   The engine never reads an entitlement. A rule that is paid for is stored
//   like any other; whether this device has paid is the app shell's question,
//   and the shell answers it by writing a dated suspension through `apply()`
//   like any other act. Nothing here imports a store, a receipt or a platform.
//
//   Status never falls. A campaign that has used a paid option is marked for
//   good. "Challenge" is the opposite: a reading of the settings as they stand
//   now, which disappears the moment they go back to their defaults.

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
export type SeamClass =
  | "congressional-decision"
  | "us-debt-writer"
  | "election-settler"
  | "npc-military-path"
  | "war-outcome-draw"
  | "cabinet-exit"
  | "act-price"
  | "founding-edge"
  | "npc-actor-slot"
  | "projection"
  | "removal-arc"
  | "read-only";

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

export const RULES: { readonly [Id in RuleId]: RuleDef<RuleValueTypes[Id]> } = {
  "information.omniscient": {
    id: "information.omniscient",
    kind: "view",
    tier: "paid",
    values: [false, true],
    statuses: ["standard", "sandbox"],
    harder: [false, false],
    seam: "rules.ts#omniscientRead",
    readers: [
      "state-selectors.ts#hasIntelOnRelationship",
      "state-selectors.ts#hasIntelOnNation",
      "npc-turn.ts#feedVisibility",
    ],
    seamClass: "read-only",
    influence: "force",
    readiness: "WR.0 re-key; sold at WR",
    changes: "logged-act",
    switchesOff: [],
    enables: [
      { kind: "reading", id: "relationships-between-third-parties" },
      { kind: "reading", id: "foreign-government-internals" },
      { kind: "reading", id: "covert-activity-nobody-caught" },
    ],
    demotes: [],
    copy: {
      name: "Omniscience",
      holds: "Every government's file and every tie between third parties is legible, whatever your services can reach.",
      costs: "The campaign is marked Sandbox and is never ranked. Nothing is written: this changes what you are shown and nothing the world holds.",
      locked: "Part of the God mode DLC in the Steam desktop build.",
    },
    entitlement: "god-mode",
  },
  "removal.immune": {
    id: "removal.immune",
    kind: "rule",
    tier: "paid",
    values: [false, true],
    statuses: ["standard", "sandbox"],
    harder: [false, false],
    seam: "removal.ts#advanceRemovalArc",
    readers: [],
    seamClass: "removal-arc",
    influence: "force",
    readiness: "WR.0 re-key; sold at WR",
    changes: "logged-act",
    switchesOff: [{ kind: "ending", id: "removal" }],
    enables: [],
    demotes: [],
    copy: {
      name: "Removal immunity",
      holds: "The removal arc stops one beat short of the end. Pressure still computes and every earlier beat still fires.",
      costs: "The campaign is marked Sandbox and is never ranked, and the removal ending can no longer happen to it.",
      locked: "Part of the God mode DLC in the Steam desktop build.",
    },
    entitlement: "god-mode",
  },
};

export const RULE_IDS: readonly RuleId[] = Object.keys(RULES) as RuleId[];

/**
 * A lookup that admits a stored id this build does not know. Every read of a
 * loaded save needs one: ids are never reused and never refused, so a save
 * written by a later build can carry a key that is not in the table.
 */
function definitionOf(id: string): RuleDef<RuleValue> | undefined {
  return (RULES as Readonly<Record<string, RuleDef<RuleValue>>>)[id];
}

// --- What is stored ----------------------------------------------------------

/**
 * One dated entry in the campaign's rule log.
 *
 * The log is the whole history, which is what makes status a high-water mark
 * rather than a reading of the present: a paid option used once and set back is
 * still a Sandbox campaign, and the log is where that is written down.
 */
export type RuleChange =
  | { readonly kind: "set"; readonly rule: RuleId; readonly value: RuleValue; readonly date: GameDate }
  | { readonly kind: "suspend"; readonly since: GameDate; readonly reason: string }
  | { readonly kind: "resume"; readonly date: GameDate };

export type RuleSuspension = { readonly since: GameDate; readonly reason: string };

/** The day a change is dated, wherever the member happens to carry it. */
export function ruleChangeDate(change: RuleChange): GameDate {
  return change.kind === "suspend" ? change.since : change.date;
}

export type RulesState = {
  readonly values: Readonly<Partial<{ [Id in RuleId]: RuleValueTypes[Id] }>>;
  readonly log: readonly RuleChange[];
  readonly suspended?: RuleSuspension;
  /**
   * Per-rule bookkeeping a seam needs between weeks. The debt clamp keeps the
   * last figure it booked here, so a mid-week increase can be snapped back on
   * the books day without a second source of truth for it.
   */
  readonly state?: { readonly debtRule?: { readonly lastBooked: number } };
};

// --- Reports -----------------------------------------------------------------

// A stored value this build cannot honor is a fact the player deserves told
// once, not a crash and not silence: a save is never refused over a rule. The
// engine does no I/O, so a report is collected here and the shell reads it.
const reports: string[] = [];
const reported = new Set<string>();

function report(message: string): void {
  if (reported.has(message)) return;
  reported.add(message);
  reports.push(message);
}

/** Everything a read has had to fall back on, each said once. */
export function ruleReports(): readonly string[] {
  return [...reports];
}

/** Between campaigns — a fresh session reports afresh. */
export function clearRuleReports(): void {
  reports.length = 0;
  reported.clear();
}

// --- Reading -----------------------------------------------------------------

/**
 * What this campaign runs under for one rule, and the only way to ask.
 *
 * A paid rule reads its normal value while the campaign is suspended, and the
 * stored value is left alone — resuming restores it rather than re-deciding it.
 */
export function ruleValue<Id extends RuleId>(campaign: Campaign, id: Id): RuleValueTypes[Id] {
  const def = RULES[id];
  const normal = def.values[0];
  if (normal === undefined) throw new Error(`rule "${id}" declares no values, so it has no normal reading`);
  reportStrays(campaign);
  if (def.retired) {
    report(`rule "${id}" is retired; it reads as its normal value`);
    return normal;
  }
  if (def.tier === "paid" && campaign.rules?.suspended) return normal;
  const stored = campaign.rules?.values?.[id];
  // Both paid rules are boolean-valued, which is what makes the marker readable
  // as one of their values at all; the paired test holds that.
  if (stored === undefined) return (handEntered(campaign, def) as RuleValueTypes[Id] | undefined) ?? normal;
  if (!def.values.includes(stored)) {
    report(`rule "${id}" holds the value ${JSON.stringify(stored)}, which this build does not offer; it reads as its normal value`);
    return normal;
  }
  return stored as RuleValueTypes[Id];
}

/**
 * What a campaign entered by hand already means, for a campaign the rules layer
 * has never written to.
 *
 * Every god-mode builder turns the marker on, not just the one that announces
 * itself: amending a single nation's record sets it the same way entering
 * deliberately does. Both paid rules used to be read straight off that marker,
 * so a campaign amended by hand was omniscient and immune without ever naming a
 * rule. Reading the marker here keeps that exactly true while the values stay
 * unwritten, which is the same equivalence a legacy save is normalized with, at
 * the same condition: once anything has written a value the stored value and a
 * suspension govern instead, and this never speaks again.
 */
function handEntered(campaign: Campaign, def: { readonly tier: RuleTier }): boolean | undefined {
  if (def.tier !== "paid" || campaign.rules !== undefined) return undefined;
  return campaign.godMode?.enabled === true ? true : undefined;
}

/** Stored ids this build no longer knows. Reported, never refused, never read. */
function reportStrays(campaign: Campaign): void {
  const stored = campaign.rules?.values;
  if (!stored) return;
  for (const id of Object.keys(stored)) {
    if (!definitionOf(id)) report(`rule "${id}" is not a rule this build knows; it is kept and ignored`);
  }
}

/**
 * Whether this campaign sees everything — the one gate omniscience passes
 * through, so the three places a hidden thing can become legible cannot drift
 * apart from each other.
 */
export function omniscientRead(campaign: Campaign): boolean {
  return ruleValue(campaign, "information.omniscient");
}

// --- Status ------------------------------------------------------------------

export type StatusReading = {
  readonly status: CampaignStatus;
  /**
   * Currently harder than the deal the seeded founding offers. A label, not a
   * status: it forfeits nothing, and it goes away when the setting goes back.
   */
  readonly challenge: boolean;
};

const ORDER: readonly CampaignStatus[] = ["standard", "story", "sandbox"];

function highest(a: CampaignStatus, b: CampaignStatus): CampaignStatus {
  return ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a;
}

/**
 * What this campaign counts as, and whether it currently reads as a Challenge.
 *
 * The stored half is a high-water mark taken over the log, not over the current
 * values: a paid option used once and set back is still a Sandbox campaign. The
 * `godMode` flag survives as the marker of the same thing, so a campaign an
 * editor touched before this layer existed still reads Sandbox.
 */
export function campaignStatus(campaign: Campaign): StatusReading {
  let status: CampaignStatus = campaign.godMode?.enabled === true ? "sandbox" : "standard";
  for (const change of campaign.rules?.log ?? []) {
    if (change.kind !== "set") continue;
    const def = definitionOf(change.rule);
    if (!def) continue;
    const at = def.values.indexOf(change.value);
    if (at < 0) continue;
    status = highest(status, def.statuses[at] ?? "standard");
  }
  return { status, challenge: readsAsChallenge(campaign) };
}

/**
 * Whether a set of stored values reads as a Challenge: at least one free option
 * currently sitting on a value its own author marked harder than the default.
 *
 * Takes the definitions rather than reading the registry so the reading can be
 * exercised before any free option is registered — the label has to be right the
 * first time one is, and a rule nothing can test yet is a rule nothing holds.
 */
export function challengeReading(
  defs: readonly RuleDef<RuleValue>[],
  values: Readonly<Record<string, RuleValue | undefined>>,
): boolean {
  return defs.some((def) => {
    const current = values[def.id];
    if (def.tier !== "free" || current === undefined) return false;
    const at = def.values.indexOf(current);
    return at > 0 && def.harder[at] === true;
  });
}

function readsAsChallenge(campaign: Campaign): boolean {
  return challengeReading(
    RULE_IDS.map((id) => RULES[id]),
    campaign.rules?.values ?? {},
  );
}
