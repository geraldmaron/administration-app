import { TREATY_TERMS, counterpartTrustFloor, engagementHold, hasIntelOnNation, selectRelationship, type Campaign, type EngagementHold } from "@admin/engine";
import type { NationId } from "@admin/world";
import { stanceForPressure, stanceForTrust, trustWord } from "../format/figures";
import { configUnder, type ActConfig, type ActOption } from "./catalogue";
import type { EffectMark, OptionEffects, RelationshipKey } from "./option-effects";
import { instrumentDraft, instrumentProjection, type OptionPreview } from "./preview";

// What a locked option is waiting on, read off the gate that closed it: which
// reading of the relationship, where it stands, the floor it has to reach, and
// the open acts that move it. The floors are the engine's own (the engagement
// holds carry theirs, a treaty's is in its terms, a rung's comes back on its
// refused gate), so a floor the engine moves moves the reading with it.

export type PrerequisiteReading = Extract<RelationshipKey, "ourTrust" | "theirTrust" | "tension">;

/** An open act that moves the reading toward its floor, with how far one of it goes. */
export type Builder = {
  readonly option: ActOption;
  /** One of it on each reading it moves, on that reading's own scale; drawn, never printed. */
  readonly steps: Partial<Record<PrerequisiteReading, number>>;
  /** Its largest step toward the gap, which orders the builders. */
  readonly step: number;
};

export type Requirement = {
  readonly reading: PrerequisiteReading;
  readonly label: string;
  /** Where it stands, -1..1; absent when the services have no read on their side. */
  readonly have?: number;
  readonly need: number;
  /** Both said as the band words every surface uses, never as figures. */
  readonly haveWord: string;
  readonly needWord: string;
  readonly met: boolean;
};

export type Prerequisite = {
  readonly requirements: readonly Requirement[];
  /** Whether any act the President can take moves it; a summit's call for tension is not something to build. */
  readonly buildable: boolean;
  /** The open acts that close the gap, the largest step first. */
  readonly builders: readonly Builder[];
  /** What it needs and what to do, in a sentence or two. */
  readonly line: string;
};

const LABELS: Readonly<Record<PrerequisiteReading, string>> = { ourTrust: "Your trust in them", theirTrust: "Their trust in you", tension: "Tension between you" };
const TENSION_WORDS = { favorable: "Low", neutral: "Manageable", caution: "Rising", adverse: "High" } as const;

function bandWord(reading: PrerequisiteReading, value: number): string {
  return reading === "tension" ? TENSION_WORDS[stanceForPressure(value)] : trustWord(stanceForTrust(value));
}

function requirement(reading: PrerequisiteReading, have: number | undefined, need: number): Requirement {
  return {
    reading,
    label: LABELS[reading],
    ...(have === undefined ? {} : { have }),
    need,
    haveWord: have === undefined ? "Unknown" : bandWord(reading, have),
    needWord: bandWord(reading, need),
    met: have !== undefined && have >= need,
  };
}

function theirSide(campaign: Campaign, nation: NationId, value: number): number | undefined {
  return hasIntelOnNation(campaign, nation) ? value : undefined;
}

function engagementRequirements(campaign: Campaign, nation: NationId, hold: EngagementHold): readonly Requirement[] {
  switch (hold.kind) {
    case "host-distrusts":
      return [requirement("theirTrust", theirSide(campaign, nation, hold.theirs), hold.need)];
    case "too-little-trust":
      return [requirement("ourTrust", hold.ours, hold.need), requirement("theirTrust", theirSide(campaign, nation, hold.theirs), hold.need)];
    case "too-calm":
      return [requirement("tension", hold.tension, hold.need)];
    case "cooldown":
    case "no-relationship":
      return [];
  }
}

function requirementsOf(campaign: Campaign, nation: NationId, option: ActOption, config: ActConfig): readonly Requirement[] {
  const ref = option.ref;
  const home = campaign.founding.nation;
  if (ref.kind === "engagement") {
    const hold = engagementHold(campaign, { actor: home, target: nation, kind: ref.engagement });
    return hold ? engagementRequirements(campaign, nation, hold) : [];
  }
  if (ref.kind === "treaty") {
    const ours = selectRelationship(campaign, home, nation)?.trust;
    const need = TREATY_TERMS[ref.treaty].minTrust;
    if (ours !== undefined && ours < need) return [requirement("ourTrust", ours, need)];
    // Past our own floor, a refusal is theirs: where their trust would have to stand for them to sign, if trust can get them there at all.
    const theirs = selectRelationship(campaign, nation, home)?.trust;
    const floor = counterpartTrustFloor(campaign, nation, ref.treaty);
    return theirs !== undefined && floor !== undefined && floor > theirs && floor <= 1 ? [requirement("theirTrust", theirSide(campaign, nation, theirs), floor)] : [];
  }
  if (ref.kind === "instrument") {
    const projected = instrumentProjection(campaign, instrumentDraft(campaign, nation, ref.instrument, ref.rung, config.count, configUnder(ref, config)));
    return !projected.ok && projected.shortfall ? [requirement("ourTrust", projected.shortfall.have, projected.shortfall.need)] : [];
  }
  return [];
}

export type OptionReading = { readonly option: ActOption; readonly preview: OptionPreview; readonly effects?: OptionEffects };

function buildersFor(readings: readonly PrerequisiteReading[], options: readonly OptionReading[], locked: ActOption): readonly Builder[] {
  const moves = (mark: EffectMark) => readings.includes(mark.key as PrerequisiteReading) && mark.key !== "tension" && mark.delta > 0;
  return options
    .filter((entry) => entry.option.id !== locked.id && entry.preview.state === "open")
    .flatMap((entry): Builder[] => {
      const marks = entry.effects?.marks.filter(moves) ?? [];
      if (marks.length === 0) return [];
      const steps = Object.fromEntries(marks.map((mark) => [mark.key, mark.delta])) as Partial<Record<PrerequisiteReading, number>>;
      return [{ option: entry.option, steps, step: Math.max(...marks.map((mark) => mark.delta)) }];
    })
    .sort((a, b) => b.step - a.step);
}

/** The open act that moves one reading furthest, for the tick on that reading's meter. */
export function bestBuilderFor(prerequisite: Prerequisite, reading: PrerequisiteReading): Builder | undefined {
  return [...prerequisite.builders].filter((builder) => builder.steps[reading] !== undefined).sort((a, b) => b.steps[reading]! - a.steps[reading]!)[0];
}

function lineOf(unmet: readonly Requirement[], buildable: boolean, builders: readonly Builder[]): string {
  const needs = unmet.map((entry) => `${entry.label.toLowerCase()} to reach ${entry.needWord}`).join(" and ");
  if (!buildable) return "This one isn't needed right now. A summit is for two governments that are badly at odds.";
  const unknown = unmet.some((entry) => entry.have === undefined);
  const first = `This needs ${needs}.`;
  if (builders.length === 0) return `${first} Nothing you can do this week moves it. Check again next week.`;
  const best = builders[0]!;
  const closes = !unknown && unmet.every((entry) => (entry.have ?? 0) + (best.steps[entry.reading] ?? 0) >= entry.need);
  return `${first} ${best.option.name} is the biggest step you can take now.${closes ? " One would be enough." : " It will take more than one step to get there."}`;
}

/** What a locked option is waiting on, or undefined when it is open or the gate that closed it is not a reading of the relationship. */
export function prerequisiteOf(campaign: Campaign, nation: NationId, entry: OptionReading, options: readonly OptionReading[], config: ActConfig = {}): Prerequisite | undefined {
  if (entry.preview.state !== "held") return undefined;
  const requirements = requirementsOf(campaign, nation, entry.option, config);
  const unmet = requirements.filter((item) => !item.met);
  if (unmet.length === 0) return undefined;
  const buildable = unmet.every((item) => item.reading !== "tension");
  const builders = buildable ? buildersFor(unmet.map((item) => item.reading), options, entry.option) : [];
  return { requirements, buildable, builders, line: lineOf(unmet, buildable, builders) };
}
