import { describeFigure, formatFigure, gradeOf, worldDataset } from "@admin/world";
import { esc } from "./view.mjs";

// How the console shows one metric: the figure as the unit registry formats
// it, the raw value beside it, a track where the schema bounds it, and the
// words the metric registry carries for it. One renderer for the profile, the
// editor, the catalog and the forces page, so a figure cannot read one way on
// one page and another way on the next.

const nationName = new Map(worldDataset.nations.map((nation) => [String(nation.id), nation.identity.name]));

const PROVENANCE_WORD = { authored: "authored", derived: "derived", runtime: "runtime" };

/** The provenance badge: authored is what the console edits; derived and runtime are not. */
export function provenanceBadge(metric) {
  return `<span class="badge prov-${esc(metric.provenance)}" title="${esc(provenanceTitle(metric))}">${esc(PROVENANCE_WORD[metric.provenance] ?? metric.provenance)}</span>`;
}

function provenanceTitle(metric) {
  if (metric.provenance === "authored") return "Written in packages/world source; editable here";
  return metric.derivedBy ?? metric.provenance;
}

/** The type chip: what kind of value the schema admits, with bounds or options. */
export function typeChip(metric) {
  const unit = metric.unit ? ` · ${esc(metric.unit.kind)}${metric.unit.suffix ? ` (${esc(metric.unit.suffix)})` : metric.unit.noun ? ` (${esc(metric.unit.noun)})` : ""}` : "";
  return `<span class="chip type">${esc(metric.valueType)}${unit}${metric.optional ? " · optional" : ""}</span>`;
}

/** The bounds in words: "0 to 1", "≥ 0", or the options of an enum. */
export function boundsText(metric) {
  if (metric.options) return metric.options.join(" · ");
  if (metric.min !== undefined && metric.max !== undefined) return `${metric.min} to ${metric.max}`;
  if (metric.min !== undefined) return `≥ ${metric.min}`;
  if (metric.max !== undefined) return `≤ ${metric.max}`;
  return "";
}

const isBounded = (metric) => typeof metric.min === "number" && typeof metric.max === "number" && metric.max > metric.min;

/** A track showing where a bounded number sits between the schema's ends. */
export function rangeTrack(metric, value) {
  if (!isBounded(metric) || typeof value !== "number") return "";
  const share = Math.max(0, Math.min(1, (value - metric.min) / (metric.max - metric.min)));
  const low = metric.scale?.low ?? String(metric.min);
  const high = metric.scale?.high ?? String(metric.max);
  return `<div class="track-row" title="${esc(low)} → ${esc(high)}"><span class="end">${esc(low)}</span><div class="track"><span style="width:${Math.round(share * 100)}%"></span></div><span class="end">${esc(high)}</span></div>`;
}

const rawNumber = (value) => (Number.isInteger(value) ? value.toLocaleString("en-US") : String(Math.round(value * 10_000) / 10_000));

/** The figure, as a player would read it where the unit registry knows how, raw everywhere else. */
export function figureFor(metric, value) {
  if (value === undefined || value === null) return '<span class="k">—</span>';
  if (typeof value === "number") {
    if (metric.unit) {
      const shown = metric.unit.kind === "index" ? `${gradeOf(value)} <span class="k">${rawNumber(value)}</span>` : describeFigure(value, metric.unit);
      return metric.unit.kind === "currency" || metric.unit.kind === "count" ? `${shown} <span class="k">raw ${rawNumber(value)}</span>` : shown;
    }
    return rawNumber(value);
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) {
    if (value.length === 0) return '<span class="k">none</span>';
    return value.map((entry) => `<span class="chip">${esc(typeof entry === "object" ? entry.id ?? entry.name ?? JSON.stringify(entry) : (nationName.get(String(entry)) ?? entry))}</span>`).join("");
  }
  if (typeof value === "object") {
    const parts = Object.entries(value)
      .filter(([, v]) => typeof v === "number" && v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([k, v]) => `<span class="chip">${esc(nationName.get(k) ?? k)} <b>${v <= 1 ? `${(v * 100).toFixed(1)}%` : v.toLocaleString("en-US")}</b></span>`);
    return parts.length ? parts.join("") : '<span class="k">none</span>';
  }
  return esc(String(value));
}

/** One row of a metric table: label and description, the figure, the track, and where it comes from. */
export function metricRow(metric, value, { link = true } = {}) {
  const href = `/metrics#${encodeURIComponent(metric.recordPath)}`;
  const name = link ? `<a href="${href}">${esc(metric.label)}</a>` : esc(metric.label);
  return `<tr id="${esc(metric.recordPath)}">
<td class="mname">${name}<div class="k">${esc(metric.description)}</div></td>
<td class="mvalue">${figureFor(metric, value)}${rangeTrack(metric, value)}</td>
<td class="mmeta">${typeChip(metric)} ${provenanceBadge(metric)}${metric.readBy ? `<div class="k readby" title="${esc(metric.readBy.join("\n"))}">read by ${esc(shortReaders(metric.readBy))}</div>` : metric.owedBy ? `<div class="k readby">owed to ${esc(metric.owedBy)}</div>` : ""}</td></tr>`;
}

/** `packages/world/src/dataset/bands.ts#powerScore` reads as `bands.powerScore`, the form an operator scans for. */
function shortReaders(readBy) {
  const parts = readBy.map((site) => {
    const [file, name] = site.split("#");
    return `${file.split("/").pop().replace(/\.(tsx?|mjs)$/, "")}.${name}`;
  });
  return parts.length <= 2 ? parts.join(", ") : `${parts.slice(0, 2).join(", ")} +${parts.length - 2}`;
}

/**
 * The input for one editable metric, typed from the registry: a select for an
 * enum, a checkbox pair for a boolean, a number field carrying the schema's
 * own min, max and step, text otherwise. The browser refuses what the schema
 * refuses before the overlay has to.
 */
export function inputFor(metric, value) {
  const name = esc(metric.recordPath);
  if (metric.valueType === "enum") {
    return `<select name="${name}" id="${name}">${(metric.options ?? []).map((option) => `<option value="${esc(option)}" ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}</select>`;
  }
  if (metric.valueType === "boolean") {
    return `<select name="${name}" id="${name}"><option value="true" ${value ? "selected" : ""}>true</option><option value="false" ${value ? "" : "selected"}>false</option></select>`;
  }
  if (metric.valueType === "number" || metric.valueType === "integer") {
    const step = metric.valueType === "integer" ? "1" : isBounded(metric) && metric.max - metric.min <= 2 ? "0.01" : "any";
    const bounds = `${metric.min !== undefined ? ` min="${metric.min}"` : ""}${metric.max !== undefined ? ` max="${metric.max}"` : ""}`;
    return `<input type="number" name="${name}" id="${name}" value="${esc(String(value ?? ""))}" step="${step}"${bounds}>`;
  }
  return `<input name="${name}" id="${name}" value="${esc(String(value ?? ""))}">`;
}

/** The unit as a short phrase for a table cell. */
export function unitWord(metric) {
  if (!metric.unit) return metric.scale ? `${metric.scale.low} → ${metric.scale.high}` : "";
  const { kind, suffix, noun, scale } = metric.unit;
  if (kind === "currency") return `USD${scale ? ` ×10^${scale}` : ""}`;
  if (kind === "index") return `index 0..1 (${metric.scale?.low ?? "low"} → ${metric.scale?.high ?? "high"})`;
  if (kind === "share") return `share of ${noun ?? "the whole"}`;
  return [kind, suffix ?? noun].filter(Boolean).join(" ");
}

export { formatFigure };
