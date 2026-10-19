import { arcLedger, DilemmaShape, ScenarioClass, ScenarioSeverity, type ScenarioDef } from "@admin/content";

// What the corpus is short of, measured the way the planning pass measures it:
// volume per class against its tier target, the cast and severity mix inside
// each class, thin dilemma shapes, and arcs with dead branches. Written into the
// kit as NEEDS.md so an outside author, or an in-repo session told only "make
// what is needed", picks cells from the same numbers.

type Tier = "spine" | "regular" | "punctuation";

/**
 * The tiers and per-class volumes the corpus is planned at for its second
 * version (about 2,000 scenarios). Spine classes are the weeks a presidency is
 * mostly made of; punctuation classes are rare by design, and writing them up
 * to spine volume would make them ordinary.
 */
const CLASS_TIER: Readonly<Record<ScenarioClass, Tier>> = {
  "foreign-crisis": "spine",
  economy: "spine",
  unrest: "spine",
  institution: "spine",
  scandal: "spine",
  terror: "regular",
  disaster: "regular",
  migration: "regular",
  "public-health": "regular",
  justice: "regular",
  war: "regular",
  espionage: "regular",
  tragedy: "punctuation",
  hostage: "punctuation",
  technology: "punctuation",
  culture: "punctuation",
  death: "punctuation",
  triumph: "punctuation",
};
const TIER_TARGET: Readonly<Record<Tier, number>> = { spine: 165, regular: 110, punctuation: 70 };

// Band casts are the largest share because they scale with the dataset: one
// such week can land on dozens of governments, where a "closest" week is live
// only for a player who has made a friend.
const CAST_TARGET = { band: 0.35, tensest: 0.25, closest: 0.1, none: 0.3 } as const;
type PlannedCast = keyof typeof CAST_TARGET;
const SEVERITY_TARGET: Readonly<Record<ScenarioSeverity, number>> = { routine: 0.4, serious: 0.4, critical: 0.2 };

/**
 * Issues held back until the engine models them as standing law with its own
 * state, levers and audits. A scenario about one written before then would be
 * priced by the generic metrics alone, which is exactly the flattening the
 * contested-issues program exists to remove.
 */
export const CONTESTED_ISSUES = [
  "abortion and reproductive care",
  "guns",
  "immigration enforcement policy (border and arrival crises in the migration class stay open)",
  "race and civil rights",
  "voting and elections law",
  "LGBTQ issues",
  "policing and criminal-justice policy",
  "religion and speech",
  "drugs",
  "education policy",
  "climate regulation",
  "labor law as a culture-war issue",
  "healthcare mandates",
  "national symbols",
] as const;

const CELL_COUNT = 4;
const CELLS_OFFERED = 10;
const ARCS_OFFERED = 12;

type ClassMeasure = {
  readonly klass: ScenarioClass;
  readonly have: number;
  readonly target: number;
  readonly casts: Readonly<Record<PlannedCast | "other", number>>;
  readonly severities: Readonly<Record<ScenarioSeverity, number>>;
};

function measure(klass: ScenarioClass, bodies: readonly ScenarioDef[]): ClassMeasure {
  const mine = bodies.filter((def) => def.class === klass);
  const castOf = (def: ScenarioDef): PlannedCast | "other" => (def.cast.pick in CAST_TARGET ? (def.cast.pick as PlannedCast) : "other");
  const count = <K extends string>(keys: readonly K[], key: (def: ScenarioDef) => K) =>
    Object.fromEntries(keys.map((k) => [k, mine.filter((def) => key(def) === k).length])) as Record<K, number>;
  return {
    klass,
    have: mine.length,
    target: TIER_TARGET[CLASS_TIER[klass]],
    casts: count(["band", "tensest", "closest", "none", "other"], castOf),
    severities: count(ScenarioSeverity.options, (def) => def.severity),
  };
}

/** The key whose share is furthest below its target once one more cell lands. */
function shortest<K extends string>(targets: Readonly<Record<K, number>>, have: Readonly<Record<K, number>>, total: number): K {
  const keys = Object.keys(targets) as K[];
  const gap = (key: K) => targets[key] * (total + CELL_COUNT) - have[key];
  return keys.reduce((best, key) => (gap(key) > gap(best) ? key : best), keys[0]!);
}

export type SuggestedCell = { readonly cell: string; readonly why: string };

/**
 * Cells in the order a planner should take them: the class furthest below its
 * target first, each with the cast and severity it is shortest of. War weeks
 * are cast on the war itself, so a war cell always reads the live front.
 */
export function suggestCells(bodies: readonly ScenarioDef[]): readonly SuggestedCell[] {
  return ScenarioClass.options
    .map((klass) => measure(klass, bodies))
    .sort((a, b) => a.have / a.target - b.have / b.target || a.klass.localeCompare(b.klass))
    .slice(0, CELLS_OFFERED)
    .map((m) => {
      const cast = m.klass === "war" ? "warCounterpart" : shortest<PlannedCast>(CAST_TARGET, m.casts, m.have);
      const severity = shortest(SEVERITY_TARGET, m.severities, m.have);
      return {
        cell: `${m.klass}:${cast}:${severity}:${CELL_COUNT}`,
        why: `${m.have} of ${m.target} (${Math.round((100 * m.have) / m.target)}%); shortest of ${cast} casts and ${severity} weeks`,
      };
    });
}

const pct = (part: number, whole: number) => (whole === 0 ? "-" : `${Math.round((100 * part) / whole)}%`);

function classTable(bodies: readonly ScenarioDef[]): readonly string[] {
  return [
    "| class | tier | have | target | band | tensest | closest | none | other | routine | serious | critical |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...ScenarioClass.options.map((klass) => {
      const m = measure(klass, bodies);
      const casts = (["band", "tensest", "closest", "none", "other"] as const).map((cast) => pct(m.casts[cast], m.have));
      const severities = ScenarioSeverity.options.map((severity) => pct(m.severities[severity], m.have));
      return `| ${klass} | ${CLASS_TIER[klass]} | ${m.have} | ${m.target} | ${[...casts, ...severities].join(" | ")} |`;
    }),
  ];
}

function arcSection(bodies: readonly ScenarioDef[]): readonly string[] {
  const ledger = arcLedger(bodies);
  const worst = [...ledger.lopsided].sort((a, b) => b.dead.length - a.dead.length || a.scenario.localeCompare(b.scenario));
  return [
    `${ledger.lopsided.length} arcs are lopsided (some answers come back later, others never do), carrying ${ledger.deadBranches} dead`,
    `branches; ${ledger.silent.length} more set flags nothing reads at all. A reader for a dead branch is a scenario gated on`,
    'that branch\'s flag ({ "kind": "flag", "flag": "<flag>", "is": true, "agedAtLeast": 6 }); DEEDS.md has what each',
    "setter left behind. The worst first:",
    "",
    ...worst.slice(0, ARCS_OFFERED).flatMap((arc) => [
      `- ${arc.scenario} (${arc.class}) — ${arc.subject}`,
      ...arc.dead.map((branch) => `  - dead: ${branch.reply} → ${branch.flags.join(", ")}`),
    ]),
  ];
}

function shapeLine(bodies: readonly ScenarioDef[]): string {
  const counts = DilemmaShape.options
    .map((shape) => ({ shape, n: bodies.filter((def) => def.dilemmaShape === shape).length }))
    .sort((a, b) => a.n - b.n || a.shape.localeCompare(b.shape));
  return counts.map(({ shape, n }) => `${shape} ${n}`).join(", ");
}

export function kitNeeds(bodies: readonly ScenarioDef[]): string {
  return [
    "# What the corpus needs",
    "",
    `Measured from the ${bodies.length} scenarios the game ships. Use it when nobody has told you what to write, and to`,
    "pick the cells for a topic you were given. Priorities, in order: readers for dead arc branches, the cells below,",
    "thin dilemma shapes, then plain volume. Write four or five scenarios per cell; more reads as one week written",
    "five ways.",
    "",
    "## Not yet: contested issues",
    "",
    "Do not write scenarios whose subject is one of these. The game is building them as standing issues with their own",
    "law, levers and audits, and a scenario written before that lands would be priced wrong:",
    "",
    ...CONTESTED_ISSUES.map((issue) => `- ${issue}`),
    "",
    "## Suggested cells",
    "",
    "Each cell takes the cast and severity its class is shortest of. Where that cast cannot carry the class's",
    "scope (a week CATALOG.md describes as foreign with no counterpart in it), take the next shortest instead.",
    "",
    ...suggestCells(bodies).map((cell) => `- ${cell.cell} — ${cell.why}`),
    "",
    "## Arcs waiting for a reader",
    "",
    ...arcSection(bodies),
    "",
    "## Volume and mix by class",
    "",
    `Targets: about ${TIER_TARGET.spine} per spine class, ${TIER_TARGET.regular} per regular, ${TIER_TARGET.punctuation} per punctuation. Inside each class,`,
    "casts at 35% band, 25% tensest, 10% closest, 30% none, and severities at 40% routine, 40% serious, 20% critical.",
    '"other" counts the special casts (war, outlet, bills, courts and the rest).',
    "",
    ...classTable(bodies),
    "",
    "## Dilemma shapes, thinnest first",
    "",
    shapeLine(bodies),
    "",
  ].join("\n");
}
