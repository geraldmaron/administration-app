import { useCallback, useEffect, useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { worldDistricts, worldNations, worldStates } from "@admin/world";
import type { MapInsets } from "../camera";
import { MapDataProvider } from "../data-context";
import { MapDirectiveProvider, useMapDirective, type MapDirective, type MapMarkLayers } from "../directive";
import { LENS_IDS } from "../lenses/registry";
import { MapLayer } from "../MapLayer";
import type { GlRuntime } from "../gl/use-gl-runtime";
import type { MapSettings } from "../settings";
import { summarize, type FrameSummary } from "../stats";
import { MAP_FIRST_PAINT_MARK } from "../view";
import { openingHarnessCampaign, stagedHarnessCampaign } from "./fixture";
import "./harness.css";

type CampaignChoice = "none" | "opening" | "staged";
type Chrome = "none" | "panel" | "sheet";

interface HarnessState {
  readonly directive: MapDirective;
  readonly campaign: CampaignChoice;
  readonly chrome: Chrome;
  readonly settings: MapSettings;
  readonly controls: boolean;
}

interface HarnessHandle {
  readonly runtime: GlRuntime;
  readonly fly: (kind: "world" | "us" | "state" | "district", id?: string) => Promise<void>;
}

declare global {
  interface Window {
    __mapHarness?: HarnessHandle;
  }
}

/** A deep link sets the harness up for a screenshot: `?camera=us&lens=approval&campaign=staged&chrome=sheet`. */
function initialState(): HarnessState {
  const query = new URLSearchParams(window.location.search);
  const get = (key: string): string | undefined => query.get(key) ?? undefined;
  const marks = get("marks") as MapMarkLayers | undefined;
  return {
    directive: { camera: get("camera") ?? "world", lens: get("lens") ?? "population", ...(get("selection") ? { selection: get("selection") } : {}), ...(marks ? { marks } : {}), turning: get("turning") === "1" },
    campaign: (get("campaign") as CampaignChoice | undefined) ?? "none",
    chrome: (get("chrome") as Chrome | undefined) ?? "none",
    settings: {
      camera: (get("motion") as MapSettings["camera"] | undefined) ?? "fly",
      density: (get("density") as MapSettings["density"] | undefined) ?? "standard",
      highContrast: get("contrast") === "high",
      palette: (get("palette") as MapSettings["palette"] | undefined) ?? "standard",
    },
    controls: get("controls") !== "0",
  };
}

/** What the shell's chrome would cover: a desktop panel docked right, or a phone sheet at its half detent over the tab bar. */
function chromeInsets(chrome: Chrome, width: number): MapInsets | undefined {
  if (chrome === "panel") return { top: 0, right: Math.min(480, width * 0.4), bottom: 0, left: 0 };
  if (chrome === "sheet") return { top: 0, right: 0, bottom: 334 + 84, left: 0 };
  return undefined;
}

function useCampaign(choice: CampaignChoice): Campaign | null {
  return useMemo(() => (choice === "opening" ? openingHarnessCampaign() : choice === "staged" ? stagedHarnessCampaign() : null), [choice]);
}

function Directive({ directive }: { readonly directive: MapDirective }) {
  useMapDirective(directive);
  return null;
}

function useFrameSummary(runtime: GlRuntime | null): FrameSummary | null {
  const [summary, setSummary] = useState<FrameSummary | null>(null);
  useEffect(() => {
    if (!runtime) return;
    const timer = window.setInterval(() => setSummary(summarize(runtime.frames.recent(240))), 500);
    return () => window.clearInterval(timer);
  }, [runtime]);
  return summary;
}

const ms = (value: number | undefined): string => (value !== undefined && Number.isFinite(value) ? value.toFixed(1) : "–");

function firstPaint(): string {
  const mark = performance.getEntriesByName(MAP_FIRST_PAINT_MARK)[0];
  return mark ? `${Math.round(mark.startTime)} ms` : "–";
}

function Readout({ runtime }: { readonly runtime: GlRuntime | null }) {
  const summary = useFrameSummary(runtime);
  const view = runtime?.view;
  return (
    <dl className="map-harness__readout">
      <dt>Moving frames p50 / p95</dt>
      <dd>
        {ms(summary?.intervalP50)} / {ms(summary?.intervalP95)} ms · {summary?.frames ?? 0} frames
      </dd>
      <dt>Camera</dt>
      <dd>{view ? `${view.target?.label ?? "–"} · zoom ${runtime.world.map.getZoom().toFixed(2)} · ${view.current.plan.effective} · ${view.moving ? "motion" : "rest"}` : "–"}</dd>
      <dt>First paint</dt>
      <dd>{firstPaint()}</dd>
    </dl>
  );
}

const STATES = [...worldStates].sort((a, b) => a.name.localeCompare(b.name));
const DISTRICTS = worldDistricts.map((d) => d.id as string);
const NATIONS = [...worldNations].sort((a, b) => a.identity.name.localeCompare(b.identity.name));
const CAMERAS: readonly (readonly [string, string])[] = [
  ["world", "World"],
  ["us", "United States"],
  ["dc", "Washington"],
  ["office:INST-TREASURY", "An office in the metro"],
  ["office:INST-CDC", "An office outside it"],
  ["zone:SEA-red-sea", "Red Sea"],
  ["set:nation:JPN|nation:KOR|nation:AUS", "A set"],
  ["keep", "Keep"],
  ["no-such-key", "Unknown key"],
];

type Update = (change: (state: HarnessState) => HarnessState) => void;

function CameraControls({ state, update }: { readonly state: HarnessState; readonly update: Update }) {
  const [stateId, setStateId] = useState("PA");
  const [district, setDistrict] = useState("NY-12");
  const [nation, setNation] = useState("FRA");
  const camera = (key: string, select = false) => update((s) => ({ ...s, directive: { ...s.directive, camera: key, ...(select ? { selection: key } : {}) } }));
  return (
    <div className="map-harness__row" role="group" aria-label="Camera">
      {CAMERAS.map(([key, label]) => (
        <button key={key} type="button" aria-pressed={state.directive.camera === key} onClick={() => camera(key)}>
          {label}
        </button>
      ))}
      <select aria-label="State" value={stateId} onChange={(e) => setStateId(e.target.value)}>
        {STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="button" onClick={() => camera(`state:${stateId}`, true)}>State</button>
      <select aria-label="District" value={district} onChange={(e) => setDistrict(e.target.value)}>
        {DISTRICTS.map((id) => <option key={id} value={id}>{id}</option>)}
      </select>
      <button type="button" onClick={() => camera(`district:${district}`, true)}>District</button>
      <select aria-label="Nation" value={nation} onChange={(e) => setNation(e.target.value)}>
        {NATIONS.map((n) => <option key={n.id} value={n.id}>{n.identity.name}</option>)}
      </select>
      <button type="button" onClick={() => camera(`nation:${nation}`, true)}>Nation</button>
      <button type="button" onClick={() => update((s) => ({ ...s, directive: { camera: s.directive.camera, lens: s.directive.lens, turning: s.directive.turning } }))}>Clear selection</button>
    </div>
  );
}

function pick<T extends string>(label: string, value: T, options: readonly T[], onChange: (next: T) => void) {
  return (
    <label>
      {label}{" "}
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function LensControls({ state, update }: { readonly state: HarnessState; readonly update: Update }) {
  const directive = (change: Partial<MapDirective>) => update((s) => ({ ...s, directive: { ...s.directive, ...change } }));
  const settings = (change: Partial<MapSettings>) => update((s) => ({ ...s, settings: { ...s.settings, ...change } }));
  return (
    <div className="map-harness__row">
      {pick("Lens", state.directive.lens ?? "neutral", [...LENS_IDS, "not-a-lens"], (lens) => directive({ lens }))}
      {pick("Pins", state.directive.marks ?? "auto", ["auto", "incidents", "forces", "both", "none"], (marks) => directive(marks === "auto" ? { marks: undefined } : { marks }))}
      {pick("Campaign", state.campaign, ["none", "opening", "staged"], (campaign) => update((s) => ({ ...s, campaign })))}
      {pick("Chrome", state.chrome, ["none", "panel", "sheet"], (chrome) => update((s) => ({ ...s, chrome })))}
      {pick("Camera", state.settings.camera, ["fly", "quick", "cut"], (camera) => settings({ camera }))}
      {pick("Density", state.settings.density, ["fine", "standard", "bold"], (density) => settings({ density }))}
      {pick("Palette", state.settings.palette, ["standard", "color-vision"], (palette) => settings({ palette }))}
      <label>
        <input type="checkbox" checked={state.settings.highContrast} onChange={(e) => settings({ highContrast: e.target.checked })} /> High contrast
      </label>
      <label>
        <input type="checkbox" checked={state.directive.paused === true} onChange={(e) => directive({ paused: e.target.checked })} /> Paused
      </label>
      <label>
        <input type="checkbox" checked={state.directive.turning === true} onChange={(e) => directive({ turning: e.target.checked })} /> Turning
      </label>
    </div>
  );
}

/** The map engine harness: the real MapLayer under every directive, setting and campaign, with a frame-time readout. */
export function MapHarness() {
  const [state, setState] = useState<HarnessState>(initialState);
  const [runtime, setRuntime] = useState<GlRuntime | null>(null);
  const campaign = useCampaign(state.campaign);
  const update: Update = useCallback((change) => setState(change), []);
  useEffect(() => {
    if (!runtime) return;
    const keys = { world: () => "world", us: () => "us", state: (id = "PA") => `state:${id}`, district: (id = "NY-12") => `district:${id}` };
    window.__mapHarness = {
      runtime,
      fly: async (kind, id) => update((s) => ({ ...s, directive: { ...s.directive, camera: keys[kind](id) } })),
    };
    return () => {
      delete window.__mapHarness;
    };
  }, [runtime, update]);
  const insets = chromeInsets(state.chrome, window.innerWidth);
  return (
    <section className="map-harness" aria-labelledby="map-harness-title">
      <h1 id="map-harness-title" className="map-harness__title">Map engine harness</h1>
      <MapDirectiveProvider>
        <MapDataProvider campaign={campaign}>
          <Directive directive={state.directive} />
          <MapLayer insets={insets} settings={state.settings} onRuntime={setRuntime} />
        </MapDataProvider>
      </MapDirectiveProvider>
      {insets ? <div className={`map-harness__chrome map-harness__chrome--${state.chrome}`} aria-hidden="true" /> : null}
      <aside className="map-harness__panel" data-collapsed={state.controls ? undefined : "true"}>
        <button type="button" onClick={() => update((s) => ({ ...s, controls: !s.controls }))}>{state.controls ? "Hide controls" : "Controls"}</button>
        {state.controls ? (
          <>
            <Readout runtime={runtime} />
            <CameraControls state={state} update={update} />
            <LensControls state={state} update={update} />
          </>
        ) : null}
      </aside>
    </section>
  );
}
