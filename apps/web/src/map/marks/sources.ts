import { executiveOrder, hazardLabel, type Campaign } from "@admin/engine";
import { clusterForces, executivePins, peopleWords, pinnableItems, placeForces, placeOf, stateMetros, type ForceZoom, type PinnableItem, type Staffing } from "@admin/player-core";
import { STATE_CAPITOLS, worldCities, type StateId } from "@admin/world";

export type MarkKind = "incident" | "force" | "capitol" | "metro" | "office";

/** One thing the map pins: a running incident, a force cluster from player-core's placement, a detached state's capitol or metro, or an office (at its headquarters, or one a screen names). */
export interface MarkPoint {
  /** Stable across frames: `incident:<kind>:<id>`, `force:<cluster key>` or `office:<institution id>`, which is also the office's camera key. */
  readonly id: string;
  readonly kind: MarkKind;
  readonly label: string;
  /** Where it is, in words: the place's name, or the zone for a force not at an exact site. */
  readonly where: string;
  readonly lon: number;
  readonly lat: number;
  /** Ranks marks when more are in view than the cap: personnel for forces, severity for incidents. */
  readonly weight: number;
  /** The records behind the mark: commitment ids for forces, the record id for an incident, the office id for an office. */
  readonly members: readonly string[];
  /** An office's chair: confirmed, acting or vacant, which colors its pin. */
  readonly staffing?: Staffing;
  /** Something waits on the President from this office: a request, an offer to resign, an inquiry. */
  readonly alert?: boolean;
  /** Where choosing this mark alone goes. */
  readonly href?: string;
}

function incidentLabel(item: PinnableItem, place: { readonly lat: number; readonly lon: number }): string {
  switch (item.kind) {
    case "condition":
      return hazardLabel(item.record.kind, place);
    case "emergency":
      return `Emergency declared: ${item.record.cause === "armed-conflict" ? "armed conflict" : hazardLabel(item.record.cause, place)}`;
    case "mark":
    case "claim":
      return item.record.reason;
    case "order":
      return `Executive order: ${executiveOrder(item.record.order)?.name ?? item.record.order}`;
  }
}

function incidentId(item: PinnableItem, index: number): string {
  if (item.kind === "condition" || item.kind === "emergency" || item.kind === "order") return `incident:${item.kind}:${item.record.id}`;
  return `incident:${item.kind}:${item.state}:${item.record.signature}:${index}`;
}

function incidentWeight(item: PinnableItem): number {
  if (item.kind === "condition") return 1 + item.record.severity;
  if (item.kind === "emergency") return 2;
  if (item.kind === "order") return 1;
  return item.record.weight;
}

/** Every live incident with a place, through player-core's `placeOf`. */
export function incidentMarks(campaign: Campaign): readonly MarkPoint[] {
  return pinnableItems(campaign).flatMap((item, index): MarkPoint[] => {
    const place = placeOf(item);
    if (!place) return [];
    const id = incidentId(item, index);
    return [{ id, kind: "incident", label: incidentLabel(item, place), where: place.name, lon: place.lon, lat: place.lat, weight: incidentWeight(item), members: [id] }];
  });
}

/** Under every incident: a place pin ranks below anything happening there. */
const CAPITOL_WEIGHT = 0.2;
const METRO_WEIGHT = 0.1;

/**
 * A detached state's seat of government and its largest metros, from the
 * dataset's sourced capitols and the gazetteer. The dossier lists the same
 * places, so every pin has its twin in the panel.
 */
export function placeMarks(state: string): readonly MarkPoint[] {
  const capitol = STATE_CAPITOLS.find((row) => row.state === state);
  const capitolMark: MarkPoint[] = capitol
    ? [{ id: `capitol:${state}`, kind: "capitol", label: capitol.capitol, where: capitol.city, lon: capitol.lon, lat: capitol.lat, weight: CAPITOL_WEIGHT, members: [`capitol:${state}`] }]
    : [];
  const metros = stateMetros(state as StateId).map((metro): MarkPoint => ({
    id: `metro:${metro.id}`,
    kind: "metro",
    label: `${metro.name} metro`,
    where: `${metro.populationText} people`,
    lon: metro.lon,
    lat: metro.lat,
    weight: METRO_WEIGHT,
    members: [`metro:${metro.id}`],
  }));
  return [...capitolMark, ...metros];
}

/**
 * A selected government's capital and its largest cities, from the dataset's
 * city table: the same places its dossier and the game's events name.
 */
export function nationPlaceMarks(nation: string): readonly MarkPoint[] {
  return worldCities
    .filter((city) => city.nation === nation)
    .map((city): MarkPoint => {
      const capital = city.kind === "capital";
      return {
        id: `city:${city.id}`,
        kind: capital ? "capitol" : "metro",
        label: capital ? `${city.name}, the capital` : `${city.name} metro`,
        where: capital ? city.name : `${peopleWords(city.population)} people`,
        lon: city.lon,
        lat: city.lat,
        weight: capital ? CAPITOL_WEIGHT : METRO_WEIGHT * (city.population / 1e7),
        members: [`city:${city.id}`],
      };
    });
}

/** Far out, one force marker per command; at a region's scale, one per zone; up close, one per placement. */
export function forceZoomFor(zoomLevel: number): ForceZoom {
  if (zoomLevel < 1.5) return "world";
  if (zoomLevel < 3) return "region";
  return "close";
}

/** Force clusters at a zoom, from player-core's placement and clustering; never a position the save keeps. */
export function forceMarks(campaign: Campaign, zoom: ForceZoom): readonly MarkPoint[] {
  return clusterForces(campaign, placeForces(campaign), zoom).map((cluster) => ({
    id: `force:${cluster.key}`,
    kind: "force",
    label: cluster.label,
    where: cluster.precision === "installation" ? "Installation" : "Zone-level placement",
    lon: cluster.point[0],
    lat: cluster.point[1],
    weight: cluster.personnel,
    members: cluster.members,
  }));
}

const STAFFING_WEIGHT: Readonly<Record<Staffing, number>> = { vacant: 3, acting: 2, confirmed: 1 };

function officeLabel(name: string, staffing: Staffing, holder: string | undefined): string {
  if (staffing === "vacant" || !holder) return `${name}, vacant`;
  return staffing === "acting" ? `${name}, ${holder} acting` : `${name}, ${holder}`;
}

/** Every office with a sourced headquarters, colored by who holds its chair and ringed when something waits on the President. */
export function officeMarks(campaign: Campaign): readonly MarkPoint[] {
  return executivePins(campaign).flatMap((node): MarkPoint[] => {
    if (!node.site) return [];
    const alert = node.alerts.length > 0;
    return [
      {
        id: `office:${node.institution as string}`,
        kind: "office",
        label: officeLabel(node.name, node.staffing, node.holderName),
        where: node.site.name,
        lon: node.site.lon,
        lat: node.site.lat,
        weight: STAFFING_WEIGHT[node.staffing] + (alert ? 3 : 0),
        members: [node.office],
        staffing: node.staffing,
        alert,
        href: node.href,
      },
    ];
  });
}
