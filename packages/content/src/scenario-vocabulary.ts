import { rungsForInstrument, type InstrumentId, type RungLevel } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";

// The rules a weaker hand breaks. Everything here exists because a rendered
// campaign showed the defect on a real screen, and because the corpus is about
// to be written against a brief by drafters — Haiku-class models, Cursor,
// Codex, a person with an hour — who cannot be relied on to carry the craft
// that would otherwise catch it in review.
//
// Kept out of scenario-audit.ts because these are four self-contained
// vocabularies with their own tables, and that file is already the longest in
// the package. The findings are the same shape and the same kinds union; only
// the file is different.

// --- The playable charter's vocabulary ------------------------------------

/**
 * Words about the player's own government that only a parliament has.
 *
 * The seat the game ships is the United States presidency, and there is no
 * other. A memo that says "the no-confidence motion" or "the finance ministry's
 * fifth floor" is not charter-neutral writing, it is writing for a constitution
 * this game does not contain — and the player reads it as a bug, because it is
 * one. Every entry names what to write instead, because a rule that only
 * forbids teaches a drafter to reach for the next wrong word.
 */
const PARLIAMENTARY_TERMS: readonly { readonly probe: RegExp; readonly say: string; readonly bareMinister?: true }[] = [
  {
    probe: /\b(?:the\s+)?prime\s+ministers?\b|\bpremiers?\b/i,
    say: "the head of this government is the President, and there is no second one",
  },
  {
    probe: /\bministr(?:y|ies)\b/i,
    say: 'this government has departments — "the State Department", "the Treasury", "the Pentagon", "the Justice Department"',
  },
  {
    probe: /\bministers?\b/i,
    bareMinister: true,
    say: 'this government has Secretaries — "the Secretary of Defense", "the Secretary of the Treasury"',
  },
  {
    probe: /\bparliaments?\b|\bparliamentary\b|\bparliamentarians?\b/i,
    say: 'the legislature here is Congress — "the House", "the Senate", or the {{assembly}} token',
  },
  {
    probe: /\bno[-\s]confidence\b|\bconfidence\s+motion\b|\bvote\s+of\s+confidence\b/i,
    say: "a President is removed by impeachment, censured by a resolution, or beaten at an election — never voted out mid-week",
  },
  {
    probe: /\bbackbench(?:er|ers)?\b/i,
    say: 'say who they are — "members of your own party", "the members who have to run in the spring"',
  },
  {
    probe: /\b(?:the\s+)?other\s+party(?:['’]s)?\b/i,
    say: "name the party: \"{{opposition}} in Congress\" renders Republicans or Democrats for this administration and {{oppositionAdjective}} the adjective; {{caucus}} and {{caucusAdjective}} name the President's own side",
  },
  {
    probe: /\bdissolve\s+(?:the\s+)?(?:house|chamber|legislature|assembly)\b/i,
    say: "no President can dissolve a legislature; the calendar decides when Congress goes home",
  },
];

/**
 * A sentence that is plainly about the counterpart's government rather than
 * the player's.
 *
 * "Their foreign minister will not take the call" is correct writing and always
 * was: this game does not model another country's constitution down to the
 * chair title. The exemption is deliberately narrow — the counterpart has to be
 * named in the same sentence, or the word has to be carrying a foreign
 * possessive — because "the ministry" with nothing attached to it is the exact
 * shape of the defect.
 */
const COUNTERPART_MARK = /\{\{\s*counterpart/i;
const FOREIGN_POSSESSIVE = /\b(?:their|theirs|his|her)\b/i;

function sentencesOf(text: string): readonly string[] {
  return text.split(/(?<=[.!?])\s+/);
}

function aboutTheCounterpart(sentence: string, term: RegExp): boolean {
  if (COUNTERPART_MARK.test(sentence)) return true;
  const hit = term.exec(sentence);
  if (!hit) return false;
  // "their foreign minister", "their ministry of the interior" — the possessive
  // has to stand in front of the word, within a couple of qualifiers of it.
  const clause = sentence.slice(0, hit.index).split(/[,;:]/).pop() ?? "";
  return clause
    .trim()
    .split(/\s+/)
    .slice(-4)
    .some((word) => FOREIGN_POSSESSIVE.test(word));
}

export type VocabularyHit = { readonly label: string; readonly hit: string; readonly say: string };

/**
 * Every parliamentary word in a passage that is not exempt.
 *
 * `skipMinister` defers the bare "minister" family to the domestic
 * `cabinet-title-literal` rule, which already refuses it on a `cast: "none"`
 * scenario with a message of its own. One defect, one finding.
 */
export function parliamentaryHits(
  passages: readonly { readonly label: string; readonly text: string }[],
  skipMinister: boolean,
): readonly VocabularyHit[] {
  const hits: VocabularyHit[] = [];
  for (const { label, text } of passages) {
    for (const { probe, say, bareMinister } of PARLIAMENTARY_TERMS) {
      if (skipMinister && bareMinister) continue;
      const sentence = sentencesOf(text).find((candidate) => probe.test(candidate) && !aboutTheCounterpart(candidate, probe));
      if (!sentence) continue;
      hits.push({ label, hit: probe.exec(sentence)![0].trim(), say });
      break;
    }
  }
  return hits;
}

// --- Money against the volume dial ----------------------------------------

const SCALE_ORDER = ["none", "discretionary", "supplemental", "emergency", "structural"] as const;

/**
 * The loudest money each tier may declare.
 *
 * A routine week is a budget squabble, an appointment, a provincial complaint —
 * the tier the doctrine calls the connective tissue of governing. A rendered
 * loop had a routine week whose cheapest-looking answer billed about eleven
 * billion dollars at the Record, because nothing connected the band to the
 * volume the week was written at. "Supplemental" is the ceiling for routine
 * precisely because it is the band that has to be asked for: the moment the
 * money needs a vote, the week is not routine any more.
 */
export const SEVERITY_SCALE_CEILING = {
  routine: "supplemental",
  serious: "emergency",
  critical: "structural",
} as const;

export function scaleExceedsSeverity(severity: keyof typeof SEVERITY_SCALE_CEILING, scale: string): boolean {
  const ceiling = SEVERITY_SCALE_CEILING[severity];
  return SCALE_ORDER.indexOf(scale as (typeof SCALE_ORDER)[number]) > SCALE_ORDER.indexOf(ceiling);
}

// --- The rung and the sentence that commits it ----------------------------

/**
 * Words that belong to a rung and to no other rung of the same ladder.
 *
 * The rung's own engine name is the spine of each entry, so a renamed rung
 * changes this table by itself; the synonyms are the words a writer actually
 * reaches for when they mean that step. The point is narrow: an authored reply
 * reading "open talks on the fisheries line" committed diplomatic rung 3, which
 * the engine calls Recall Ambassador, so the Record and the drawn aftermath
 * card both said the ambassador had come home. The player was told they did
 * something they did not choose.
 */
const RUNG_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  "diplomatic:1": ["démarche", "demarche", "quietly", "privately", "private word", "open a channel", "talks", "negotiate", "negotiations", "quiet word"],
  "diplomatic:2": ["publicly", "say so out loud", "condemn", "condemnation", "denounce", "on the record"],
  "diplomatic:3": ["call home", "bring our ambassador home", "withdraw our ambassador", "envoy home"],
  "diplomatic:4": ["partners", "allies", "common line", "joint statement", "sign together", "bloc"],
  "diplomatic:5": ["break relations", "cut ties", "close the embassy", "expel their", "shut the mission"],
  "economic:1": ["warn", "warning", "notice to business", "travel warning"],
  "economic:2": ["duties", "duty on", "levy", "raise the rate on their goods"],
  "economic:3": ["sanction", "designate", "blacklist", "name the people who"],
  "economic:4": ["seize", "frozen", "their accounts", "their reserves"],
  "economic:5": ["cut off trade", "close the market", "stop the shipments entirely"],
  "covert:1": ["watch", "monitor", "listen", "eyes on"],
  "covert:2": ["propaganda", "seed", "information operation", "shape what they read"],
  "covert:3": ["disable", "wreck", "break the plant", "put it out of action"],
  "covert:4": ["arm the", "irregulars", "the fighters", "through others"],
  "covert:5": ["topple", "remove the government", "change who governs"],
  "military:1": ["drill", "drills", "maneuvers", "work-up"],
  "military:2": ["station forces", "station them", "position forces", "move the carrier", "put forces close", "forward deployment"],
  "military:3": ["quarantine", "interdict", "close the sea lane", "stop and search"],
  "military:4": ["hit the site", "bomb", "air strike", "one target"],
  "military:5": ["invade", "ground forces in", "take the ground", "go in on the ground"],
  "assistance:1": ["supplies", "food and medicine", "aid shipment", "emergency stores"],
  "assistance:2": ["fund the", "money for", "build them"],
  "assistance:3": ["stabilize", "backstop", "stand behind their currency", "prop up"],
  "assistance:4": ["weapons", "ammunition", "materiel", "send them arms"],
  "assistance:5": ["defend them", "stand behind them", "promise to defend"],
};

/**
 * Name tokens too general to identify a rung. "Trade" appears in every economic
 * reply ever written; "security" in half the corpus. A word that cannot pick a
 * rung out of its own ladder is worse than no word, because it makes the rule
 * fire on correct writing.
 */
const UNDISTINCTIVE = new Set(["action", "operation", "package", "increase", "full", "limited", "targeted", "public", "quiet", "forward", "covert", "support", "trade", "security", "pressure", "relations", "asset"]);

function nameWords(name: string): readonly string[] {
  return name
    .toLowerCase()
    .split(/[^a-zà-ÿ]+/)
    .filter((word) => word.length > 3 && !UNDISTINCTIVE.has(word));
}

function rungWords(instrument: InstrumentId, rung: RungLevel): readonly string[] {
  return [...nameWords(rungsForInstrument(instrument).find((step) => step.rung === rung)?.name ?? ""), ...(RUNG_SYNONYMS[`${instrument}:${rung}`] ?? [])];
}

function mentions(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Stem-tolerant on the trailing inflections a reply actually uses, and only
  // those: "recall"/"recalled"/"recalling", never a prefix match.
  return new RegExp(`\\b${escaped}(?:s|es|d|ed|ing)?\\b`, "i").test(text);
}

export type RungReading = {
  /** Words of the committed rung the reply actually says. */
  readonly own: readonly string[];
  /** Words belonging to another rung of the same ladder, and which rung. */
  readonly other: readonly { readonly word: string; readonly rung: RungLevel; readonly name: string }[];
};

export function readRungVocabulary(text: string, instrument: InstrumentId, rung: RungLevel): RungReading {
  const own = rungWords(instrument, rung);
  const ownSet = new Set(own);
  const spoken = own.filter((word) => mentions(text, word));
  const other: RungReading["other"] = rungsForInstrument(instrument)
    .filter((step) => step.rung !== rung)
    .flatMap((step) =>
      rungWords(instrument, step.rung)
        .filter((word) => !ownSet.has(word) && mentions(text, word))
        .map((word) => ({ word, rung: step.rung, name: step.name })),
    );
  return { own: spoken, other };
}

/**
 * Every ladder's five rung names, in the engine's own words.
 *
 * Exported so the generation brief can print the ladder a writer is choosing a
 * rung from instead of a remembered copy of it — the same discipline the gate
 * list already follows for every length and floor. A renamed rung reaches the
 * brief, the audit and the player on one edit.
 */
const LADDERS = ["diplomatic", "economic", "covert", "military", "assistance"] as const;

export const INSTRUMENT_RUNG_NAMES: Readonly<Record<InstrumentId, readonly string[]>> = Object.fromEntries(
  LADDERS.map((instrument) => [instrument, rungsForInstrument(instrument).map((step) => step.name)] as const),
) as unknown as Readonly<Record<InstrumentId, readonly string[]>>;

export function committedRungName(instrument: InstrumentId, rung: RungLevel): string {
  return rungsForInstrument(instrument).find((step) => step.rung === rung)?.name ?? `${instrument} rung ${rung}`;
}

// --- Pool-scale: the chair the player appointed ---------------------------

/**
 * The batch size below which a share means nothing, and the share a batch owes.
 *
 * One in ten is modest on purpose. The engine's `cabinetAttribute` condition is
 * built, tested, and read by not one shipped scenario, so the promise that who
 * the player appointed is legible in today's decision is currently unmet by the
 * whole corpus. A tenth of a batch is roughly "one scenario in a cell of ten",
 * which is what the brief asks for in as many words — low enough that a batch
 * with a genuine reason to skip it is not fighting the gate, high enough that a
 * pool of two thousand ends up with two hundred weeks that read the cabinet.
 */
export const CABINET_GATE_BATCH_FLOOR = 8;
export const CABINET_GATE_SHARE_FLOOR = 0.1;

export function cabinetGatedCount(defs: readonly ScenarioDef[]): number {
  return defs.filter((def) => def.conditions.some((condition) => condition.kind === "cabinetAttribute")).length;
}
