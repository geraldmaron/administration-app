import { DEFAULT_REGIME_ACT, lethalRefusal, outstandingInstrumentActs, outstandingIssuedAuthorizationActs, selectLiveMeasures, tradeSector, type Campaign, type RegimeAct } from "@admin/engine";
import type { ForceAssetId, NationId } from "@admin/world";
import { tariffLaws, type TariffLawRow } from "./tariff-law";
import { formatDate } from "../format/figures";
import { bilateralTradePartners } from "../world/trade-partners";
import { coalitionReading } from "../world/coalition";
import { forcePackageFor, holdingCount } from "../world/nation-forces";
import { authorizationAssessment, engagementAssessment, tariffAssessment, treatyAssessment } from "./assessment-ties";
import { instrumentAssessment, type ActAssessment } from "./assessment";
import { ACT_GOALS, ACT_GOAL_COPY, ACT_OPTIONS, actOption, familiesOfGoal, optionsForGoal, type ActConfig, type ActFamily, type ActGoal, type ActGoalCopy, type ActOption } from "./catalogue";
import { DEFAULT_TARIFF_RATE, previewOptions, tariffDraft, tariffableSectors, type OptionPreview } from "./preview";
import { optionEffects, type OptionEffects } from "./option-effects";
import { prerequisiteOf, type Prerequisite } from "./prerequisite";

// The act workspace for one government, as a view model: the objective the
// President is after, the acts that serve it with each one priced beside the
// others, the terms the chosen act takes, the assessment against doing
// nothing, and what is already under way.

export type OptionView = {
  readonly option: ActOption;
  readonly preview: OptionPreview;
  /** What it moves, where the engine can say before it is taken. */
  readonly effects?: OptionEffects;
  /** What a locked option is waiting on, and the open acts that build it. */
  readonly prerequisite?: Prerequisite;
  /** The staff's full reading of an open option, so a row can show its risks and reactions before it is picked. */
  readonly assessment?: ActAssessment;
};

/** An option the President set beside others, with its full reading against doing nothing for the detail row. */
export type ComparedView = OptionView & { readonly assessment: ActAssessment };

export type GoalView = ActGoalCopy & { readonly goal: ActGoal; readonly open: number };

export type FamilyView = { readonly family: ActFamily; readonly name: string; readonly options: readonly OptionView[] };

/** One goal's options in the list, in their runs, with how many can be taken now. */
export type GoalSection = GoalView & { readonly families: readonly FamilyView[] };

export type ForceTerms = {
  readonly min: number;
  readonly max: number;
  readonly count: number;
  /** What is sent, so a screen can draw its glyph and unit. */
  readonly unitType: ForceAssetId;
  /** The chosen package as a sentence carries it: "4 destroyers". */
  readonly countText: string;
  readonly preferredText: string;
  readonly availableText?: string;
  readonly closedReason?: string;
  readonly purpose: string;
  readonly sizing?: string;
};

export type SupportTerms = {
  readonly mode: "unilateral" | "seek";
  readonly partners: readonly { readonly nation: NationId; readonly name: string; readonly compact: string; readonly chosen: boolean }[];
};

export const STRIKE_OBJECTIVES = [
  { value: "military-capacity", label: "Military targets", detail: "Hit their troops and the weapons they fight with." },
  { value: "logistics", label: "Supply lines", detail: "Hit the roads, depots, and supplies that keep their troops going. Civilians are at more risk." },
  { value: "infrastructure", label: "Dual-use targets", detail: "Power, ports and networks that support the military. Lawyers must find each one a military objective, and the civilian harm expected must not be excessive. Civilian outages and deaths are the main risk." },
] as const;

export type StrikeTerms = {
  readonly objective: (typeof STRIKE_OBJECTIVES)[number]["value"];
  readonly protection: "standard" | "additional-assessment";
};

export type TariffTerms = {
  readonly sectors: readonly { readonly sector: string; readonly name: string }[];
  readonly sector: string;
  readonly rate: number;
  readonly standing: number;
  readonly room: number;
  /** The law this tariff rests on, and every law it could rest on with its standing. */
  readonly law: TariffLawRow;
  readonly laws: readonly TariffLawRow[];
};

/** The operations a covert regime action can run, with the lethal one listed only in an armed conflict with the target or against an imminent threat from it. */
export type RegimeTerms = {
  readonly act: RegimeAct;
  readonly options: readonly { readonly value: RegimeAct; readonly label: string; readonly detail: string }[];
};

export type ActTerms = {
  readonly regime?: RegimeTerms;
  readonly force?: ForceTerms;
  readonly support?: SupportTerms;
  readonly strike?: StrikeTerms;
  readonly tariff?: TariffTerms;
};

export type UnderWayRow = {
  readonly kind: "operation" | "authorization" | "measure";
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  /** Whether the President can end it from here. */
  readonly endable: boolean;
};

export type ActWorkspace = {
  readonly nation: NationId;
  readonly name: string;
  readonly goal: ActGoal | undefined;
  readonly goals: readonly GoalView[];
  readonly families: readonly FamilyView[];
  /** Every goal the list shows: the one filtered to, or all of them in order, each read for what its options move and need. */
  readonly sections: readonly GoalSection[];
  readonly chosen: OptionView | undefined;
  readonly terms: ActTerms;
  readonly assessment: ActAssessment | undefined;
  /** The options set side by side, in the order they were added; empty until two are picked. */
  readonly compared: readonly ComparedView[];
  /** The locked option a building act was opened for, so its receipt can lead back. */
  readonly then?: OptionView;
  readonly underway: readonly UnderWayRow[];
};

function termsFor(campaign: Campaign, nation: NationId, option: ActOption, config: ActConfig): ActTerms {
  const ref = option.ref;
  if (ref.kind === "tariff") {
    const draft = tariffDraft(campaign, nation, config.sector, config.rate, config.statute);
    return draft
      ? { tariff: { sectors: tariffableSectors(campaign, nation).map((edge) => ({ sector: edge.sector, name: tradeSector(edge.sector)?.name ?? edge.sector })), sector: draft.sector.sector, rate: draft.rate, standing: draft.standing, room: draft.room, law: draft.law, laws: tariffLaws(campaign, nation, draft.sector.sector) } }
      : {};
  }
  if (ref.kind !== "instrument") return {};
  const choice = ref.instrument === "military" ? forcePackageFor(campaign, ref.rung, nation) : undefined;
  const count = Math.min(choice?.composed.max ?? 0, Math.max(choice?.composed.min ?? 0, config.count ?? choice?.composed.defaultCount ?? 0));
  const force: ForceTerms | undefined = choice
    ? {
        min: choice.composed.min,
        max: choice.composed.max,
        count,
        unitType: choice.composed.spec.unitType,
        countText: holdingCount(choice.composed.spec.unitType, count),
        preferredText: holdingCount(choice.composed.spec.unitType, choice.composed.spec.preferred),
        ...(choice.composed.available !== undefined ? { availableText: `${holdingCount(choice.composed.spec.unitType, choice.composed.available)} free this week` } : {}),
        ...(choice.composed.closedReason ? { closedReason: choice.composed.closedReason } : {}),
        purpose: choice.brief.purpose,
        ...(choice.sizing ? { sizing: `Sized to match ${choice.sizing.targetName}'s ${choice.sizing.arm}.` } : {}),
      }
    : undefined;
  const asks = ref.instrument === "economic" || ref.instrument === "military";
  const chosen = new Set(config.partners ?? []);
  const support: SupportTerms | undefined = asks
    ? {
        mode: config.support ?? "unilateral",
        partners: coalitionReading(campaign, nation).backers.map((backer) => ({ nation: backer.nation, name: backer.name, compact: backer.compact.name, chosen: chosen.has(backer.nation) })),
      }
    : undefined;
  const strike: StrikeTerms | undefined = ref.instrument === "military" && ref.rung === 4 ? { objective: config.strikeObjective ?? "military-capacity", protection: config.civilianProtection ?? "standard" } : undefined;
  const regime = ref.instrument === "covert" && ref.rung === 5 && !ref.regimeAct ? regimeTerms(campaign, nation, config) : undefined;
  return { ...(force ? { force } : {}), ...(support ? { support } : {}), ...(strike ? { strike } : {}), ...(regime ? { regime } : {}) };
}

const REGIME_OPTIONS: readonly { readonly value: RegimeAct; readonly label: string; readonly detail: string }[] = [
  { value: "coup-support", label: "Back a move against the government", detail: "An ongoing operation that makes it more likely the country's own military takes over. Its effect fades over months. Whoever takes over leans your way for a while." },
  { value: "political-action", label: "Work against it at the polls", detail: "An ongoing operation that weakens the government at its next election, or the next time its parliament votes on keeping it. It's quieter than backing a coup, and slower." },
  { value: "kill", label: "Lethal operation against its leader", detail: "Removes the leader from power right away. The ban on assassination (Executive Order 12333, §2.11, and 18 U.S.C. §1116) stays in force. It's offered only while the country is in an armed conflict with this government or faces an imminent threat from it, never against an ally, and it needs a standing finding. If it comes out, expect an investigation." },
];

function regimeTerms(campaign: Campaign, target: NationId, config: ActConfig): RegimeTerms {
  const options = REGIME_OPTIONS.filter((option) => option.value !== "kill" || lethalRefusal(campaign, campaign.founding.nation, target) === undefined);
  const act = options.some((option) => option.value === config.regimeAct) ? config.regimeAct! : DEFAULT_REGIME_ACT;
  return { act, options };
}

function assessmentFor(campaign: Campaign, nation: NationId, view: OptionView, config: ActConfig): ActAssessment {
  switch (view.option.ref.kind) {
    case "instrument":
      return instrumentAssessment(campaign, nation, view.option, view.preview, config);
    case "engagement":
      return engagementAssessment(campaign, nation, view.option, view.preview);
    case "treaty":
      return treatyAssessment(campaign, nation, view.option, view.preview);
    case "tariff":
      return tariffAssessment(campaign, nation, view.option, view.preview, config.sector, config.rate ?? DEFAULT_TARIFF_RATE, config.statute);
    case "authorization":
      return authorizationAssessment(campaign, nation, view.option, view.preview);
  }
}

/** What the President already has moving against this government, and the measures in force on it. */
export function underWayAgainst(campaign: Campaign, nation: NationId): readonly UnderWayRow[] {
  const operations = outstandingInstrumentActs(campaign)
    .filter((act) => act.request.target === nation)
    .map((act): UnderWayRow => ({ kind: "operation", id: act.id, title: act.title, detail: `Being prepared. First report by ${formatDate(act.dueDate)}. Its money and forces are set aside.`, endable: true }));
  const asks = outstandingIssuedAuthorizationActs(campaign)
    .filter((act) => act.target === nation)
    .map((act): UnderWayRow => ({ kind: "authorization", id: act.id, title: "Congress is voting", detail: `The House and Senate answer by ${formatDate(act.dueDate)}. The forecast was ${act.forecast.likelihood}.`, endable: false }));
  const measures = bilateralTradePartners(campaign, nation)?.measures ?? [];
  const lifts = selectLiveMeasures(campaign).filter((measure) => measure.target === nation && measure.origin === "us");
  const standing = lifts.map((measure): UnderWayRow => {
    const row = measures.find((entry) => entry.id === measure.id);
    return { kind: "measure", id: measure.id, title: row ? `${row.kindWord}${row.rateText ? ` of ${row.rateText}` : ""} on ${row.sectorName.toLowerCase()}` : measure.id, detail: `In force since ${row?.since ?? formatDate(measure.imposedDate)}.`, endable: true };
  });
  return [...operations, ...asks, ...standing];
}

/**
 * Each option with what it moves and, where it is locked on a
 * reading of the relationship, what that reading needs and which of the open
 * options build it. A locked rung is read for its effects only when the gate
 * that closed it is one an act can open.
 */
function readOptions(campaign: Campaign, nation: NationId, options: readonly ActOption[], previews: ReadonlyMap<string, OptionPreview>, config: ActConfig): ReadonlyMap<string, OptionView> {
  const own = (option: ActOption): ActConfig => (actOption(config.option)?.id === option.id ? config : {});
  const read = options.map((option) => {
    const preview = previews.get(option.id)!;
    const effects = option.ref.kind !== "instrument" || preview.state === "open" ? optionEffects(campaign, nation, option, own(option)) : undefined;
    return { option, preview, ...(effects ? { effects } : {}) };
  });
  const views = read.map((entry): OptionView => {
    const prerequisite = prerequisiteOf(campaign, nation, entry, read, own(entry.option));
    const effects = entry.effects ?? (prerequisite ? optionEffects(campaign, nation, entry.option, own(entry.option)) : undefined);
    return { ...entry, ...(effects ? { effects } : {}), ...(prerequisite ? { prerequisite } : {}) };
  });
  return new Map(views.map((entry) => [entry.option.id, entry]));
}

/** The options the address sets side by side: known ids only, each once, read against doing nothing. */
function comparedOf(campaign: Campaign, nation: NationId, config: ActConfig, view: (option: ActOption) => OptionView): readonly ComparedView[] {
  const options = [...new Set(config.compare ?? [])].flatMap((id) => {
    const option = actOption(id);
    return option ? [option] : [];
  });
  return options.map((option) => {
    const entry = view(option);
    const own = actOption(config.option)?.id === option.id ? config : {};
    return { ...entry, assessment: entry.assessment ?? assessmentFor(campaign, nation, entry, own) };
  });
}

/** The workspace for one government, or undefined for the President's own country and an id the board does not carry. */
export function actWorkspace(campaign: Campaign, nation: NationId, config: ActConfig = {}): ActWorkspace | undefined {
  const runtime = campaign.nations[nation];
  if (!runtime || nation === campaign.founding.nation) return undefined;
  const previews = previewOptions(campaign, nation, ACT_OPTIONS, config);
  const asked = actOption(config.option);
  // The goal is a filter over one list, so an option picked or compared from another goal stays picked.
  const goal = config.goal;
  const shown = goal ? [goal] : ACT_GOALS;
  // Every option is read, not only the filtered ones: an act from any goal can build a locked one, and a compared option may sit outside the filter.
  const views = readOptions(campaign, nation, ACT_OPTIONS, previews, config);
  // An open option carries its full reading (about 3 ms each), each read on its own terms only when it is the one being set.
  const assessed = (entry: OptionView): OptionView => (entry.preview.state === "open" ? { ...entry, assessment: assessmentFor(campaign, nation, entry, actOption(config.option)?.id === entry.option.id ? config : {}) } : entry);
  const read = new Map([...views].map(([id, entry]) => [id, assessed(entry)]));
  const view = (option: ActOption): OptionView => read.get(option.id)!;
  const chosen = asked ? view(asked) : undefined;
  const then = actOption(config.then);
  const goals = ACT_GOALS.map((entry): GoalView => ({ goal: entry, ...ACT_GOAL_COPY[entry], open: optionsForGoal(entry).filter((option) => previews.get(option.id)?.state === "open").length }));
  const familiesOf = (entry: ActGoal): readonly FamilyView[] => familiesOfGoal(entry).map((family) => ({ family: family.family, name: family.name, options: family.options.map(view) }));
  return {
    nation,
    name: runtime.base.identity.name,
    goal,
    goals,
    families: goal ? familiesOf(goal) : [],
    sections: goals.filter((entry) => shown.includes(entry.goal)).map((entry) => ({ ...entry, families: familiesOf(entry.goal) })),
    chosen,
    terms: chosen ? termsFor(campaign, nation, chosen.option, config) : {},
    assessment: chosen ? assessmentFor(campaign, nation, chosen, config) : undefined,
    compared: comparedOf(campaign, nation, config, view),
    ...(then ? { then: view(then) } : {}),
    underway: underWayAgainst(campaign, nation),
  };
}

// A tariff order on several goods is read and built by its own fold, beside the workspace that offers it.
export { buildTariffPackage, readTariffPackage, type TariffGood, type TariffGoodReading, type TariffPackageBuild, type TariffPackageReading } from "./tariff-package";
