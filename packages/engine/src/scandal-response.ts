// How the President answers a live scandal.
//
// The story stays derived. The only stored fact is the President's answer, in
// `press.scandalResponses` keyed by the story's derived id, so a story is never
// recorded twice. What the answer does is read back from it every week
// (press-scandal.ts): the right answer puts the story on its way down, the
// wrong one gives it new legs. A save kept before the field held the answer as
// a turn-stamped flag, and that flag is still read where the field is absent.
//
// Evidence is a hash of the campaign seed and the story id: how much the papers
// can prove, fixed the week the story broke and never shown. The charge shifts
// which answer that evidence favors, so coming clean, fighting, and handing them
// someone each win somewhere and none is always right.

import { fnv1a, mulberry32, type PersonId, type RoleId } from "@admin/world";
import { appointActing, dismissMinister, selectActing, selectAppointableFor } from "./appointments.js";
import type { Effect, EffectPacket } from "./effect-types.js";
import { apply } from "./effects.js";
import { hashFraction } from "./rng.js";
import { flagSetTurn, type ScandalCharge, type ScandalImplicated } from "./scandal-origins.js";
import type { Campaign, FlagId, ScandalResponse, ScandalVerb } from "./state.js";

export const SCANDAL_RESPONSE_VERBS = ["come-clean", "fight-it", "give-them-someone"] as const satisfies readonly ScandalVerb[];

export type ScandalResponseVerb = ScandalVerb;

/** How an answer lands against the file: the story fades, holds, or gets heavier. */
export type ScandalPriceWord = "fading" | "steady" | "heavy";

export type ScandalResponseTarget = {
  readonly id: string;
  readonly subject: string;
  readonly stage: "breaking" | "developing" | "fading" | "resolved";
  readonly charge: ScandalCharge;
  readonly implicated?: ScandalImplicated;
};

export type ScandalResponseProjection = {
  readonly verb: ScandalResponseVerb;
  readonly label: string;
  readonly ask: string;
  /** What choosing it puts at risk, in words, before the choice. */
  readonly risk: string;
  readonly price: ScandalPriceWord;
  /** Present when this answer cannot be given to this story at all. */
  readonly unavailable?: string;
};

export type ScandalResponseResult =
  | { readonly ok: true; readonly packet: EffectPacket; readonly verb: ScandalResponseVerb; readonly price: ScandalPriceWord }
  | { readonly ok: false; readonly reason: string };

/** An answer on the record: which verb, how it landed, and the week it was given. */
export type ScandalAnswer = { readonly verb: ScandalResponseVerb; readonly price: ScandalPriceWord; readonly turn: number };

export const SCANDAL_RESPONSE_LABELS: Readonly<Record<ScandalResponseVerb, string>> = {
  "come-clean": "Come clean",
  "fight-it": "Fight it",
  "give-them-someone": "Give them someone",
};

const ASKS: Readonly<Record<ScandalResponseVerb, string>> = {
  "come-clean": "You own the charge in public, say what happened, and take the questions.",
  "fight-it": "You deny the charge, answer nothing further, and make the papers prove it.",
  "give-them-someone": "An officer takes responsibility and leaves, and the story follows them out the door.",
};

const RISKS: Readonly<Record<ScandalResponseVerb, string>> = {
  "come-clean": "If the papers could only prove part of it, you will have confirmed the rest yourself.",
  "fight-it": "If the papers can prove it, the denial becomes the story and it runs for weeks longer.",
  "give-them-someone": "You lose the officer, and the department runs on an acting chief until the Senate confirms a successor.",
};

/** What happened, by the answer and by how it met the file. */
const OUTCOMES: Readonly<Record<ScandalResponseVerb, Readonly<Record<ScandalPriceWord, string>>>> = {
  "come-clean": {
    fading: "The President comes clean, and there is little left for the papers to find.",
    steady: "The President comes clean. The admission answers some questions and raises others.",
    heavy: "The President comes clean about more than the papers could have proved.",
  },
  "fight-it": {
    fading: "The President denies the story, and the papers cannot stand it up.",
    steady: "The President denies the story. The papers keep digging.",
    heavy: "The President denies the story, and the papers print the documents.",
  },
  "give-them-someone": {
    fading: "An officer takes responsibility and resigns, and the story goes with them.",
    steady: "An officer takes responsibility and resigns. The papers ask who else knew.",
    heavy: "An officer resigns over the story, and the papers ask why the President let them take it.",
  },
};

/** Least integrity lost when the verb fits the file, most when it does not. */
const INTEGRITY_BY_PRICE: Readonly<Record<ScandalPriceWord, number>> = {
  fading: -0.02,
  steady: -0.05,
  heavy: -0.09,
};

/**
 * Where a raw evidence fraction sits after the charge has had its say. A thin
 * file favors a fight, a file with a name in it favors handing someone over,
 * and a thick file favors owning the charge. The shift moves the same evidence
 * into a different third for a different charge.
 */
const CHARGE_BIAS: Readonly<Record<ScandalCharge, number>> = {
  "emergency-powers": 0,
  "burned-source": 1 / 3,
  "covert-failure": 2 / 3,
  "conduct-in-question": 2 / 3,
  leak: 1 / 3,
  "cabinet-leak": 1 / 3,
  "ig-finding": 0,
  flagged: 0,
};

const BAND_OF_VERB: Readonly<Record<ScandalResponseVerb, 0 | 1 | 2>> = {
  "fight-it": 0,
  "give-them-someone": 1,
  "come-clean": 2,
};

/** The dated flag a save kept before `press.scandalResponses` recorded the answer with. Read, never written. */
export function scandalResponseFlag(id: string, verb: ScandalResponseVerb): FlagId {
  return `scandal-response:${id}:${verb}`;
}

/**
 * The President's answer to a story: the stored response, or on an older save
 * the dated flag it was kept as. A flag with no week on its marker is an answer
 * with no date, so it says the story was answered but not when.
 */
export function scandalResponseOf(campaign: Campaign, id: string): (Omit<ScandalResponse, "turn"> & { readonly turn?: number }) | undefined {
  const stored = campaign.press.scandalResponses?.[id];
  if (stored) return stored;
  const verb = SCANDAL_RESPONSE_VERBS.find((candidate) => campaign.player.flags[scandalResponseFlag(id, candidate)] === true);
  if (!verb) return undefined;
  const turn = flagSetTurn(campaign, scandalResponseFlag(id, verb));
  return turn === undefined ? { verb } : { verb, turn };
}

export function scandalResponseTaken(campaign: Campaign, id: string): ScandalResponseVerb | undefined {
  return scandalResponseOf(campaign, id)?.verb;
}

/** Hidden evidence in [0, 1), the same number every time this story is read. */
export function scandalEvidenceStrength(seed: string, scandalId: string): number {
  return hashFraction(`${seed}::scandal-evidence::${scandalId}`);
}

function winningBand(seed: string, id: string, charge: ScandalCharge): 0 | 1 | 2 {
  const shifted = scandalEvidenceStrength(seed, id) + CHARGE_BIAS[charge];
  const lane = shifted - Math.floor(shifted);
  if (lane < 1 / 3) return 0;
  if (lane < 2 / 3) return 1;
  return 2;
}

/** How this answer meets this file: one verb fits, one is a step off, one is the worst answer to give. */
export function scandalResponsePrice(seed: string, id: string, charge: ScandalCharge, verb: ScandalResponseVerb): ScandalPriceWord {
  const winner = winningBand(seed, id, charge);
  if (BAND_OF_VERB[verb] === winner) return "fading";
  const step = (BAND_OF_VERB[verb] - winner + 3) % 3;
  return step === 1 ? "steady" : "heavy";
}

/** What the President's counsel thinks the papers can prove: a thin file, a file with a name in it, or a thick one. */
export type ScandalFileRead = "thin" | "named" | "thick";

const READ_OF_BAND: readonly ScandalFileRead[] = ["thin", "named", "thick"];

/**
 * How often counsel reads the file right. Nobody inside the building sees the
 * newsroom's documents, so the read is a judgment and is sometimes wrong; right
 * often enough to be worth asking, wrong often enough that the choice is still
 * the President's.
 */
export const SCANDAL_COUNSEL_ACCURACY = 0.6;

/** Counsel's read of the file, the same every time the story is read, and right about three times in five. */
export function scandalCounselRead(seed: string, id: string, charge: ScandalCharge): ScandalFileRead {
  const winner = winningBand(seed, id, charge);
  const draw = mulberry32(fnv1a(`${seed}::scandal-read::${id}`))();
  if (draw < SCANDAL_COUNSEL_ACCURACY) return READ_OF_BAND[winner]!;
  const miss = draw < SCANDAL_COUNSEL_ACCURACY + (1 - SCANDAL_COUNSEL_ACCURACY) / 2 ? 1 : 2;
  return READ_OF_BAND[(winner + miss) % 3]!;
}

/** The answer on the record for a story, with the week it was given, if any. */
export function scandalAnswer(campaign: Campaign, id: string, charge: ScandalCharge): ScandalAnswer | undefined {
  const response = scandalResponseOf(campaign, id);
  if (response?.turn === undefined) return undefined;
  return { verb: response.verb, price: scandalResponsePrice(campaign.seed, id, charge, response.verb), turn: response.turn };
}

/** Why the officer a story names cannot be handed over, if they cannot. */
function handOverRefusal(campaign: Campaign, scandal: ScandalResponseTarget): string | undefined {
  const implicated = scandal.implicated;
  if (!implicated) return "No officer's name is on this story.";
  const name = campaign.people[implicated.person]?.base.name ?? "The officer it names";
  if (!implicated.role || campaign.player.cabinet[implicated.role] !== implicated.person) {
    return `${name} is no longer in the government.`;
  }
  return undefined;
}

export function projectScandalResponses(campaign: Campaign, scandal: ScandalResponseTarget): readonly ScandalResponseProjection[] {
  return SCANDAL_RESPONSE_VERBS.map((verb) => {
    const unavailable = verb === "give-them-someone" ? handOverRefusal(campaign, scandal) : undefined;
    return {
      verb,
      label: SCANDAL_RESPONSE_LABELS[verb],
      ask: ASKS[verb],
      risk: RISKS[verb],
      price: scandalResponsePrice(campaign.seed, scandal.id, scandal.charge, verb),
      ...(unavailable === undefined ? {} : { unavailable }),
    };
  });
}

export function favoredScandalResponse(campaign: Campaign, scandal: ScandalResponseTarget): ScandalResponseVerb {
  const favored = SCANDAL_RESPONSE_VERBS.find(
    (verb) => scandalResponsePrice(campaign.seed, scandal.id, scandal.charge, verb) === "fading",
  );
  if (!favored) throw new Error(`no favored answer for ${scandal.id}`);
  return favored;
}

function refusal(campaign: Campaign, scandal: ScandalResponseTarget | undefined): string | undefined {
  if (!scandal) return "No such story is on the board.";
  if (scandal.stage === "resolved") return "That story is over. There is nothing left to answer.";
  if (scandalResponseTaken(campaign, scandal.id)) return "That story has already been answered.";
  return undefined;
}

type HandOver = { readonly effects: readonly Effect[]; readonly line: string; readonly acting?: PersonId };

/**
 * The officer leaves through the ordinary dismissal, priced the way any
 * dismissal is, and somebody runs the department in an acting capacity: the
 * deputy the dismissal already seated, or failing one the next eligible person
 * who is not the officer just handed over. An acting that cannot be seated
 * leaves the chair empty, and the line says so rather than claiming a chair
 * filled.
 */
function handOver(campaign: Campaign, role: RoleId): HandOver | { readonly reason: string } {
  const departing = campaign.player.cabinet[role];
  const dismissal = dismissMinister(campaign, role);
  if (!dismissal.ok) return { reason: dismissal.reason };
  const vacated = apply(campaign, dismissal.packet);
  const deputy = selectActing(vacated, role);
  if (deputy) return { effects: dismissal.packet.effects, line: `${dismissal.packet.narration.summary} ${actingLine(vacated, deputy)}`, acting: deputy };
  const next = selectAppointableFor(vacated, role).find((runtime) => runtime.base.id !== departing);
  const acting = next ? appointActing(vacated, role, next.base.id) : undefined;
  if (next && acting?.ok) {
    return {
      effects: [...dismissal.packet.effects, ...acting.packet.effects],
      line: `${dismissal.packet.narration.summary} ${actingLine(vacated, next.base.id)}`,
      acting: next.base.id,
    };
  }
  const why = acting && !acting.ok ? ` ${acting.reason}` : "";
  return {
    effects: dismissal.packet.effects,
    line: `${dismissal.packet.narration.summary} The chair stands empty until a successor is seated.${why}`,
  };
}

function actingLine(campaign: Campaign, person: PersonId): string {
  return `${campaign.people[person]?.base.name ?? "A deputy"} runs the department in an acting capacity.`;
}

function answerPacket(
  campaign: Campaign,
  scandal: ScandalResponseTarget,
  verb: ScandalResponseVerb,
  price: ScandalPriceWord,
  extra: HandOver | undefined,
): EffectPacket {
  const response: ScandalResponse = { verb, turn: campaign.turn, ...(extra?.acting ? { acting: extra.acting } : {}) };
  const press = { ...campaign.press, scandalResponses: { ...campaign.press.scandalResponses, [scandal.id]: response } };
  const effects: readonly Effect[] = [
    ...(extra?.effects ?? []),
    { kind: "press", set: press },
    { kind: "opinion", deltas: { integrity: INTEGRITY_BY_PRICE[price] } },
  ];
  const entities = [scandal.id, ...(scandal.implicated ? [scandal.implicated.person as string] : [])];
  const said = `${OUTCOMES[verb][price]} At issue: ${scandal.subject}.`;
  return {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    provenance: { origin: "decision", confidence: "observed", visibility: "public", systems: ["press"], entities },
    narration: { summary: extra ? `${said} ${extra.line}` : said },
    effects,
  };
}

export function respondToScandal(
  campaign: Campaign,
  scandal: ScandalResponseTarget | undefined,
  verb: ScandalResponseVerb,
): ScandalResponseResult {
  const reason = refusal(campaign, scandal);
  if (reason || !scandal) return { ok: false, reason: reason ?? "No such story is on the board." };
  const price = scandalResponsePrice(campaign.seed, scandal.id, scandal.charge, verb);
  if (verb !== "give-them-someone") return { ok: true, verb, price, packet: answerPacket(campaign, scandal, verb, price, undefined) };
  const refused = handOverRefusal(campaign, scandal);
  if (refused || !scandal.implicated?.role) return { ok: false, reason: refused ?? "No officer's name is on this story." };
  const handed = handOver(campaign, scandal.implicated.role);
  if ("reason" in handed) return { ok: false, reason: handed.reason };
  return { ok: true, verb, price, packet: answerPacket(campaign, scandal, verb, price, handed) };
}
