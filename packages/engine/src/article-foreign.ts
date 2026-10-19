import { coverageBand, coverageScore, isStatePress, type CoverageBand, type ForeignOutlet, type ForeignOutletKind } from "./press-foreign.js";
import { hashIndex } from "./rng.js";
import { selectNation, type Campaign } from "./state.js";

// The foreign desk's voice: how an outlet abroad writes up what the
// administration did. Each format has its own ledes and closings, each band of
// coverage its own framing line per format, and state media a line that says
// plainly whose words they print. No line quotes anybody; a foreign outlet
// reports what Washington did and how its own readers are meant to take it.

/** What a line may name: the outlet's home country, and the act being covered. */
export type ForeignParticulars = {
  readonly nation: string;
  readonly act: string;
};

type Line = (p: ForeignParticulars) => string;

type FormatBank = {
  readonly ledes: readonly Line[];
  readonly closings: readonly Line[];
  readonly voice: Readonly<Record<CoverageBand, string>>;
};

export const FOREIGN_ARTICLE_BANK: Readonly<Record<ForeignOutletKind, FormatBank>> = {
  wire: {
    ledes: [
      (p) => `Washington moved on ${p.act}, and the wire had it on desks abroad within the hour.`,
      (p) => `The first account of ${p.act} reached foreign ministries before the White House had finished briefing it.`,
      (p) => `${capitalize(p.act)} is the item every capital opened the morning with, filed without comment.`,
    ],
    closings: [
      () => "Reaction from other capitals follows in separate dispatches.",
      () => "The terms, where Washington has published them, are in the full text.",
      () => "Markets abroad were open when the item moved; the prices it touched are in the business file.",
    ],
    voice: {
      warm: "The dispatch leads with what the administration says the move achieves.",
      neutral: "The dispatch sets out the terms and leaves the judgment to its readers.",
      cool: "The dispatch leads with the objections before it gets to the terms.",
      hostile: "The dispatch leads with the damage, and puts the administration's case last.",
    },
  },
  national: {
    ledes: [
      (p) => `Readers in ${p.nation} want to know what ${p.act} costs them.`,
      (p) => `The question in ${p.nation} is not what Washington did but what it means here.`,
      (p) => `${capitalize(p.act)} arrived in ${p.nation} as news and stayed as a question for the government.`,
    ],
    closings: [
      (p) => `The government of ${p.nation} has not yet set out its answer, and this paper will hold it to one.`,
      (p) => `Readers in ${p.nation} have seen this kind of move from Washington before; what they have not seen is its price.`,
      () => "The editorial board's view is on the opinion page, where it belongs.",
    ],
    voice: {
      warm: "The paper calls it a steady hand from Washington, and says so on the front page.",
      neutral: "The paper weighs it line by line and finds the case not yet made either way.",
      cool: "The paper doubts the administration has counted what this costs its partners.",
      hostile: "The paper calls it Washington acting for itself at everyone else's expense.",
    },
  },
  "state-media": {
    ledes: [
      (p) => `The government of ${p.nation} has taken note of ${p.act}.`,
      (p) => `${capitalize(p.act)} confirms what the government of ${p.nation} has said about Washington all along.`,
      (p) => `${capitalize(p.act)} has been followed in ${p.nation} with the attention it deserves.`,
    ],
    closings: [
      () => "The government's position is unchanged and is set out in full on the front page.",
      (p) => `The people of ${p.nation} can be confident that their government is watching Washington closely.`,
      () => "The government will answer through its own channels, at a time of its choosing.",
    ],
    voice: {
      warm: "The broadcast calls it a sensible step, and credits its own government's patience for it.",
      neutral: "The broadcast reports it in two sentences and moves on to the news at home.",
      cool: "The broadcast calls it another sign that Washington cannot be relied on.",
      hostile: "The broadcast calls it hostile, and says its own government will not be pushed.",
    },
  },
};

/** What state media are, said plainly: the line under every piece they file. */
export const STATE_MEDIA_ECHO: readonly string[] = [
  "Its coverage follows the government's own line on the United States.",
  "What it prints about Washington is what its government has decided to say.",
  "It holds no view of the United States that its government does not hold.",
];

/** What an act reads as when the administration has done nothing the desk can name yet. */
const NO_ACT = "the administration's first moves";

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

export type ForeignPiece = {
  readonly outletId: string;
  readonly outlet: string;
  readonly kind: ForeignOutletKind;
  readonly band: CoverageBand;
  readonly lede: string;
  readonly voice: string;
  readonly closing: string;
  /** State media only: the line that says whose words these are. */
  readonly echo?: string;
  readonly signature: string;
};

/** The act the desks abroad are covering this week: the administration's latest on the record. */
export function coveredAct(campaign: Campaign): string {
  const latest = [...campaign.feed].reverse().find((item) => item.kind === "player-action");
  const named = latest?.facts?.instrument?.trim();
  return named && named.length > 0 ? `the administration's ${named.toLowerCase()}` : NO_ACT;
}

function chosen<T>(bank: readonly T[], key: string): T {
  return bank[hashIndex(key, bank.length)]!;
}

/**
 * One outlet's piece this week. Keyed on the outlet and the turn rather than a
 * stream, so a press page opened twice in a week reads the same, and a new
 * week reads a new piece.
 */
export function foreignPiece(campaign: Campaign, outlet: ForeignOutlet): ForeignPiece | undefined {
  const runtime = selectNation(campaign, outlet.nation);
  const score = coverageScore(campaign, outlet.nation);
  if (!runtime || score === undefined) return undefined;
  const bank = FOREIGN_ARTICLE_BANK[outlet.kind];
  const band = coverageBand(score);
  const particulars = { nation: runtime.base.identity.name, act: coveredAct(campaign) };
  const key = `${outlet.id}:${campaign.turn}`;
  const echo = outlet.kind === "state-media" && isStatePress(runtime) ? chosen(STATE_MEDIA_ECHO, `${key}:echo`) : undefined;
  return {
    outletId: outlet.id,
    outlet: outlet.name,
    kind: outlet.kind,
    band,
    lede: chosen(bank.ledes, `${key}:lede`)(particulars),
    voice: bank.voice[band],
    closing: chosen(bank.closings, `${key}:closing`)(particulars),
    ...(echo ? { echo } : {}),
    signature: outlet.signature,
  };
}

/** Every outlet's piece, in roster order. Empty until the press abroad has first filed. */
export function foreignPressWeek(campaign: Campaign, outlets: readonly ForeignOutlet[]): readonly ForeignPiece[] {
  if (!campaign.foreignCoverage) return [];
  return outlets.flatMap((outlet) => {
    const piece = foreignPiece(campaign, outlet);
    return piece ? [piece] : [];
  });
}
