import { ECONOMIC_PAIN, NO_CYCLE, OPINION_CAUSE_LABELS, opinionCausesFor, selectNation, type Campaign, type CyclePhase, type OpinionCauseKey } from "@admin/engine";
import { MACRO_ANCHORS, type MacroAnchorSource } from "@admin/world";
import { place } from "../navigation/places";
import type { Stance } from "../reading";

export type EconomyTileKey = "inflation" | "unemployment" | "growth";

/** Which way a figure moved since the oath, and whether that is good news. */
export type EconomyChange = { readonly text: string; readonly better: boolean; readonly up: boolean };

/**
 * The live economy as the Desk's snapshot row shows it, beside the five
 * metrics: prices, jobs and growth are what a public judges an administration
 * by, and a Desk that shows only budget authority reads as if they were not.
 */
export type EconomyTile = {
  readonly key: EconomyTileKey;
  readonly caption: string;
  readonly figure: string;
  readonly stance: Stance;
  readonly stanceWord: string;
  /** Oldest first, this week last: where the term began, then now. */
  readonly series: readonly number[];
  readonly href: string;
  /** The move since the oath, when there has been one worth a tenth of a point. */
  readonly change?: EconomyChange;
};

const CAPTIONS: Readonly<Record<EconomyTileKey, string>> = {
  inflation: "Inflation",
  unemployment: "Unemployment",
  growth: "Growth",
};

/** A tenth of a point: the precision every one of these figures is published to. */
const VISIBLE_MOVE = 0.0005;

const oneDecimal = (value: number) => (Math.round(value * 1000) / 10).toFixed(1);

function formatRate(key: EconomyTileKey, value: number): string {
  if (key === "growth") return `${value > 0 ? "+" : value < 0 ? "−" : ""}${oneDecimal(Math.abs(value))}%`;
  return `${oneDecimal(value)}%`;
}

type Band = { readonly stance: Stance; readonly word: string };

/**
 * Prices and joblessness are read against where the term began, on the same
 * lines the public's own salience uses (`ECONOMIC_PAIN`): the tile turns red
 * exactly when the week is about it. Half that distance is the amber.
 */
function hardshipBand(key: "inflation" | "unemployment", moved: number): Band {
  const pain = ECONOMIC_PAIN[key];
  if (moved >= pain) return { stance: "adverse", word: key === "inflation" ? "Biting" : "Hurting" };
  if (moved >= pain / 2) return { stance: "caution", word: "Rising" };
  if (moved <= -pain / 2) return { stance: "favorable", word: key === "inflation" ? "Easing" : "Falling" };
  return { stance: "neutral", word: "Fair" };
}

function growthBand(now: number, start: number): Band {
  if (now < 0) return { stance: "adverse", word: "Shrinking" };
  if (now < start - 0.01) return { stance: "caution", word: "Slowing" };
  if (now > start + 0.005) return { stance: "favorable", word: "Picking up" };
  return { stance: "neutral", word: "Fair" };
}

function changeOf(key: EconomyTileKey, moved: number): EconomyChange | undefined {
  if (Math.abs(moved) < VISIBLE_MOVE) return undefined;
  const up = moved > 0;
  return { text: `${up ? "+" : "−"}${oneDecimal(Math.abs(moved))} pts`, up, better: key === "growth" ? up : !up };
}

/**
 * Prices, jobs and growth as they stand this week, each read against the
 * economy the term began on. There is no stored economic history yet, so the
 * sparkline is honest about what it knows: where the term started and now.
 */
export function economyTiles(campaign: Campaign): readonly EconomyTile[] {
  const runtime = selectNation(campaign, campaign.founding.nation);
  if (!runtime) return [];
  const now = runtime.stats.economy;
  const start = runtime.base.stats.economy;
  return (["inflation", "unemployment", "growth"] as const).map((key) => {
    const moved = now[key] - start[key];
    const band = key === "growth" ? growthBand(now[key], start[key]) : hardshipBand(key, moved);
    const change = changeOf(key, moved);
    return {
      key,
      caption: CAPTIONS[key],
      figure: formatRate(key, now[key]),
      stance: band.stance,
      // "Steady" beside a printed "+0.3 pts" reads as a contradiction; a visible move inside the quiet band is little changed, not unchanged.
      stanceWord: band.stance === "neutral" && change ? "Little changed" : band.word,
      series: [start[key], now[key]],
      href: place.metric(key),
      ...(change ? { change } : {}),
    };
  });
}

export function isEconomyTileKey(id: string): id is EconomyTileKey {
  return id in CAPTIONS;
}

/** One term the rate adds to or takes off the public's sense of being better off. */
export type EconomyApprovalTerm = {
  readonly label: string;
  /** Signed, in points of the prosperity judgment. */
  readonly points: number;
  readonly detail: string;
};

/** A rate opened up: where it is, where it started, where it rests, and what it does to approval. */
export type EconomyReading = {
  readonly tile: EconomyTile;
  readonly startFigure: string;
  /** The published figure this economy rests on, when a source publishes one. */
  readonly rest?: { readonly figure: string; readonly percent: number; readonly source: string; readonly year: number };
  readonly cycle: CyclePhase;
  readonly approval: readonly EconomyApprovalTerm[];
};

const SOURCE_NAMES: Readonly<Record<MacroAnchorSource, string>> = { wdi: "World Bank", bea: "BEA", bls: "BLS" };

/** The prosperity terms each rate owns: inflation owns both the pace of prices and where they have got to. */
const APPROVAL_TERMS: Readonly<Record<EconomyTileKey, readonly OpinionCauseKey[]>> = {
  inflation: ["inflation", "prices"],
  unemployment: ["unemployment"],
  growth: ["growth"],
};

export function economyReading(campaign: Campaign, key: EconomyTileKey): EconomyReading | undefined {
  const runtime = selectNation(campaign, campaign.founding.nation);
  const tile = economyTiles(campaign).find((entry) => entry.key === key);
  if (!runtime || !tile) return undefined;
  const anchor = MACRO_ANCHORS[campaign.founding.nation as string]?.[key];
  const causes = opinionCausesFor(campaign, "prosperity");
  return {
    tile,
    startFigure: formatRate(key, runtime.base.stats.economy[key]),
    ...(anchor ? { rest: { figure: formatRate(key, anchor.value), percent: Math.round(anchor.value * 1000) / 10, source: SOURCE_NAMES[anchor.source], year: anchor.year } } : {}),
    cycle: (campaign.cycles[campaign.founding.nation] ?? NO_CYCLE).phase,
    approval: APPROVAL_TERMS[key].flatMap((term) => {
      const cause = causes.find((entry) => entry.key === term);
      return cause ? [{ label: OPINION_CAUSE_LABELS[term], points: Math.round(cause.contribution * 1000) / 10, detail: cause.detail }] : [];
    }),
  };
}

// The markets readings live beside this module and reach the package barrel
// through it, so the integrator-held index needs no new line.
export * from "./markets";
export * from "./market-releases";
export * from "./market-levers";
export * from "./lever-comparison";
export * from "./state-economy";
