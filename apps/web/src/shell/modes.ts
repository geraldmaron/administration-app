import { PLACES, personStanding, type PlaceKey } from "@admin/player-core";
import type { Campaign } from "@admin/engine";
import type { IconName, NavGroup, NavItem } from "@admin/ui-web";
import type { PlaceCount } from "./attention/marks";

/** The id of the "Waiting on you here" list at the top of each destination. */
export const WAITING_HERE_ID = "waiting-here";

// The main navigation, grouped by what the President is trying to do. Hrefs
// and titles come from the one place table; groups, labels and glyphs are
// chosen here, where icons are bound.

type GroupSpec = { readonly id: string; readonly label: string; readonly icon: IconName; readonly items: readonly (readonly [PlaceKey, string, IconName])[] };

const GROUPS: readonly GroupSpec[] = [
  { id: "desk", label: "Brief", icon: "brief", items: [["brief", "Brief", "brief"]] },
  {
    id: "government",
    label: "Government",
    icon: "westWing",
    items: [["washington", "Executive", "westWing"], ["congress", "Congress", "subjectChamber"], ["courts", "Courts", "court"], ["oversight", "Oversight", "review"]],
  },
  {
    id: "domestic",
    label: "Domestic",
    icon: "flag",
    items: [["nation", "Nation", "flag"], ["policy", "Policy", "domesticLedger"], ["budget", "Budget", "budget"], ["economy", "Economy", "economyGrowth"], ["emergency", "Emergency", "caution"]],
  },
  { id: "world", label: "World", icon: "world", items: [["world", "World", "world"], ["security", "Security", "shield"]] },
  { id: "press", label: "Press", icon: "microphone", items: [["pressOffice", "Press", "microphone"]] },
  { id: "record", label: "Record", icon: "record", items: [["record", "Record", "record"]] },
];

const UTILITIES: readonly (readonly [PlaceKey, string, IconName])[] = [["handbook", "Handbook", "info"], ["administrations", "Administrations", "archive"], ["settings", "Settings", "utilitySettings"]];

/** The groups the phone bar names directly; Press, Record and the utilities are behind More. */
export const PHONE_GROUPS: readonly string[] = ["desk", "government", "domestic", "world"];

function item([key, label, icon]: readonly [PlaceKey, string, IconName], counts: Partial<Record<PlaceKey, PlaceCount>>): NavItem {
  const count = counts[key];
  // While anything here is new, the item leads to the page's "Waiting on you here" list, which lights up on arrival and links each thing to its section.
  const href = count?.fresh && key !== "brief" ? `${PLACES[key].href}#${WAITING_HERE_ID}` : PLACES[key].href;
  return { id: key, label, href, icon, ...(count?.fresh ? { attention: count.fresh } : {}), ...(count?.waiting ? { waiting: count.waiting } : {}) };
}

export function navGroups(counts: Partial<Record<PlaceKey, PlaceCount>> = {}): readonly NavGroup[] {
  return GROUPS.map((group) => ({ id: group.id, label: group.label, icon: group.icon, items: group.items.map((spec) => item(spec, counts)) }));
}

export function navUtilities(): readonly NavItem[] {
  return UTILITIES.map((spec) => item(spec, {}));
}

const ALL: readonly PlaceKey[] = [...GROUPS.flatMap((group) => group.items.map(([key]) => key)), ...UTILITIES.map(([key]) => key)];

/**
 * The destination a pathname sits under: the longest place href that
 * prefixes it, so a person's file is under Executive and a state under States.
 */
export function currentPlace(pathname: string): PlaceKey | undefined {
  let best: PlaceKey | undefined;
  for (const key of ALL) {
    const href = PLACES[key].href;
    const under = pathname === href || pathname.startsWith(`${href}/`);
    if (under && (!best || href.length > PLACES[best].href.length)) best = key;
  }
  return best;
}

/** The section a person belongs to, so their dossier lights the part of government they sit in rather than Executive for everyone. */
const PERSON_PLACE: Partial<Record<ReturnType<typeof personStanding>["kind"], PlaceKey>> = {
  justice: "courts",
  hill: "congress",
  governor: "nation",
  "foreign-leader": "world",
  foreign: "world",
};

/** `currentPlace`, with a person's dossier placed under the section their role belongs to. */
export function navPlace(pathname: string, campaign: Campaign): PlaceKey | undefined {
  const person = /^\/washington\/person\/([^/]+)$/.exec(pathname);
  if (!person?.[1]) return currentPlace(pathname);
  const standing = personStanding(campaign, decodeURIComponent(person[1]));
  if (standing.kind === "agency" && standing.circuit) return "courts";
  return PERSON_PLACE[standing.kind] ?? currentPlace(pathname);
}
