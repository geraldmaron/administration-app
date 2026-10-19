import { ScenarioDef, ScenarioTopicTag, statedTollIn, TIME_FINDING_KINDS, type CorpusContext, type ScenarioContext } from "@admin/content";
import type { JobFile } from "../jobs/job-file.js";
import { buildUpgradeSections } from "./brief.js";
import { referenceExemplars } from "./reference.js";

/**
 * The three kinds of in-place revision the harness runs, each with its own
 * allowed-change contract enforced by `preservationFindings`. A scenario is
 * never regenerated to add a field, retime its commit-window prose, or move
 * a gate — it is handed back with exactly that change and nothing else.
 */
export type RevisionKind = "scenario-upgrade" | "scenario-retime" | "scenario-regate" | "scenario-bind" | "scenario-rejoin" | "scenario-arc" | "scenario-repair";

/** Every job kind this file's preservation contract knows how to check. */
export const REVISION_KINDS: ReadonlySet<string> = new Set<RevisionKind>([
  "scenario-upgrade",
  "scenario-retime",
  "scenario-regate",
  "scenario-bind",
  "scenario-rejoin",
  "scenario-arc",
  "scenario-repair",
]);

// Upgrading a shipped scenario in place, rather than regenerating it.
//
// 303 scenarios shipped before `context` and reply `impact` existed. The
// obvious move is to regenerate the corpus against the new brief, and it is
// the wrong one: those scenarios were reviewed, their flags are read by other
// scenarios, and their prose is what the near-duplicate index and the phrase
// carriers were built from. Regenerating throws all of that away to add two
// fields.
//
// So the job is narrow by construction. The writer is shown one existing
// scenario and asked for the same scenario with the two fields filled in —
// and the gate refuses anything else that moved, which is what makes "in
// place" a property the harness holds rather than an instruction the model
// was given.

/**
 * The preservation contract, as a list of paths that must survive untouched.
 *
 * Held as data rather than as a hand-written comparison so the gate's message
 * can name the field that moved, and so a field added to `ScenarioDef` later
 * fails loudly here (see `preservationFindings`) instead of being silently
 * rewritable.
 */
export const PRESERVED_KEYS = [
  "id",
  "class",
  "severity",
  "dilemmaShape",
  "motifs",
  "intelConfidence",
  "subject",
  "cast",
  "conditions",
  "weight",
  "boosts",
  "once",
  // Which arc this belongs to and where in it. An upgrade may not move a
  // scenario between families or change its role: the family is what pins the
  // arc's country, so rewriting it would re-aim every beat behind it.
  "family",
  "setPiece",
  "locus",
  "particulars",
  "scene",
  "opening",
  "transmission",
  // Lifecycle facts are the content lead's ledger, not the writer's: an
  // upgrade rewrites prose, and prose that changed topic or aged out is a
  // different scenario, not an upgrade of this one.
  "topics",
  // Same ledger as `topics`: which recurring fictional actors a scenario
  // names is a content-lead call, not something an in-place prose upgrade
  // gets to add or drop.
  "entities",
  "subjects",
  "eraAssumption",
  "staleAfter",
  "retired",
] as const;

/** Keys the upgrade is allowed to introduce. Everything else is preserved. */
// `premise` is how a week that reads no board state says why, so closing the premise debt is an upgrade that adds it.
export const ADDED_KEYS = new Set(["context", "premise", "responsibleOffice"]);

/**
 * Top-level `PRESERVED_KEYS` entries a kind other than `scenario-upgrade` may
 * change outright. Empty for `scenario-upgrade`: it preserves every one of
 * them and is allowed to add only `context` (handled separately, below,
 * exactly as it always has been). A retime does not touch a top-level key at
 * all — its one allowance is inside `context`, handled by `contextFindings` —
 * so its set is empty too. A regate is the one kind that may move a
 * top-level key: the gate it reads and the boost it leans on.
 */
const TOP_LEVEL_EXEMPT: Readonly<Record<RevisionKind, ReadonlySet<string>>> = {
  "scenario-upgrade": new Set(),
  "scenario-retime": new Set(),
  "scenario-regate": new Set(["conditions", "boosts"]),
  // A bind re-points a week at the thing that is actually happening. It moves
  // the locus (the place now follows the condition), the cast (trouble at home
  // gets the government bearing it instead of nobody), the gate it binds to, and
  // the beats where a hard-coded state name becomes the token that renders the
  // real one. Everything else — the subject, the replies, the prices, the
  // particulars, the arc — is the reviewed scenario and stays.
  "scenario-bind": new Set(["locus", "cast", "conditions", "opening"]),
  // A rejoin writes the room's answer to an order and touches nothing above the replies.
  "scenario-rejoin": new Set(),
  // An arc revision decides which story a scenario belongs to and how its close
  // ends; the membership is the one top-level fact it may move.
  "scenario-arc": new Set(["family"]),
  // A repair is a full replacement of a shipped body under its existing
  // identity. The gate below keeps its class and reply ids; the ordinary
  // audit, reachability, and fresh-draft binding contract judge the rest.
  "scenario-repair": new Set(),
};

/**
 * Findings the session driver's courtesy check leaves to the gate, by kind of
 * revision. The courtesy check sees the revised scenario and never the
 * original, so it cannot tell a defect the revision introduced from one the
 * shipped scenario already carried in a field this kind may not touch. The
 * gate can, and waives the inherited ones: showing them to a session is
 * showing it a finding whose only fix the preservation contract refuses.
 *
 * - Time findings, for every kind but a retime, whose own job they are.
 * - The two family-pairing findings, for an arc revision: a family is a pair,
 *   judged corpus-wide once both halves are written back.
 */
export function courtesyWaived(kind: string, findingKind: string): boolean {
  if (kind !== "scenario-retime" && TIME_FINDING_KINDS.has(findingKind)) return true;
  return kind === "scenario-arc" && (findingKind === "family-without-opener" || findingKind === "family-without-close");
}

/** Kinds that may not touch `context` at all. */
const CONTEXT_FROZEN: ReadonlySet<RevisionKind> = new Set(["scenario-regate", "scenario-rejoin", "scenario-arc"]);

function stable(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) => {
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const entries = Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
      return Object.fromEntries(entries) as unknown;
    }
    return inner;
  });
}

/**
 * `context` compared for a kind that does not get to leave it alone.
 *
 * `scenario-upgrade` never compares it — it is an `ADDED_KEYS` entry, free to
 * arrive or to be left as it was. `scenario-retime` may rewrite only the price
 * of silence, `context.inaction`, so every other field of `context` is
 * preserved here. `scenario-regate` may not touch prose at all, `context`
 * included, so the whole object is preserved.
 */
function contextFindings(original: ScenarioDef, revised: ScenarioDef, kind: RevisionKind): readonly string[] {
  if (kind === "scenario-upgrade") return [];
  if (CONTEXT_FROZEN.has(kind)) {
    return stable(original.context) === stable(revised.context) ? [] : [`"context" changed — a ${kind} may not touch it`];
  }
  const withoutInaction = (context: ScenarioContext | undefined): unknown => {
    if (!context) return context;
    const { inaction: _inaction, ...rest } = context;
    return rest;
  };
  return stable(withoutInaction(original.context)) === stable(withoutInaction(revised.context))
    ? []
    : ['"context" changed outside "inaction" — a retime may only rewrite the price of silence']; // scenario-retime
}

/**
 * A reply stripped for the `scenario-upgrade` comparison: everything but the
 * impact being added, and the one figure the impact replaces.
 *
 * `cost.treasury` and `impact.financial` are the same money said twice: a
 * hand-typed treasury figure is right for exactly one country, and the band is
 * what makes the same writing correct in a country of four million and one of
 * four hundred million. So the figure moves *into* the band and out of the
 * cost, and a reply carrying both bills the player for it twice. Not one reply
 * in the reference set carries both, which is the measurement this rule is
 * drawn from. Everything else on `cost` — stability, standing,
 * militaryReadiness — stays: those are facts about the government rather than
 * about the country, and no band replaces them.
 */
function stripForUpgrade(reply: Record<string, unknown>, dropTreasury: boolean): unknown {
  const commitment = reply.commitment as Record<string, unknown> | undefined;
  if (!commitment) return reply;
  const { impact: _impact, cost, ...rest } = commitment;
  const costs = { ...(cost as Record<string, unknown> | undefined) };
  if (dropTreasury) delete costs.treasury;
  return { ...reply, commitment: { ...rest, cost: costs } };
}

/**
 * A reply stripped for the `scenario-retime` comparison: the rejoinder's
 * `text` (never its `speaker`), the `remembered` line and the reply's own
 * `press` headline all come off before comparing — those are the whole of
 * what a retime may rewrite.
 */
function stripForRetime(reply: Record<string, unknown>): unknown {
  const commitment = reply.commitment as Record<string, unknown> | undefined;
  if (!commitment) {
    const { press: _press, ...rest } = reply;
    return rest;
  }
  const rejoinder = commitment.rejoinder as Record<string, unknown> | undefined;
  const { rejoinder: _rejoinder, remembered: _remembered, ...restCommitment } = commitment;
  const { text: _text, ...restRejoinder } = rejoinder ?? {};
  const { press: _press, ...restReply } = reply;
  return { ...restReply, commitment: { ...restCommitment, ...(rejoinder ? { rejoinder: restRejoinder } : {}) } };
}

/**
 * A reply stripped for the `scenario-rejoin` comparison: the rejoinder on an
 * instrument or join commitment, and nothing on a position, whose rejoinder is
 * already required and reviewed.
 */
function stripForRejoin(reply: Record<string, unknown>): unknown {
  const commitment = reply.commitment as Record<string, unknown> | undefined;
  if (!commitment || commitment.kind === "position") return reply;
  const { rejoinder: _rejoinder, ...rest } = commitment;
  return { ...reply, commitment: rest };
}

/**
 * A reply stripped for the `scenario-arc` comparison: how the arc ends, and
 * which flag the reply stamps. The flag is the arc's wiring — two setters
 * stamping one flag is exactly the tangle an arc revision exists to split —
 * and a rename that strands a reader is caught by the corpus-wide audit the
 * write-back runs, where every reader is in the pool.
 */
function stripForArc(reply: Record<string, unknown>): unknown {
  const { resolves: _resolves, sets: _sets, ...rest } = reply;
  return rest;
}

const REPLY_STRIPS: Partial<Record<RevisionKind, { readonly strip: (reply: Record<string, unknown>) => unknown; readonly allowed: string }>> = {
  "scenario-rejoin": { strip: stripForRejoin, allowed: "the rejoinder on an instrument or join commitment" },
  "scenario-arc": { strip: stripForArc, allowed: "how the arc ends (resolves) and the flags it sets" },
};

/**
 * What the revision changed that it was not allowed to change, for the given
 * revision kind. Empty means the revision is exactly the allowed change and
 * nothing else. Every other check the corpus runs — schema, audit,
 * near-duplicate — still applies on top of this; this one exists because none
 * of those can tell a rewritten scenario from a revised one.
 *
 * `kind` defaults to `scenario-upgrade` so every existing caller — the upgrade
 * gate, the upgrade tests — is unchanged by this becoming kind-aware.
 */
export function preservationFindings(original: ScenarioDef, revised: ScenarioDef, kind: RevisionKind = "scenario-upgrade"): readonly string[] {
  const findings: string[] = [];
  if (kind === "scenario-repair") {
    if (original.id !== revised.id) findings.push(`"id" changed — a repair must preserve the shipped identity`);
    if (original.class !== revised.class) findings.push(`"class" changed — a repair must stay in its shipped shard`);
    const beforeIds = original.replies.map((reply) => reply.id);
    const afterIds = revised.replies.map((reply) => reply.id);
    if (stable(beforeIds) !== stable(afterIds)) findings.push(`reply ids or order changed — a repair must preserve the decisions it replaces`);
    return findings;
  }
  const exempt = TOP_LEVEL_EXEMPT[kind];

  for (const key of PRESERVED_KEYS) {
    if (exempt.has(key)) continue;
    const before = (original as Record<string, unknown>)[key];
    const after = (revised as Record<string, unknown>)[key];
    if (stable(before) !== stable(after)) findings.push(`"${key}" changed — a ${kind} may not move it`);
  }
  findings.push(...contextFindings(original, revised, kind));

  // A field this file has never heard of, on either side. Reached when
  // `ScenarioDef` grows and nobody updates PRESERVED_KEYS, which would
  // otherwise mean the new field is quietly rewritable by a revision run.
  const known = new Set<string>([...PRESERVED_KEYS, ...ADDED_KEYS, "replies"]);
  for (const key of new Set([...Object.keys(original), ...Object.keys(revised)])) {
    if (!known.has(key)) findings.push(`"${key}" is not covered by the preservation contract — add it to PRESERVED_KEYS`);
  }

  if (original.replies.length !== revised.replies.length) {
    findings.push(`replies went from ${original.replies.length} to ${revised.replies.length} — a revision may not add or drop one`);
    return findings;
  }

  for (const [index, before] of original.replies.entries()) {
    const after = revised.replies[index];
    if (!after) {
      findings.push(`reply ${index + 1} is missing from the revision`);
      continue;
    }
    if (before.id !== after.id) {
      findings.push(`reply ${index + 1}: id changed from "${before.id}" to "${after.id}"`);
      continue;
    }

    if (kind === "scenario-regate") {
      if (stable(before) !== stable(after)) {
        findings.push(`reply "${before.id}" changed — a regate may only change conditions and boosts`);
      }
      continue;
    }

    const narrow = REPLY_STRIPS[kind];
    if (narrow) {
      const strip = (reply: unknown) => stable(narrow.strip(reply as Record<string, unknown>));
      if (strip(before) !== strip(after)) findings.push(`reply "${before.id}" changed outside ${narrow.allowed} — a ${kind} may change nothing else`);
      continue;
    }

    if (kind === "scenario-retime") {
      if (stable(stripForRetime(before as unknown as Record<string, unknown>)) !== stable(stripForRetime(after as unknown as Record<string, unknown>))) {
        findings.push(`reply "${before.id}" changed outside its rejoinder text, remembered line or press headline — a retime may only rewrite commit-time prose`);
      }
      continue;
    }

    // scenario-upgrade: everything on a reply except the impact being added,
    // and except the treasury figure a financial band replaces.
    const financial = (after.commitment as { impact?: { financial?: { scale?: string } } } | undefined)?.impact?.financial?.scale;
    const banded = financial !== undefined && financial !== "none";
    const hadTreasury = (before.commitment as { cost?: { treasury?: number } } | undefined)?.cost?.treasury !== undefined;
    const keptTreasury = (after.commitment as { cost?: { treasury?: number } } | undefined)?.cost?.treasury !== undefined;

    if (hadTreasury && !keptTreasury && !banded) {
      findings.push(`reply "${before.id}" dropped its treasury cost without declaring a financial band to carry it`);
    }
    if (hadTreasury && keptTreasury && banded) {
      findings.push(`reply "${before.id}" declares a financial band and keeps its treasury figure — that bills the same money twice`);
    }
    if (
      stable(stripForUpgrade(before as unknown as Record<string, unknown>, banded)) !==
      stable(stripForUpgrade(after as unknown as Record<string, unknown>, banded))
    ) {
      findings.push(`reply "${before.id}" changed outside its impact — the upgrade may only add impact to a commitment`);
    }
  }

  return findings;
}

/**
 * What a scenario is still missing, so a run can be pointed at the ones that
 * need it rather than at all 303 — and so a second pass over a partly upgraded
 * corpus does no work twice.
 */
export function needsUpgrade(def: ScenarioDef): boolean {
  if (!def.context) return true;
  // Only a "position" commitment carries an impact; an instrument commitment
  // is priced by the engine and has nothing to declare. The bar is the audit's
  // own — at least one answer that spends something — and not every position
  // reply, because a reply whose fiction authorizes nothing is *correct* to
  // declare nothing, and requiring one from it selects that scenario forever:
  // a pass over a partly upgraded corpus would hand the same finished
  // scenarios back on every run and never converge.
  if (def.replies.some((reply) => reply.commitment?.kind === "position" && reply.commitment.impact)) return false;
  // Mirrors the audit exactly, and has to: a scenario the audit is content
  // with that this selector still wants comes back in every wave, to be
  // rewritten by an author who has nothing honest left to add. A briefing with
  // a toll in it owes a declaration and is selected until it has one. A
  // briefing with none may be a week where no answer spends anything, which
  // the audit reports for a reviewer to judge rather than refuses.
  const briefing = [def.subject, ...def.opening.map((beat) => beat.text), def.transmission?.text ?? ""].join(" ");
  return statedTollIn(briefing) !== undefined;
}

/**
 * The corpus an upgrade is judged against: the shipped pool minus the two
 * indexes that are guaranteed to refuse a correct upgrade.
 *
 * `installedIds` refuses a re-used id, and an upgrade's id is required to be
 * exactly the one already shipped. `overlapIndex` refuses a near-duplicate of
 * the corpus, and the nearest thing in that corpus is this scenario's own
 * shipped self, whose opening and particulars the upgrade may not touch.
 *
 * `phraseCarriers` and `readFlags` are kept, which is why this is a
 * subtraction rather than an empty context: the pass adds a couple of hundred
 * words of new prose per scenario, and stock-phrasing over the shipped pool is
 * exactly the check new prose needs.
 *
 * Shared by the runner's gate and the session driver's courtesy validator so
 * the two cannot disagree about what a clean upgrade is — a disagreement whose
 * only symptom is a session rewriting a scenario to satisfy a finding the gate
 * was never going to raise.
 */
export function upgradeCorpusContext(scenarios: CorpusContext | undefined): CorpusContext | undefined {
  if (!scenarios) return undefined;
  // The family indexes are kept too: a revision of an arc's opener is judged
  // against the close that already ships, or every re-gate of an opener would
  // be refused for a pairing it is not allowed to touch.
  return {
    phraseCarriers: scenarios.phraseCarriers,
    readFlags: scenarios.readFlags,
    ...(scenarios.familyOpeners ? { familyOpeners: scenarios.familyOpeners } : {}),
    ...(scenarios.familyCloses ? { familyCloses: scenarios.familyCloses } : {}),
  };
}

export function buildUpgradeBrief(original: ScenarioDef): string {
  return [
    "Upgrade one existing scenario for a political simulation game. Return the SAME ScenarioDef as a JSON object,",
    "with two things added and NOTHING else changed.",
    "",
    "WHAT TO ADD",
    '  1. A "context" object on the scenario — the section below defines it.',
    '  2. An "impact" on the commitment of every reply whose fiction has a body count, displaced people, money',
    "     that had to be authorized, or a capability spent. A reply whose commitment already carries an impact",
    "     keeps the one it has.",
    "",
    "THE ONE THING YOU MUST REMOVE",
    '  A reply whose new impact declares a "financial" scale must DELETE the "treasury" figure from its "cost".',
    "  They are the same money said twice, and a reply carrying both bills the player for it twice. The band is",
    "  what makes the writing correct in a country of four million and one of four hundred million; the typed",
    '  figure was only ever right for one. Leave "stability", "standing" and "militaryReadiness" on the cost exactly as',
    "  they are — those are facts about the government, and no band replaces them. If a reply's fiction spends",
    "  no money, declare no financial scale and leave its treasury figure alone.",
    "",
    "WHAT MAY NOT CHANGE — this is checked field by field and a revision that moved anything else is refused",
    "outright, however much better the new version reads:",
    `  ${PRESERVED_KEYS.map((key) => `"${key}"`).join(", ")}, and every reply's id, tone, text, sets, effects and cost.`,
    "  Do not fix a typo. Do not tighten a sentence. Do not rebalance a cost. This scenario was reviewed and",
    "  shipped; you are briefing it, not rewriting it. If something in it is genuinely wrong, leave it wrong —",
    "  it is a separate pass by a human, and a silent fix here is indistinguishable from a regeneration.",
    "",
    ...buildUpgradeSections(),
    "",
    "THE BAR — the approved reference set, which carries both fields written the way they should read:",
    "",
    ...referenceExemplars().map((exemplar) => JSON.stringify(exemplar, null, 1)),
    "",
    "THE SCENARIO TO UPGRADE:",
    "",
    JSON.stringify(original, null, 1),
    "",
    "Return ONLY the JSON object. No commentary.",
  ].join("\n");
}

export type UpgradeSelection = {
  readonly pending: readonly ScenarioDef[];
  /**
   * Pending scenarios `--before` left out because they carry no `staleAfter`
   * to compare against — reported so a caller can say so, rather than the
   * count going silent.
   */
  readonly undated: number;
};

/**
 * Narrow an already-pending set by `--topic` and/or `--before`.
 *
 * `--topic` reads `topics`, the same closed vocabulary `auditTopicTags`
 * enforces: an untagged scenario is unclassified, not a member of every
 * topic, so it is simply not selected rather than matched by default.
 *
 * `--before` reads `staleAfter`, which only content with `eraAssumption:
 * "dated"` carries (see `scenario-topics.ts`). A pool mixes dated and
 * evergreen content, and a date filter over both has no honest answer for
 * the evergreen half — matching it would be wrong in one direction, dropping
 * it silently is wrong in the other. So `--before` selects only dated
 * content whose `staleAfter` falls before the cutoff, and every scenario it
 * left out for having no date at all is counted in `undated` instead of
 * disappearing into "not selected" the same way a merely off-topic one does.
 */
export function selectUpgradeCandidates(pending: readonly ScenarioDef[], topic?: ScenarioTopicTag, before?: string): UpgradeSelection {
  const byTopic = topic === undefined ? pending : pending.filter((def) => (def.topics ?? []).includes(topic));
  if (before === undefined) return { pending: byTopic, undated: 0 };
  const dated = byTopic.filter((def): def is ScenarioDef & { staleAfter: string } => def.eraAssumption === "dated" && def.staleAfter !== undefined);
  return { pending: dated.filter((def) => def.staleAfter < before), undated: byTopic.length - dated.length };
}

/**
 * One item per scenario, deliberately.
 *
 * A batch of ten in one prompt is cheaper and is how generation runs, but the
 * failure modes differ: a generation batch that comes back short has produced
 * nine good scenarios, while an upgrade batch that comes back short has
 * dropped a shipped one on the floor. One item per scenario means the journal
 * names exactly which scenarios were upgraded, and a resumed run cannot
 * re-upgrade one that already was.
 */
export function upgradeJob(id: string, driver: JobFile["driver"], originals: readonly ScenarioDef[]): JobFile {
  return {
    id,
    kind: "scenario-upgrade",
    driver,
    items: originals.map((original) => ({
      id: `${id}-${original.id}`,
      payload: { prompt: buildUpgradeBrief(original), original: original as unknown as Record<string, unknown> },
    })),
  };
}
