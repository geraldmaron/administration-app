import {
  ALL_METRIC_DEFINITIONS,
  WORLD_REFERENCE_COUNTRIES,
  checkComparison,
  valueOf,
  worldWindow,
} from "@admin/world";
import { WINDOW_PRESETS, type ComparisonWindow } from "./comparison.js";
import type { EconomyHistoryRate } from "./history.js";

// Countries beside each other in the World Bank's published record. These are
// real-world reference figures for a chosen run of calendar years, and are
// never the campaign's simulated countries: a government in the running game
// is a different thing from the same country's published history, and the two
// are not drawn on one chart.

/** The measures countries can be set beside each other on: the three the campaign also reads, and population growth. */
export type PeerMeasure = EconomyHistoryRate | "population";

export const PEER_MEASURES: readonly PeerMeasure[] = [
  "unemployment",
  "inflation",
  "growth",
  "population",
];

const METRIC: Readonly<Record<PeerMeasure, string>> = {
  unemployment: "wb.unemployment",
  inflation: "wb.inflation",
  growth: "wb.gdp-growth",
  population: "wb.population-growth",
};

/** The countries the reference pack holds, in the order they are offered. */
export const PEER_GROUP: readonly {
  readonly id: string;
  readonly name: string;
}[] = Object.entries(WORLD_REFERENCE_COUNTRIES).map(([id, name]) => ({
  id,
  name,
}));

export const MAX_PEERS = 4;

export type PeerPoint = {
  readonly year: number;
  readonly label: string;
  readonly value: number | undefined;
  readonly gap?: string;
};

export type PeerSeries = {
  readonly id: string;
  readonly name: string;
  readonly evidence: "observed" | "estimated";
  readonly points: readonly PeerPoint[];
};

export type PeerWindow = ComparisonWindow & {
  readonly available: boolean;
  readonly reason?: string;
};

export type PeerView = {
  readonly rate: PeerMeasure;
  readonly peers: readonly string[];
  readonly windows: readonly PeerWindow[];
  readonly selected: PeerWindow;
  readonly series: readonly PeerSeries[];
  readonly unavailable?: string;
  /** What the figures are, in one line: the series, its provider and what its evidence class means. */
  readonly basis: string;
  readonly caution: string;
};

const yearOf = (month: string) => month.slice(0, 4);

function windowFor(
  rate: PeerMeasure,
  peers: readonly string[],
  window: ComparisonWindow,
): PeerWindow {
  for (const peer of peers) {
    const found = worldWindow(
      METRIC[rate],
      peer,
      yearOf(window.first),
      yearOf(window.last),
    );
    if (!found.ok) return { ...window, available: false, reason: found.reason };
  }
  return { ...window, available: true };
}

/** Peers kept to the pack's countries, without repeats, at most `MAX_PEERS`. */
export function normalizePeers(
  requested: readonly string[],
): readonly string[] {
  const known = new Set(PEER_GROUP.map((p) => p.id));
  return [...new Set(requested)]
    .filter((id) => known.has(id))
    .slice(0, MAX_PEERS);
}

export function peerComparisonView(
  rate: PeerMeasure,
  requested: readonly string[],
  windowId: string,
): PeerView {
  const peers = normalizePeers(requested);
  const metric = METRIC[rate];
  const definition = ALL_METRIC_DEFINITIONS[metric]!;
  const windows = WINDOW_PRESETS.map((preset) =>
    windowFor(rate, peers, preset),
  );
  const selected =
    windows.find((w) => w.id === windowId) ??
    windows.find((w) => w.available) ??
    windows[0]!;
  const basis = `World Bank ${definition.label.toLowerCase()}, annual: ${definition.definition}`;
  const general =
    "Countries measure these in different ways and update them later. A gap between two lines comes from two different sources and doesn't say anything about either government.";
  const caution =
    rate === "population"
      ? `${general} A sudden jump or drop usually means a new census changed the population count, not that people moved in or out.`
      : general;
  const base = { rate, peers, windows, selected, basis, caution };
  if (peers.length < 2)
    return {
      ...base,
      series: [],
      unavailable: "Pick at least 2 countries.",
    };
  if (!selected.available)
    return {
      ...base,
      series: [],
      unavailable:
        selected.reason ?? "There's no past data for this stretch of time.",
    };
  const verdict = checkComparison(definition, definition);
  if (verdict.status === "incompatible")
    return { ...base, series: [], unavailable: verdict.reason };
  const series = peers.map((peer): PeerSeries => {
    const found = worldWindow(
      metric,
      peer,
      yearOf(selected.first),
      yearOf(selected.last),
    );
    const rows = found.ok ? found.observations : [];
    return {
      id: peer,
      name: WORLD_REFERENCE_COUNTRIES[peer] ?? peer,
      evidence:
        rows[0]?.evidence === "estimated-reference" ? "estimated" : "observed",
      points: rows.map((o) => {
        const value = valueOf(o);
        return {
          year: Number(o.period),
          label: o.period,
          value,
          ...(value === undefined
            ? { gap: `No figure published for ${o.period}.` }
            : {}),
        };
      }),
    };
  });
  return { ...base, series };
}
