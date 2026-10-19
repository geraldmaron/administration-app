import {
  DECISION_FRAMINGS,
  DECISION_FRAMING_KEYS,
  FRAMING_WINDOW_TURNS,
  PRESS_PLAYS,
  executiveOrder,
  frameDecision,
  frameableOrders,
  issuePressAction,
  outletTarget,
  podiumSubject,
  pressOutletById,
  pressReading,
  pressSecretary,
  projectFraming,
  projectPressAction,
  secretarySpentFlag,
  secretaryTakesTheHit,
  selectDateOfTurn,
  selectOutlets,
  type Campaign,
  type DecisionFramingKey,
  type EffectPacket,
  type MetricSet,
  type OpinionDriver,
  type PressAction,
  type PressOutlet,
} from "@admin/engine";
import { OPINION_DRIVER_LABELS, formatDate, formatRatio, stanceForRatio, type MetricStance } from "../format/figures.js";
import { METRIC_SHORT, moneyCost, pointsEffect, worstCaseOf, type ChoiceEffect, type ChoiceOutcome } from "../choice/choice-outcome.js";
import { costLines } from "../economy/lever-comparison.js";
import { actCell, type ActColumn, type ActComparison } from "../congress/act-comparison.js";
import { silenceWords } from "./desks.js";

// The press secretary's office: who is at the podium, what the room will ask,
// and the three things the President can do with the press, framing a recent
// order, and sending the secretary out to take a bad cycle. Each act is
// read as its change from today and built from the call its commit makes.


/** The three plays, by the key the engine knows them by. */
export const PRESS_ACTIONS: readonly PressAction[] = ["interview", "press-conference", "leak"];

const PRESS_VERB: Readonly<Record<PressAction, string>> = {
  interview: "Book the interview",
  "press-conference": "Call the press conference",
  leak: "Put the story out",
};

export type PodiumReading = {
  readonly secretary?: { readonly id: string; readonly name: string; readonly spent: boolean };
  readonly subject: string;
  readonly silence: string;
  readonly standing: { readonly value: number; readonly percent: string; readonly stance: MetricStance };
};

/** The podium this week: the secretary, what reporters will ask about, how long since anyone took a question, and the corps's standing. */
export function podiumReading(campaign: Campaign): PodiumReading {
  const secretary = pressSecretary(campaign);
  const value = pressReading(campaign, "standing") ?? campaign.press.standing;
  const subject = podiumSubject(campaign);
  return {
    ...(secretary ? { secretary: { id: secretary.id as string, name: secretary.name, spent: campaign.player.flags[secretarySpentFlag(secretary.id)] === true } } : {}),
    subject: subject.kind === "record" ? "Reporters will ask about your record so far." : `Reporters will ask about this first. ${subject.text.replace(/\.+$/, "")}.`,
    silence: silenceWords(campaign),
    standing: { value, percent: formatRatio(value), stance: stanceForRatio(value) },
  };
}

// --- Going in front of the press ------------------------------------------

const PRESS_ROWS = [
  { key: "play", label: "What it is" },
  { key: "with", label: "Who it is with" },
  { key: "cost", label: "What it costs now" },
  { key: "odds", label: "How likely it goes well" },
  { key: "corps", label: "Reporters, if it goes well or badly" },
  { key: "risk", label: "If it goes badly" },
] as const;

/** A desk a play can be aimed at. */
export type PressDesk = { readonly id: string; readonly name: string };

export function pressDesks(campaign: Campaign): readonly PressDesk[] {
  return selectOutlets(campaign).map((row) => ({ id: row.outlet.id, name: row.outlet.name }));
}

const sentence = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

type Projection = ReturnType<typeof projectPressAction>;

/**
 * Each reading a play moves, from the projection its commit rolls against:
 * the corps's standing either way, what is paid up front for certain, and
 * what the backfire charges only if it goes badly.
 */
function pressEffects(campaign: Campaign, projection: Projection): readonly ChoiceEffect[] {
  const { play, successChance: chance } = projection;
  const now = campaign.press.standing;
  const corps = pointsEffect("press", "Press corps", { well: projection.standingIfGood - now, badly: projection.standingIfBad - now, chance });
  const metrics = [...new Set([...Object.keys(play.cost), ...Object.keys(play.backfire)])].filter((key) => key !== "treasury") as (keyof MetricSet)[];
  const moved = metrics.map((key) => {
    const upfront = play.cost[key] ?? 0;
    return pointsEffect(key, METRIC_SHORT[key], { well: upfront, badly: upfront + (play.backfire[key] ?? 0), chance });
  });
  const mood = (Object.entries(play.moodBackfire ?? {}) as [OpinionDriver, number][]).map(([driver, delta]) =>
    pointsEffect(`opinion:${driver}`, OPINION_DRIVER_LABELS[driver], { well: 0, badly: delta, chance }),
  );
  return [corps, ...moved, ...mood].filter((effect) => effect.value !== 0 || effect.ifBadly !== undefined);
}

function pressOutcome(campaign: Campaign, projection: Projection, withWhom: string): ChoiceOutcome {
  const effects = pressEffects(campaign, projection);
  const worst = worstCaseOf(effects);
  return {
    cost: moneyCost(projection.play.cost.treasury ?? 0),
    odds: { share: projection.successChance, word: projection.forecast.likelihood, confidence: projection.forecast.confidence },
    effects,
    ...(worst ? { worstCase: worst } : {}),
    details: [
      { label: "What it is", text: projection.play.summary },
      { label: "Who it is with", text: withWhom },
      { label: "Why these odds", text: `${projection.reasoning} ${projection.forecast.confidenceBasis}` },
      { label: "When you find out", text: "You'll find out how it went tomorrow." },
    ],
  };
}

function pressColumn(campaign: Campaign, kind: PressAction, desk: string | undefined): ActColumn {
  const play = PRESS_PLAYS[kind];
  const aimed = play.targeting === "outlet" ? desk : undefined;
  const projection = projectPressAction(campaign, kind, aimed);
  const issued = issuePressAction(campaign, kind, aimed);
  const cost = costLines(play.cost);
  const risk = costLines(play.backfire);
  const deskName = aimed ? (pressOutletById(aimed)?.name ?? aimed) : undefined;
  const withWhom = play.targeting === "corps" ? "All the reporters, on camera" : (deskName ?? "Pick a news outlet above");
  return {
    id: kind, label: play.name, verb: PRESS_VERB[kind],
    ...(issued.ok ? {} : { refusal: issued.reason }),
    review: `${play.name}${deskName ? ` with ${deskName}` : ""}. ${projection.reasoning} You'll find out how it went tomorrow.`,
    cells: {
      play: actCell(play.summary),
      with: actCell(withWhom),
      cost: actCell(cost.length > 0 ? cost : ["Nothing up front"]),
      odds: actCell(`${sentence(projection.forecast.likelihood)}, ${projection.forecast.confidence} confidence`),
      corps: actCell([`Well: ${formatRatio(projection.standingIfGood)}`, `Badly: ${formatRatio(projection.standingIfBad)}`]),
      risk: actCell(risk.length > 0 ? risk : ["No one beyond the reporters"], risk.length > 0 ? "adverse" : undefined),
    },
    outcome: pressOutcome(campaign, projection, withWhom),
  };
}

/** The three plays, the two aimed ones at `desk`. Saying nothing is no play; its clock is the waiting line. */
export function pressActComparison(campaign: Campaign, desk: string | undefined): ActComparison {
  return { rows: PRESS_ROWS, columns: PRESS_ACTIONS.map((kind) => pressColumn(campaign, kind, desk)), waiting: `${silenceWords(campaign)} After 6 weeks without a briefing, reporters start writing about your silence.` };
}

export function pressActPacket(campaign: Campaign, kind: PressAction, desk: string | undefined): EffectPacket {
  const result = issuePressAction(campaign, kind, PRESS_PLAYS[kind].targeting === "outlet" ? desk : undefined);
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}

// --- Framing a recent order ------------------------------------------------

export type FramingOffer = {
  readonly id: string;
  readonly name: string;
  readonly signed: string;
  /** Weeks left in which the podium can still explain it. */
  readonly weeksLeft: number;
};

/** The orders the podium can still explain: signed in the last weeks and not yet framed. */
export function framingOffers(campaign: Campaign): readonly FramingOffer[] {
  return frameableOrders(campaign).map((record) => ({
    id: record.id,
    name: executiveOrder(record.order)?.name ?? record.order,
    signed: formatDate(selectDateOfTurn(campaign, record.turn)),
    weeksLeft: Math.max(0, FRAMING_WINDOW_TURNS - (campaign.turn - record.turn)),
  }));
}

const FRAMING_ROWS = [
  { key: "line", label: "What your spokesperson says" },
  { key: "honest", label: "Does the order back it up" },
  { key: "desks", label: "Where news outlets end up" },
] as const;

function deskMoves(campaign: Campaign, recordId: string, framing: DecisionFramingKey): readonly string[] {
  const record = campaign.orders.find((entry) => entry.id === recordId);
  if (!record) return [];
  const outlets: readonly PressOutlet[] = selectOutlets(campaign).map((row) => row.outlet);
  const projection = projectFraming(campaign, record, framing, outlets, outletTarget);
  const warmer = projection.movements.filter((move) => move.framedTarget - move.target > 0.005).length;
  const cooler = projection.movements.filter((move) => move.framedTarget - move.target < -0.005).length;
  return [`${warmer} of ${outlets.length} outlets warm to it`, `${cooler} cool on it`];
}

function framingColumn(campaign: Campaign, recordId: string, framing: DecisionFramingKey): ActColumn {
  const def = DECISION_FRAMINGS[framing];
  const result = frameDecision(campaign, recordId, framing);
  const contradicts = result.ok ? result.contradicts : false;
  return {
    id: framing, label: def.name, verb: `Frame it as ${def.name.toLowerCase()}`,
    ...(result.ok ? {} : { refusal: result.reason }),
    review: contradicts
      ? `${def.line} But the order itself says something different. Within a week, reporters will have read it, and the outlets that repeated your version will correct it more harshly.`
      : `${def.line} The order backs this up, and each outlet moves as far as it believes you.`,
    cells: {
      line: actCell(def.line),
      honest: contradicts ? actCell("No. The text says something different, and reporters will notice", "adverse") : actCell("Yes", "favorable"),
      desks: actCell(deskMoves(campaign, recordId, framing)),
    },
  };
}

/** The four framings of one order; unframed, reporters judge the text as written. */
export function framingComparison(campaign: Campaign, recordId: string): ActComparison {
  return { rows: FRAMING_ROWS, columns: DECISION_FRAMING_KEYS.map((key) => framingColumn(campaign, recordId, key)) };
}

export function framingPacket(campaign: Campaign, recordId: string, framing: DecisionFramingKey): EffectPacket {
  const result = frameDecision(campaign, recordId, framing);
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}

// --- Taking the hit ---------------------------------------------------------

const HIT_ROWS = [
  { key: "who", label: "Who stands at the podium" },
  { key: "corps", label: "Reporters" },
  { key: "price", label: "What it costs" },
] as const;

/** Sending the press secretary out to take the week's bad answer. */
export function takeTheHitComparison(campaign: Campaign): ActComparison {
  const projection = secretaryTakesTheHit(campaign);
  const now = formatRatio(campaign.press.standing);
  const name = projection.ok ? projection.secretary.name : (pressSecretary(campaign)?.name ?? "The press secretary");
  const send: ActColumn = {
    id: "take-the-hit", label: `Send ${name}`, verb: "Send the press secretary out",
    ...(projection.ok ? {} : { refusal: projection.reason }),
    review: `${name} tells reporters the week's worst answer was their own mistake. You can do this once. After that, their briefings carry half the weight with reporters.`,
    cells: {
      who: actCell(name),
      corps: projection.ok ? actCell(`From ${now} to ${formatRatio(projection.standingAfter)}`, "favorable") : actCell("No change"),
      price: actCell("How much reporters believe your press secretary, for as long as they hold the job", "caution"),
    },
  };
  return { rows: HIT_ROWS, columns: [send] };
}

export function takeTheHitPacket(campaign: Campaign): EffectPacket {
  const result = secretaryTakesTheHit(campaign);
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}
