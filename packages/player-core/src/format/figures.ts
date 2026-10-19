import { TREASURY_REFERENCE, type GameDate, type InstrumentId, type MetricSet, type OpinionDriver } from "@admin/engine";
import { WHITE_HOUSE_ROLE_TITLES } from "@admin/world";
import { formatMoney, type MoneyFormatter } from "./money";
import { STANCE_THRESHOLDS } from "../reading";

// A drawn clock is colored by the same arithmetic the summons run on, so a
// window reads "closing" on a document exactly when the Desk calls it that.
export { urgencyForDays } from "../summons/clock-math";

// Formatting lives here, once, so no screen invents its own rendering of a
// metric — and so every displayed figure traces back to engine state.

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatRatio(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(date: GameDate): string {
  const month = MONTHS[date.month - 1] ?? String(date.month);
  return `${month} ${date.day}, ${date.year}`;
}

/** Drop spurious trailing zeros so `$43.0B` reads `$43B` while `$3.90T` stays `$3.9T`. */
export function polishCompactFigure(figure: string): string {
  const match = /^(-?\$?)([\d.]+)([BMKT]|)$/.exec(figure);
  if (!match) return figure;
  const prefix = match[1] ?? "";
  const num = match[2];
  const suffix = match[3] ?? "";
  if (num === undefined) return figure;
  const cleaned = num
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "")
    .replace(/\.$/, "");
  return `${prefix}${cleaned}${suffix}`;
}

/**
 * Where a figure comes from and how often it is reread.
 *
 * The instrument bar asks every number to carry its provenance, and the honest
 * answer differs by figure. The administration's own five readings are
 * recomputed every week the term advances; a country's stats start from the
 * shipped reference and drift as the world moves. Neither is attributed to an
 * agency the simulation does not model — a fabricated source would be worse
 * than none, because a player would believe it.
 */
export const METRIC_PROVENANCE: Readonly<Record<keyof MetricSet, string>> = {
  approval: "Built from six things voters judge you on · updated weekly",
  treasury: "Paid out each week from the budget Congress passed · exact",
  stability: "Estimate of how calm the country is · updated weekly",
  militaryReadiness: "Estimate of how ready the armed forces are · updated weekly",
  standing: "Estimate of how other countries see you · updated weekly",
};

// Role ids are the data; their human title is presentation. Deriving it here
// keeps the dataset free of display strings and every screen consistent. A
// charter may author its own display titles for the chairs it seats; those
// win over the derived form, and the derivation remains the fallback for
// charters that author none.
export function roleTitle(roleId: string, titles?: Readonly<Record<string, string>>): string {
  const authored = titles?.[roleId];
  if (authored) return authored;
  const american = AMERICAN_FALLBACK_TITLES[roleId];
  if (american) return american;
  return roleId
    .replace(/^role-/, "")
    .split("-")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// The only playable seat is the US presidency, so a screen handed no charter
// titles (a showcase fixture, a dossier rendered before the charter loads)
// must still say "Secretary of State" and never "Foreign Minister" — the
// role ids are the dataset's charter-neutral vocabulary, not what a reader
// in this game should ever see.
const AMERICAN_FALLBACK_TITLES: Readonly<Record<string, string>> = {
  "role-foreign-minister": "Secretary of State",
  "role-treasury-minister": "Secretary of the Treasury",
  "role-defense-minister": "Secretary of Defense",
  "role-interior-minister": "Secretary of the Interior",
  "role-intelligence-director": "Director of National Intelligence",
  "role-attorney-general": "Attorney General",
  "role-president": "President",
  ...WHITE_HOUSE_ROLE_TITLES,
};

/**
 * A stat path as a heading a reader gets: "politics.pressFreedom" reads
 * "Press freedom". The engine's sixteen paths are its own vocabulary, and a
 * screen quoting one raw is quoting a field name at a president.
 */
// Words a sentence-cased label must not swallow. `debtToGdp` came out as
// "Debt to gdp", which reads as a typo rather than a measure.
const STAT_ACRONYMS = new Set(["gdp", "gni", "gnp", "cpi", "un", "eu", "nato", "opec", "imf"]);

export function statPathLabel(path: string): string {
  const leaf = path.split(".").at(-1) ?? path;
  const words = leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(" ");
  return words
    .map((word, index) => {
      if (STAT_ACRONYMS.has(word)) return word.toUpperCase();
      return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
    .join(" ");
}

export type MetricStance = "favorable" | "neutral" | "caution" | "adverse";

/** Named view of STANCE_THRESHOLDS (reading.ts) for callers that judge a figure by stance. */
export const STANCE_CUTS = { caution: STANCE_THRESHOLDS[0], neutral: STANCE_THRESHOLDS[1], favorable: STANCE_THRESHOLDS[2] } as const;

// Stance is what the figure *means*, and the thresholds are shared by every
// surface so the same number never reads as healthy on one screen and alarming
// on another.
export function stanceForRatio(value: number): MetricStance {
  if (value >= STANCE_CUTS.favorable) return "favorable";
  if (value >= STANCE_CUTS.neutral) return "neutral";
  if (value >= STANCE_CUTS.caution) return "caution";
  return "adverse";
}

/** Same thresholds, for a -1..1 signed read (a person's disposition, alignment) rather than a 0..1 ratio. */
export function stanceForDisposition(value: number): MetricStance {
  return stanceForRatio((value + 1) / 2);
}

// A capital's trust in this administration runs -1..1 but bunches near zero,
// so the health cuts above, whose hostile line sits at -0.5, read almost every
// capital "on the merits". These cuts were set on the other direction of the
// edge, the United States' own view of each capital, which at founding spans
// Russia at -0.50 to Canada at 0.65 and splits 42 / 104 / 43 / 6. Each
// capital's own view of the United States, which is what the board and the
// country file read, is narrower: Russia at -0.24 to Canada at 0.51, 116 of 195
// inside +-0.13, splitting 65 / 121 / 9 / 0 with North Korea at zero. No
// capital opens hostile because the founding trust puts none there, not
// because of where these lines sit: cutting nearer zero would make Kazakhstan
// hostile and leave North Korea on the merits.
export const TRUST_STANCE_CUTS = { favorable: 0.2, neutral: -0.1, caution: -0.3 } as const;

/** How a capital's trust in this administration reads, on the cuts measured for it. */
export function stanceForTrust(trust: number): MetricStance {
  if (trust >= TRUST_STANCE_CUTS.favorable) return "favorable";
  if (trust >= TRUST_STANCE_CUTS.neutral) return "neutral";
  if (trust >= TRUST_STANCE_CUTS.caution) return "caution";
  return "adverse";
}

/** Removal pressure runs the other way: high pressure is bad news. */
export function stanceForPressure(value: number): MetricStance {
  return stanceForRatio(1 - value);
}

/**
 * A minister's delivery multiplier, centered on 1 rather than running 0..1: an
 * account fully staffed and competently run delivers exactly what it is
 * appropriated, above 1 outperforms it, and below is the department running
 * short of its own budget.
 */
export function stanceForQuality(value: number): MetricStance {
  if (value >= 1) return "favorable";
  if (value >= 0.85) return "neutral";
  return "caution";
}

// The stance tokens are the app's internal vocabulary; "favorable" is not a
// thing one country is towards another. The same four words the world map's
// legend uses, so a green landmass and a green chip say the same word.
const DISPOSITION_WORDS: Readonly<Record<MetricStance, string>> = {
  favorable: "Trusts you",
  neutral: "Neutral",
  caution: "Wary",
  adverse: "Hostile",
};

/** The short word for a capital's stance: a chip, a filter, the map legend. */
export function trustWord(stance: MetricStance): string {
  return DISPOSITION_WORDS[stance];
}

export function dispositionLabel(trust: number): string {
  return DISPOSITION_WORDS[stanceForTrust(trust)];
}

// A word for what a person's reading means, for the surfaces that draw the
// figure rather than only the bar. Derived from the same thresholds the bar's
// color is, so the word and the color cannot say different things about one
// number — and so a Secretary called strong on the dossier is never drawn amber
// on the cabinet screen.
const ATTRIBUTE_WORDS: Readonly<Record<MetricStance, string>> = {
  favorable: "Strong",
  neutral: "Fair",
  caution: "Weak",
  adverse: "Poor",
};

export function attributeVerdict(value: number): string {
  return ATTRIBUTE_WORDS[stanceForRatio(value)];
}

// Cabinet loyalty is not Hill disposition: a minister's word is whether they
// still answer to this president, not whether a chamber would carry a vote.
const LOYALTY_WORDS: Readonly<Record<MetricStance, string>> = {
  favorable: "Loyal",
  neutral: "Mostly loyal",
  caution: "Wavering",
  adverse: "Disloyal",
};

export function loyaltyWord(stance: MetricStance): string {
  return LOYALTY_WORDS[stance];
}

// A word for what the office's own reading means, derived from the same cuts
// the dial's color is. Person language ("Strong", "Poor") stays on attributes;
// a briefing of the presidency uses the office's words.
const METRIC_VERDICTS: Readonly<Record<MetricStance, string>> = {
  favorable: "Good",
  neutral: "Fair",
  caution: "Low",
  adverse: "At risk",
};

export function metricStanceWord(stance: MetricStance): string {
  return METRIC_VERDICTS[stance];
}

export function metricVerdict(fraction: number): string {
  return metricStanceWord(stanceForRatio(fraction));
}

export type MetricTile = {
  readonly key: keyof MetricSet;
  readonly label: string;
  readonly value: string;
  readonly stance: MetricStance;
  /** Where the reading sits in its own range, 0..1 — what a dial draws. */
  readonly fraction: number;
};

export const METRIC_LABELS: Readonly<Record<keyof MetricSet, string>> = {
  approval: "Public approval",
  treasury: "Budget authority",
  stability: "Political stability",
  militaryReadiness: "Military readiness",
  standing: "International standing",
};

/**
 * What each reading actually governs, in one line of plain language.
 *
 * The five figures were labeled and never explained: "Standing 32%" names a
 * number without saying what it is a number *of*, and a player has no way to
 * learn it from the dashboard. These are written as consequences — what a low
 * one costs you — because that is the only reason to look at the dial.
 */
export const METRIC_MEANINGS: Readonly<Record<keyof MetricSet, string>> = {
  approval: "How many Americans like the job you're doing. When it drops, it gets easier for Congress, your own party, and the press to turn against you.",
  treasury: "The money Congress has already given you to spend on actions and orders. When it runs out, you can't start new ones, and you can't borrow more.",
  stability: "How calm and orderly the country is. When it's low, people feel less safe and think you're doing the job less well.",
  militaryReadiness: "How ready the armed forces are. When it's low, you can't use the strongest military options.",
  standing: "How other countries see you. When it's low, Americans think you're doing the job less well.",
};

/**
 * The six public-opinion drivers behind approval, in the short form a tile or
 * a row title needs. `OPINION_DRIVER_MEANINGS` (`@admin/engine`) carries
 * the full sentence; this is the word beside it, kept here so it sits next to
 * every other display-name registry rather than inventing a second place to
 * look for one.
 */
export const OPINION_DRIVER_LABELS: Readonly<Record<OpinionDriver, string>> = {
  security: "Security",
  prosperity: "Prosperity",
  services: "Public services",
  integrity: "Integrity",
  unity: "Unity",
  competence: "Competence",
};

/**
 * The five instruments, named for what a president actually reaches for.
 *
 * These were the enum values title-cased — Diplomatic, Economic, Covert,
 * Military, Assistance — which is the doctrine category the code sorts by and
 * not a word anybody in the building says. A tile that reads "Economic" is a
 * taxonomy; one that reads "Trade and money" is a thing to do. The acts under
 * each already have plain names (`RUNG_FACE` in ops-reading), and this is the
 * same move one level up.
 */
export const INSTRUMENT_LABELS: Readonly<Record<InstrumentId, string>> = {
  diplomatic: "Talks and protest",
  economic: "Trade and money",
  covert: "Secret work",
  military: "Force",
  assistance: "Help and guarantees",
};

/**
 * A signed movement in a 0..1 metric, in points to one decimal — "+1.4", "−0.3".
 *
 * A turn's movement is small by design, because it compounds for the rest of the
 * campaign. Put through `formatRatio` it rounds to a whole percent, so the
 * ledger's five heaviest drivers all rendered as "−0%" — five different
 * consequences reported as no consequence at all.
 *
 * The sign is never dropped: "+2" and "2" are different statements and only one
 * of them is what the figure means.
 */
export function formatSignedPoints(delta: number): string {
  const points = Math.round(Math.abs(delta) * 1000) / 10;
  return `${delta >= 0 ? "+" : "−"}${points}`;
}

// The money formatter is a parameter so the treasury tile's wording can change
// without this module changing what the reading means. Defaulting to the
// canonical dollar keeps the non-UI callers (tests, the harness) honest by
// construction.
export function metricTiles(metrics: MetricSet, money: MoneyFormatter = formatMoney): readonly MetricTile[] {
  return (Object.keys(METRIC_LABELS) as (keyof MetricSet)[]).map((key) => {
    const raw = metrics[key];
    return {
      key,
      label: METRIC_LABELS[key],
      value: key === "treasury" ? money(raw) : formatRatio(raw),
      // Stance reads the stored figure, never the displayed one: what a
      // treasury *means* cannot depend on which currency it is written in.
      stance: stanceForRatio(metricFraction(key, raw)),
      fraction: metricFraction(key, raw),
    };
  });
}

/**
 * Where a reading sits in its own range, 0..1 — what a dial needs and a figure
 * does not. Four of the five metrics are already ratios; treasury is money, and
 * is read against the same reference the engine reads treasury health from
 * (`TREASURY_REFERENCE`), so the dial and the score agree about what a healthy
 * treasury is.
 */
export function metricFraction(key: keyof MetricSet, raw: number): number {
  return key === "treasury" ? Math.min(1, raw / TREASURY_REFERENCE) : Math.max(0, Math.min(1, raw));
}
