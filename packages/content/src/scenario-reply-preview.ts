import {
  apply,
  commitReply,
  createRngStreams,
  projectReply,
  selectCustomsReceipts,
  selectNation,
  selectRelationship,
  type Campaign,
  type Effect,
  type TradeMeasure,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import { castBound, castScenario, scenarioLive, type CastScenario } from "./scenario-cast.js";
import { reachabilityBoards, withFamiliesOpened } from "./scenario-reachability.js";
import type { ScenarioDef } from "./scenario.js";

// What each reply would do, read off the engine rather than off the authored
// fields. A reply's `cost` is only what its author typed; an instrument rung,
// a trade command, a declared impact and the approval the fold settles are
// invisible there. So a developer preview runs the reply the way a player's
// choice runs it: cast on a board where the scenario is live, projected,
// committed and applied to a copy, and the board diffed before and after.

export type PreviewBoard = { readonly index: number; readonly seed: string; readonly counterpart: NationId; readonly counterpartName: string };

export type PreviewChange = { readonly key: string; readonly before: number; readonly after: number };

export type PreviewMeasure = {
  readonly id: string; readonly kind: string; readonly sector: string; readonly target: string;
  readonly rate: number; readonly origin: string; readonly statute?: string;
};

export type ReplyPreview = {
  readonly replyId: string;
  readonly tone: string;
  readonly text: string;
  readonly available: boolean;
  /** The engine's own words when it refuses the reply on this board. */
  readonly refusal?: string;
  /** What the decision screen quotes before the choice. */
  readonly quoted: Readonly<Record<string, number>>;
  readonly metrics: readonly PreviewChange[];
  readonly opinion: readonly PreviewChange[];
  readonly relationship: readonly PreviewChange[];
  readonly customs?: PreviewChange;
  readonly imposed: readonly PreviewMeasure[];
  readonly lifted: readonly PreviewMeasure[];
  readonly flagsSet: readonly string[];
  readonly effects: readonly { readonly kind: string; readonly detail: string }[];
  readonly beats: readonly string[];
};

export type ScenarioPreview = {
  readonly boards: readonly PreviewBoard[];
  readonly board?: PreviewBoard;
  readonly subject?: string;
  readonly opening: readonly string[];
  readonly replies: readonly ReplyPreview[];
};

/** Movements below this are rounding, not a change worth a row. */
const EPSILON = 1e-6;

const boardCache = new Map<string, readonly { readonly campaign: Campaign; readonly cast: CastScenario }[]>();

/** Every board in the audit's own spread where this scenario is live, with the counterpart it binds there. */
export function previewBoardsFor(def: ScenarioDef): readonly { readonly campaign: Campaign; readonly cast: CastScenario }[] {
  // Keyed by the whole body: a draft and the shipped scenario it revises share an id.
  const key = JSON.stringify(def);
  const cached = boardCache.get(key);
  if (cached) return cached;
  const member = def.family !== undefined && def.family.role !== "opener";
  const live = reachabilityBoards([def]).flatMap((board) => {
    const campaign = member ? withFamiliesOpened(board, [def]) : board;
    const cast = castScenario(campaign, def);
    return cast && scenarioLive(campaign, def, cast.counterpart) ? [{ campaign, cast }] : [];
  });
  boardCache.set(key, live);
  return live;
}

function changes(before: Readonly<Record<string, unknown>>, after: Readonly<Record<string, unknown>>): PreviewChange[] {
  return Object.keys({ ...before, ...after }).flatMap((key) => {
    const a = before[key];
    const b = after[key];
    return typeof a === "number" && typeof b === "number" && Math.abs(b - a) > EPSILON ? [{ key, before: a, after: b }] : [];
  });
}

const measureRow = (measure: TradeMeasure): PreviewMeasure => ({
  id: measure.id, kind: measure.kind, sector: measure.sector, target: String(measure.target), rate: measure.rate,
  origin: measure.origin, ...(measure.statute ? { statute: measure.statute } : {}),
});

function effectDetail(effect: Effect): string {
  const record = effect as unknown as Record<string, unknown>;
  const reason = ["reason", "description", "summary"].map((key) => record[key]).find((value): value is string => typeof value === "string");
  if (reason) return reason;
  const { kind: _kind, ...rest } = record;
  const text = JSON.stringify(rest);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function tradeDiff(before: Campaign, after: Campaign) {
  const imposed = Object.values(after.trade.measures).filter((measure) => before.trade.measures[measure.id] === undefined).map(measureRow);
  const lifted = Object.values(after.trade.measures).filter((measure) =>
    measure.liftedTurn !== undefined && before.trade.measures[measure.id]?.liftedTurn === undefined).map(measureRow);
  const customs = { key: "customs receipts per week ($M)", before: selectCustomsReceipts(before), after: selectCustomsReceipts(after) };
  return { imposed, lifted, ...(Math.abs(customs.after - customs.before) > EPSILON ? { customs } : {}) };
}

function previewReply(campaign: Campaign, cast: CastScenario, index: number): ReplyPreview {
  const option = cast.script.options[index]!;
  const projection = projectReply(campaign, cast.script, option, createRngStreams(campaign.seed));
  const base = { replyId: option.id, tone: option.tone, text: option.text, quoted: { ...projection.cost } as Record<string, number> };
  const empty = { metrics: [], opinion: [], relationship: [], imposed: [], lifted: [], flagsSet: [], effects: [], beats: [] };
  if (!projection.available) return { ...base, ...empty, available: false, refusal: projection.missingCapability ?? "unavailable on this board" };
  const committed = commitReply(campaign, cast.script, option, createRngStreams(campaign.seed));
  if (!committed.ok) return { ...base, ...empty, available: false, refusal: committed.missingCapability ?? "refused at commit" };
  const after = apply(campaign, committed.packet);
  const home = campaign.founding.nation;
  const edge = (state: Campaign) => (selectRelationship(state, home, cast.counterpart) ?? {}) as Record<string, unknown>;
  return {
    ...base,
    available: true,
    metrics: changes(campaign.player.metrics, after.player.metrics),
    opinion: changes(campaign.player.opinion, after.player.opinion),
    relationship: changes(edge(campaign), edge(after)),
    ...tradeDiff(campaign, after),
    flagsSet: Object.keys(after.player.flags).filter((flag) => after.player.flags[flag] && !campaign.player.flags[flag]),
    effects: committed.packet.effects.map((effect) => ({ kind: effect.kind, detail: effectDetail(effect) })),
    beats: committed.beats.map((beat) => beat.text),
  };
}

/**
 * Run every reply of a scenario on one live board. `boardIndex` picks among
 * the live boards and `counterpart` recasts on that board when the scenario
 * is live against it there; neither ever binds the player's own country.
 */
export function previewScenario(def: ScenarioDef, boardIndex = 0, counterpart?: NationId): ScenarioPreview {
  const live = previewBoardsFor(def);
  const boards = live.map(({ campaign, cast }, index) => ({ index, seed: campaign.seed, counterpart: cast.counterpart,
    counterpartName: selectNation(campaign, cast.counterpart)?.base.identity.name ?? String(cast.counterpart) }));
  const chosen = live[Math.min(Math.max(boardIndex, 0), live.length - 1)];
  if (!chosen) return { boards, opening: [], replies: [] };
  const recast = counterpart && counterpart !== chosen.campaign.founding.nation && scenarioLive(chosen.campaign, def, counterpart)
    ? castBound(chosen.campaign, def, counterpart) : chosen.cast;
  const board = boards[live.indexOf(chosen)]!;
  return {
    boards,
    board: { ...board, counterpart: recast.counterpart,
      counterpartName: selectNation(chosen.campaign, recast.counterpart)?.base.identity.name ?? String(recast.counterpart) },
    subject: recast.script.subject,
    opening: recast.script.opening.map((beat) => beat.text),
    replies: recast.script.options.map((_, index) => previewReply(chosen.campaign, recast, index)),
  };
}
