import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import { applyAffine, fitRectIn, invertAffine, type Affine, type Rect, type Viewport } from "./camera";
import { regionKey, type Region, type RegionTable } from "./data";
import { hexLayout, type HexLayout } from "./lenses/hex-layout";
import type { MapLens } from "./lenses/contract";
import type { MapPalette } from "./lenses/palette";

export interface HexHouseProps {
  readonly table: RegionTable;
  readonly lens: MapLens;
  readonly palette: MapPalette;
  readonly viewport: Viewport;
  readonly area: Rect;
  readonly selected: ReadonlySet<number>;
  readonly highContrast: boolean;
  readonly onHover: (region: Region | null, x: number, y: number) => void;
  readonly onSelect: (region: Region) => void;
}

/** The House layout over the districts the map carries, made once. */
export function districtHexes(table: RegionTable): HexLayout {
  const seats = table.regions
    .filter((region) => region.layer === "districts")
    .map((region) => ({ id: region.id, state: region.id.split("-")[0] ?? region.id, lon: region.centroid[0], lat: region.centroid[1] }));
  return hexLayout(seats);
}

/** Seven dots per hex, so the equal-area view keeps the map's dotted grain. */
const PETALS: readonly (readonly [number, number])[] = [[0, 0], ...[0, 1, 2, 3, 4, 5].map((i) => [Math.cos((Math.PI / 3) * i + Math.PI / 6), Math.sin((Math.PI / 3) * i + Math.PI / 6)] as const)];

function drawHexes(ctx: CanvasRenderingContext2D, layout: HexLayout, camera: Affine, props: HexHouseProps): void {
  const size = layout.size * camera.k;
  const radius = size * (props.highContrast ? 0.27 : 0.22);
  const spread = size * 0.56;
  for (const cell of layout.cells) {
    const region = props.table.byKey.get(regionKey("districts", cell.id));
    const reading = region ? props.lens.read(region, "district") : null;
    const fill = reading?.fill;
    ctx.fillStyle = fill?.kind === "solid" ? fill.color : props.palette.nodata;
    const [cx, cy] = applyAffine(camera, cell.x, cell.y);
    ctx.beginPath();
    for (const [dx, dy] of PETALS) {
      ctx.moveTo(cx + dx * spread + radius, cy + dy * spread);
      ctx.arc(cx + dx * spread, cy + dy * spread, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    if (region && props.selected.has(region.index)) {
      ctx.strokeStyle = props.palette.selection;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.95, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/**
 * The House as an equal-area hex cartogram over the dimmed map: every
 * district the same size, so a city's seats read as many as a prairie's.
 */
export function HexHouse(props: HexHouseProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const layout = useMemo(() => districtHexes(props.table), [props.table]);
  const camera = useMemo(() => fitRectIn(layout.bounds, props.area, 16), [layout, props.area]);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    element.width = Math.round(props.viewport.width * dpr);
    element.height = Math.round(props.viewport.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, props.viewport.width, props.viewport.height);
    drawHexes(ctx, layout, camera, props);
  }, [layout, camera, props]);
  const cellAt = (event: MouseEvent<HTMLCanvasElement>): Region | null => {
    const [x, y] = invertAffine(camera, event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    const nearest = layout.cells.reduce<{ id: string; d: number } | null>((best, cell) => {
      const d = (cell.x - x) ** 2 + (cell.y - y) ** 2;
      return !best || d < best.d ? { id: cell.id, d } : best;
    }, null);
    if (!nearest || nearest.d > layout.size ** 2) return null;
    return props.table.byKey.get(regionKey("districts", nearest.id)) ?? null;
  };
  return (
    <canvas
      ref={canvas}
      className="map-layer__hex"
      aria-hidden="true"
      onPointerMove={(event) => props.onHover(cellAt(event), event.nativeEvent.offsetX, event.nativeEvent.offsetY)}
      onPointerLeave={() => props.onHover(null, Number.NaN, Number.NaN)}
      onClick={(event) => {
        const region = cellAt(event);
        if (region) props.onSelect(region);
      }}
    />
  );
}
