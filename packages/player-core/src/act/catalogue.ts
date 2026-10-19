import {
  type RegimeAct,
  ENGAGEMENT_KINDS,
  INSTRUMENT_RUNGS,
  TREATY_TERMS,
  type EngagementKind,
  type InstrumentId,
  type IssuedInstrumentAct,
  type RungLevel,
  type TariffStatute,
  type TreatyKind,
} from "@admin/engine";
import { subjectHrefWith } from "../shell/subject";

// Everything the President can do to one foreign government, sorted by what
// the President wants from it. The catalogue is read off the engine's own
// tables (the instrument ladder, the engagement kinds, the treaty kinds) so a
// rung, a kind of meeting or a kind of treaty the engine gains lands under a
// goal without anyone listing it here. Only the rule that sorts them is
// authored, and it is a rule about instruments, not a list of options.

export const ACT_GOALS = ["ties", "trade", "pressure", "covert", "force"] as const;
export type ActGoal = (typeof ACT_GOALS)[number];

export type ActOptionRef =
  | { readonly kind: "engagement"; readonly engagement: EngagementKind }
  | { readonly kind: "treaty"; readonly treaty: TreatyKind }
  | { readonly kind: "instrument"; readonly instrument: InstrumentId; readonly rung: RungLevel; readonly regimeAct?: RegimeAct }
  | { readonly kind: "tariff" }
  | { readonly kind: "authorization" };

/** The run of options a goal's list is broken into, so fourteen ways to build ties read as three kinds of act. */
export type ActFamily = "meet" | "sign" | "assist" | "tariff" | "diplomatic" | "justice" | "economic" | "covert" | "military" | "congress";

export type ActOption = {
  /** Stable and URL-safe: the engine's rung id, or the kind of act and its own kind. */
  readonly id: string;
  readonly goal: ActGoal;
  readonly family: ActFamily;
  readonly name: string;
  readonly ref: ActOptionRef;
};

export type ActGoalCopy = { readonly name: string; readonly question: string; readonly line: string };

export const ACT_GOAL_COPY: Readonly<Record<ActGoal, ActGoalCopy>> = {
  ties: { name: "Build ties", question: "Bring them closer", line: "Calls, visits, treaties and aid" },
  trade: { name: "Trade", question: "Change what we trade", line: "Tariffs and trade warnings" },
  pressure: { name: "Pressure", question: "Make them change course", line: "Diplomatic steps and sanctions" },
  covert: { name: "Covert", question: "Act in secret", line: "Intelligence operations" },
  force: { name: "Force", question: "Use the military", line: "From training exercises to invasion, and asking Congress" },
};

export const ACT_FAMILY_NAMES: Readonly<Record<ActFamily, string>> = {
  meet: "Meet them",
  sign: "Put it in writing",
  assist: "Help them",
  tariff: "Tax their goods",
  diplomatic: "Diplomatic pressure",
  justice: "Justice Department",
  economic: "Economic measures",
  covert: "Covert action",
  military: "Military force",
  congress: "Ask Congress first",
};

const ENGAGEMENT_NAMES: Readonly<Record<EngagementKind, string>> = {
  call: "Phone call",
  envoy: "Send an envoy",
  visit: "State visit",
  summit: "Summit",
  declaration: "Joint declaration",
};

// Above its second rung the economic ladder stops being a trade measure and
// becomes a sanction: designations, frozen assets and an embargo are made to
// change a government's course, which is what a player reaching for pressure
// is looking for. The first two rungs (a warning to business, a general
// tariff increase) are trade policy.
const TRADE_RUNG_CEILING = 2;

const INSTRUMENT_GOAL: Readonly<Record<InstrumentId, (rung: RungLevel) => ActGoal>> = {
  diplomatic: () => "pressure",
  economic: (rung) => (rung <= TRADE_RUNG_CEILING ? "trade" : "pressure"),
  covert: () => "covert",
  military: () => "force",
  assistance: () => "ties",
};

const INSTRUMENT_FAMILY: Readonly<Record<InstrumentId, ActFamily>> = {
  diplomatic: "diplomatic",
  economic: "economic",
  covert: "covert",
  military: "military",
  assistance: "assist",
};

/** Which goal an instrument rung serves. */
export function goalOfRung(instrument: InstrumentId, rung: RungLevel): ActGoal {
  return INSTRUMENT_GOAL[instrument](rung);
}

function engagementOptions(): readonly ActOption[] {
  return ENGAGEMENT_KINDS.map((engagement) => ({
    id: `engagement-${engagement}`,
    goal: "ties",
    family: "meet",
    name: ENGAGEMENT_NAMES[engagement],
    ref: { kind: "engagement", engagement },
  }));
}

function treatyOptions(): readonly ActOption[] {
  return (Object.keys(TREATY_TERMS) as TreatyKind[]).map((treaty) => ({
    id: `treaty-${treaty}`,
    goal: "ties",
    family: "sign",
    name: TREATY_TERMS[treaty].name,
    ref: { kind: "treaty", treaty },
  }));
}

function rungOptions(): readonly ActOption[] {
  return [...INSTRUMENT_RUNGS]
    .filter((rung) => rung.id !== "economic-2")
    .sort((a, b) => a.rung - b.rung)
    .map((rung) => ({
      id: rung.id,
      goal: goalOfRung(rung.instrument, rung.rung),
      family: INSTRUMENT_FAMILY[rung.instrument],
      name: rung.name,
      ref: { kind: "instrument", instrument: rung.instrument, rung: rung.rung },
    }));
}

const TARIFF: ActOption = { id: "tariff", goal: "trade", family: "tariff", name: "Tariff under a trade law", ref: { kind: "tariff" } };
// Capture and indictment ride the covert regime slot as a request field only; the player meets them as a force act and a Justice Department act.
const INDICT: ActOption = { id: "indict", goal: "pressure", family: "justice", name: "Seek an indictment of its leader", ref: { kind: "instrument", instrument: "covert", rung: 5, regimeAct: "indict" } };
const CAPTURE: ActOption = { id: "capture", goal: "force", family: "military", name: "Apprehend an indicted leader", ref: { kind: "instrument", instrument: "covert", rung: 5, regimeAct: "capture" } };
const AUTHORIZATION: ActOption = { id: "authorization", goal: "force", family: "congress", name: "Ask Congress to authorize force", ref: { kind: "authorization" } };

// The order families read in within a goal: the gentlest kind of act first.
const FAMILY_ORDER: readonly ActFamily[] = ["meet", "sign", "assist", "diplomatic", "justice", "economic", "tariff", "covert", "military", "congress"];

/** Every option, in the order a goal lists them. */
export const ACT_OPTIONS: readonly ActOption[] = [...engagementOptions(), ...treatyOptions(), ...rungOptions(), INDICT, CAPTURE, TARIFF, AUTHORIZATION]
  .map((option, index) => ({ option, index }))
  .sort((a, b) => FAMILY_ORDER.indexOf(a.option.family) - FAMILY_ORDER.indexOf(b.option.family) || a.index - b.index)
  .map(({ option }) => option);

export function isActGoal(value: string | undefined): value is ActGoal {
  return value !== undefined && (ACT_GOALS as readonly string[]).includes(value);
}

export function optionsForGoal(goal: ActGoal): readonly ActOption[] {
  return ACT_OPTIONS.filter((option) => option.goal === goal);
}

export function actOption(id: string | undefined): ActOption | undefined {
  return id === "economic-2" ? TARIFF : id === undefined ? undefined : ACT_OPTIONS.find((option) => option.id === id);
}

/** A goal's options in their runs, each run named once. */
export function familiesOfGoal(goal: ActGoal): readonly { readonly family: ActFamily; readonly name: string; readonly options: readonly ActOption[] }[] {
  const options = optionsForGoal(goal);
  const families = [...new Set(options.map((option) => option.family))];
  return families.map((family) => ({ family, name: ACT_FAMILY_NAMES[family], options: options.filter((option) => option.family === family) }));
}

/** The settings an instrument option is read under: a capture or an indictment fixes the regime act, whatever the address names. */
export function configUnder(ref: ActOptionRef, config: ActConfig): ActConfig {
  if (ref.kind !== "instrument") return config;
  if (ref.regimeAct) return { ...config, regimeAct: ref.regimeAct };
  if (ref.instrument === "covert" && ref.rung === 5 && (config.regimeAct === "capture" || config.regimeAct === "indict")) {
    const { regimeAct: _regimeAct, ...rest } = config;
    return rest;
  }
  return config;
}

/** The option an instrument rung is, for the addresses that still name the instrument. */
export function optionForRung(instrument: InstrumentId, rung: RungLevel): ActOption | undefined {
  return instrument === "economic" && rung === 2 ? TARIFF : ACT_OPTIONS.find((option) => option.ref.kind === "instrument" && option.ref.instrument === instrument && option.ref.rung === rung && option.ref.regimeAct === undefined);
}

export type ActConfig = {
  readonly goal?: ActGoal;
  readonly option?: string;
  /** How many units a military rung sends. */
  readonly count?: number;
  /** The goods a tariff lands on, and its rate in whole percent. */
  readonly sector?: string;
  readonly rate?: number;
  /** Several goods in one tariff order, each at its own added rate; when set, the order covers these and `sector`/`rate` name the first. */
  readonly goods?: readonly { readonly sector: string; readonly rate: number }[];
  /** The trade law a tariff is imposed under. */
  readonly statute?: TariffStatute;
  readonly support?: "unilateral" | "seek";
  readonly partners?: readonly string[];
  readonly strikeObjective?: "military-capacity" | "logistics" | "infrastructure";
  readonly civilianProtection?: "standard" | "additional-assessment";
  /** Which operation a covert regime action runs. */
  readonly regimeAct?: RegimeAct;
  /** A standing thing to end instead of a new act: an operation to call off or a measure to lift. */
  readonly manage?: string;
  /** The options set side by side. */
  readonly compare?: readonly string[];
  /** The locked option this act was opened to build toward, which its receipt leads back to. */
  readonly then?: string;
};

/** The act workspace for one government, opened on a goal and an option where one is given. */
export function actHref(nation: string, config: ActConfig = {}): string {
  const goal = config.goal ?? actOption(config.option)?.goal;
  const query: Record<string, string> = {
    ...(goal ? { goal } : {}),
    ...(config.option ? { option: config.option } : {}),
    ...(config.count !== undefined ? { count: String(config.count) } : {}),
    ...(config.sector ? { sector: config.sector } : {}),
    ...(config.rate !== undefined ? { rate: String(config.rate) } : {}),
    ...(config.statute ? { statute: config.statute } : {}),
    ...(config.support ? { support: config.support } : {}),
    ...(config.partners?.length ? { partners: config.partners.join(",") } : {}),
    ...(config.strikeObjective ? { strikeObjective: config.strikeObjective } : {}),
    ...(config.civilianProtection ? { civilianProtection: config.civilianProtection } : {}),
    ...(config.regimeAct ? { regimeAct: config.regimeAct } : {}),
    ...(config.manage ? { manage: config.manage } : {}),
    ...(config.compare?.length ? { compare: config.compare.join(",") } : {}),
    ...(config.then ? { then: config.then } : {}),
  };
  return subjectHrefWith({ kind: "nationAct", id: nation }, query);
}

/** Reopen the authorized operation without replacing its selected terms with defaults. */
export function issuedInstrumentHref(act: IssuedInstrumentAct): string {
  return `${actHref(act.request.target, {
    option: act.request.regimeAct === "capture" || act.request.regimeAct === "indict" ? act.request.regimeAct : `${act.request.instrument}-${act.request.rung}`,
    ...(act.request.force ? { count: act.request.force.count } : {}),
    ...(act.request.support ? { support: act.request.support.mode, partners: act.request.support.partners } : {}),
    ...(act.request.strikeObjective ? { strikeObjective: act.request.strikeObjective } : {}),
    ...(act.request.civilianProtection ? { civilianProtection: act.request.civilianProtection } : {}),
    ...(act.request.regimeAct ? { regimeAct: act.request.regimeAct } : {}),
  })}#${encodeURIComponent(`operation-${act.id}`)}`;
}
