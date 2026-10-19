import { geoDistance } from "d3-geo";
import type { GeoJSONSource, Map as GlMapInstance } from "maplibre-gl";
import type { Viewport } from "../camera";
import type { RegionTable } from "../data";
import { planLevels, type LensLevel, type LevelPlan } from "../levels";
import { loadProvinces, selectedGovernment, type ProvinceSet } from "../provinces";
import type { CameraTarget } from "../target";
import type { MapView } from "../view";
import { isLive } from "./runtime";
import { PROVINCES_SOURCE } from "./style";

/** Anything that follows the camera every frame (marks, labels, cards, arcs) subscribes here. */
export class ViewBus {
  private readonly listeners = new Set<() => void>();
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Past this angle from the view's center a point is on the globe's far side; a hair short of 90° so a limb point does not flicker. */
const FAR_SIDE = (Math.PI / 2) * 0.97;

/** The zoom at which the whole globe fills the smaller side of a view: MapLibre's globe is 512·2^zoom/π pixels across. */
export function worldFitZoom(viewport: Viewport): number {
  const side = Math.min(viewport.width, viewport.height);
  return side > 0 ? Math.log2((Math.PI * side) / 512) : 0;
}

/**
 * The map as the overlays read it, from MapLibre's own camera. It also holds
 * what MapLibre does not: the lens level (which sets the levels the labels
 * name), the selection, the selected government's provinces, and the target
 * the route framed.
 */
export class GlView implements MapView {
  private level: LensLevel = "nation";
  private selected: ReadonlySet<number> = new Set();
  private provinceSet: ProvinceSet | null = null;
  private wantedGovernment: string | null = null;
  private framed: CameraTarget | null = null;
  private inMotion = false;

  constructor(
    private readonly map: GlMapInstance,
    private readonly table: RegionTable,
    readonly bus: ViewBus,
  ) {
    // Motion is tracked here rather than read from `isMoving()`, which can still say true inside `moveend`: the overlays' last placement must run knowing the camera has stopped.
    map.on("movestart", () => {
      this.inMotion = true;
    });
    map.on("move", () => bus.emit());
    map.on("moveend", () => {
      this.inMotion = false;
      bus.emit();
    });
    map.on("resize", () => bus.emit());
  }

  project(lon: number, lat: number): readonly [number, number] | null {
    // Only a globe has a far side; on the flat map every point in the frame is in front of the reader.
    const globe = this.map.getProjection()?.type !== "mercator";
    const center = this.map.getCenter();
    if (globe && geoDistance([center.lng, center.lat], [lon, lat]) > FAR_SIDE) return null;
    const point = this.map.project([lon, lat]);
    return Number.isFinite(point.x) && Number.isFinite(point.y) ? [point.x, point.y] : null;
  }

  get moving(): boolean {
    return this.inMotion;
  }

  get viewportSize(): Viewport {
    const container = this.map.getContainer();
    return { width: container.clientWidth, height: container.clientHeight };
  }

  get zoomLevel(): number {
    return Math.max(0, this.map.getZoom() - worldFitZoom(this.viewportSize));
  }

  get current(): { readonly plan: LevelPlan } {
    const bounds = this.map.getBounds();
    const extent = Math.max(Math.abs(bounds.getEast() - bounds.getWest()), Math.abs(bounds.getNorth() - bounds.getSouth()));
    return { plan: planLevels(this.level, extent, false) };
  }

  get selection(): ReadonlySet<number> {
    return this.selected;
  }

  get provinces(): { readonly current: ProvinceSet | null } {
    return { current: this.provinceSet && this.provinceSet.government === this.wantedGovernment ? this.provinceSet : null };
  }

  get target(): CameraTarget | null {
    return this.framed;
  }

  setLevel(level: LensLevel): void {
    this.level = level;
    this.bus.emit();
  }

  setTarget(target: CameraTarget | null): void {
    this.framed = target;
  }

  /** The selection, and the selected government's provinces: loaded when first asked for, drawn as inner lines and named by the label layer. */
  setSelection(selected: ReadonlySet<number>): void {
    this.selected = selected;
    const government = selectedGovernment(this.table, selected);
    this.wantedGovernment = government;
    this.showProvinces(null);
    if (government) {
      loadProvinces(government).then(
        (set) => {
          if (this.wantedGovernment !== government) return;
          this.provinceSet = set;
          this.showProvinces(set);
        },
        (cause: unknown) => console.warn(`Provinces for ${government} did not load`, cause),
      );
    }
    this.bus.emit();
  }

  private showProvinces(set: ProvinceSet | null): void {
    if (!isLive(this.map)) return;
    const source = this.map.getSource<GeoJSONSource>(PROVINCES_SOURCE);
    source?.setData(set ? { type: "Feature", properties: {}, geometry: set.lines } : { type: "FeatureCollection", features: [] });
    this.bus.emit();
  }
}
