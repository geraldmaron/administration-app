import type { Region, RegionTable } from "../data";
import { LIFT_PX } from "../detach";
import type { MarkPoint } from "../marks/sources";
import type { MapView } from "../view";
import { labelTexts } from "./label-text";
import type { LabelCandidate, LabelTier, Rect } from "./place-labels";

const TIER: Readonly<Record<Region["layer"], LabelTier>> = { world: "nation", states: "state", districts: "district" };
/** Pins name capitols and metros to their right; their box is kept clear of locale names. */
const PIN_HALF = 9;
const PIN_TEXT_PX = 7;
/** A microstate's name moves out onto a leader line only once the view is near enough that the Caribbean is not one blot of them. */
const CALLOUT_ZOOM = 2;

function extent(renderer: MapView, region: Pick<Region, "bounds" | "label">, viewportWidth: number): { width: number; height: number } {
  const [west, south, east, north] = region.bounds;
  const [lon, lat] = region.label;
  // A shape across the antimeridian (Russia, Fiji) has bounds that wrap; its room is the view's.
  if (west > east) return { width: viewportWidth, height: viewportWidth };
  const a = renderer.project(west, lat);
  const b = renderer.project(east, lat);
  const c = renderer.project(lon, south);
  const d = renderer.project(lon, north);
  if (!a || !b || !c || !d) return { width: 0, height: 0 };
  return { width: Math.abs(b[0] - a[0]), height: Math.abs(c[1] - d[1]) };
}

/** The regions the view draws: the levels in the plan, with the United States' own outline dropped where its states or districts replace it. */
function drawnRegions(renderer: MapView, table: RegionTable): readonly Region[] {
  const plan = renderer.current?.plan;
  if (!plan) return [];
  const layers = new Set(plan.layers.map((entry) => entry.layer));
  return table.regions.filter((region) => layers.has(region.layer) && !(plan.replacesUsa && region.layer === "world" && region.id === "USA"));
}

/** Every locale in view that could be named, projected for the camera as drawn now. */
/**
 * A region's figure under the lens being read ("54%", "+0.2"), written beside its name where the shape has room,
 * and how salient its value is, which ranks it for a crowded spot ahead of its size.
 * Direct labels spare the reader the round trip through the key; the name-only forms remain, so a crowded
 * region still gets its name before it loses the figure.
 */
export type LabelHint = { readonly figure?: string; readonly salience?: number };
export type HintOf = (region: Region) => LabelHint | undefined;

/** Four salience tiers above area: an extreme region outranks a merely large one, and area settles a tie. */
const SALIENCE_TIERS = 4;
const TIER_WEIGHT = 1e10;

function salienceTier(salience: number | undefined): number {
  if (salience === undefined || salience <= 0) return 0;
  return Math.min(SALIENCE_TIERS - 1, Math.floor(salience * SALIENCE_TIERS)) * TIER_WEIGHT;
}

export function labelCandidates(renderer: MapView, table: RegionTable, hintOf?: HintOf): readonly LabelCandidate[] {
  const { width, height } = renderer.viewportSize;
  const selected = renderer.selection;
  const zoom = renderer.zoomLevel;
  const regions = drawnRegions(renderer, table).flatMap((region): LabelCandidate[] => {
    const point = renderer.project(region.label[0], region.label[1]);
    if (!point || point[0] < -40 || point[1] < -40 || point[0] > width + 40 || point[1] > height + 40) return [];
    const names = labelTexts(region);
    if (names.length === 0) return [];
    const hint = hintOf?.(region);
    const figure = hint?.figure;
    const texts = figure ? [...names.map((name) => `${name} ${figure}`), ...names] : names;
    const isSelected = selected.has(region.index);
    const context = selected.size > 0 && !isSelected;
    // Behind a selection the other districts are faded tiles; naming them all would bury the selection's own.
    if (context && region.layer === "districts") return [];
    const room = extent(renderer, region, width);
    const tier = TIER[region.layer];
    return [
      {
        key: `${region.layer}:${region.id}`,
        x: point[0],
        y: point[1] - (isSelected ? LIFT_PX : 0),
        ...room,
        texts,
        priority: (isSelected ? 1e12 : 0) + salienceTier(hint?.salience) + (context ? region.area / 1e6 : region.area),
        callout: !context && (tier === "state" || (region.pointOnly && zoom >= CALLOUT_ZOOM)),
        tier,
        ...(context ? { dim: true } : {}),
      },
    ];
  });
  return [...regions, ...provinceCandidates(renderer, width)];
}

/** Under the selection's own name, over every context name: a selected government's provinces. */
const PROVINCE_PRIORITY = 1e11;

/** The selected government's provinces, named on its lifted face in plain text like a district. */
function provinceCandidates(renderer: MapView, width: number): readonly LabelCandidate[] {
  const set = renderer.provinces.current;
  if (!set) return [];
  return set.provinces.flatMap((province): LabelCandidate[] => {
    const point = renderer.project(province.label[0], province.label[1]);
    if (!point || point[0] < -40 || point[0] > width + 40) return [];
    const room = extent(renderer, { bounds: province.bounds, label: province.label }, width);
    return [{ key: `province:${set.government}:${province.name}`, x: point[0], y: point[1] - LIFT_PX, ...room, texts: [province.name], priority: PROVINCE_PRIORITY + province.area, callout: false, tier: "province" }];
  });
}

/** The screen boxes the pins hold: the pin itself, and for a place pin its name to the right. */
export function pinBoxes(renderer: MapView, marks: readonly MarkPoint[]): readonly Rect[] {
  return marks.flatMap((mark): Rect[] => {
    const point = renderer.project(mark.lon, mark.lat);
    if (!point) return [];
    const named = mark.kind === "capitol" || mark.kind === "metro";
    const text = named ? (mark.kind === "capitol" ? mark.where : mark.label.replace(/ metro$/, "")) : "";
    return [{ x0: point[0] - PIN_HALF, y0: point[1] - PIN_HALF, x1: point[0] + PIN_HALF + text.length * PIN_TEXT_PX, y1: point[1] + PIN_HALF }];
  });
}
