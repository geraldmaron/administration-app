import { PLACES, type PlaceKey } from "@admin/player-core";
import type { IconName, NavGroup, NavItem } from "@admin/ui";

// The main navigation, grouped by what the President is trying to do. Hrefs
// and titles come from player-core's one place table; groups, labels and
// glyphs are chosen here, where icons are bound.

type Spec = readonly [PlaceKey, string, IconName];

const GROUPS: readonly { id: string; label: string; icon: IconName; items: readonly Spec[] }[] = [
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

const UTILITIES: readonly Spec[] = [["handbook", "Handbook", "info"], ["administrations", "Administrations", "archive"], ["settings", "Settings", "utilitySettings"]];

export type NavCounts = Partial<Record<PlaceKey, { readonly fresh?: number; readonly waiting?: number }>>;

function item([key, label, icon]: Spec, counts: NavCounts): NavItem {
  const count = counts[key];
  return { id: key, label, href: PLACES[key].href, icon, ...(count?.fresh ? { fresh: count.fresh } : {}), ...(count?.waiting ? { waiting: count.waiting } : {}) };
}

/** The calendar sits with the Brief: both answer "what needs me, and when". It has no legacy place key. */
const CALENDAR: NavItem = { id: "calendar", label: "Calendar", href: "/calendar", icon: "schedule" };

export function navGroups(counts: NavCounts = {}): readonly NavGroup[] {
  return GROUPS.map((group) => {
    const items = group.items.map((spec) => item(spec, counts));
    return { id: group.id, label: group.label, icon: group.icon, items: group.id === "desk" ? [...items, CALENDAR] : items };
  });
}

/** The navigation item a pathname lights: a place, or the calendar. */
export function activeNavId(pathname: string): string | undefined {
  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) return "calendar";
  return currentPlace(pathname);
}

export function navUtilities(): readonly NavItem[] {
  return UTILITIES.map((spec) => item(spec, {}));
}

/** The phone bar: four places by name and More for everything else. */
export function phoneItems(counts: NavCounts = {}): readonly NavItem[] {
  return [
    item(["brief", "Brief", "brief"], counts),
    item(["washington", "Government", "westWing"], counts),
    item(["nation", "Domestic", "flag"], counts),
    item(["world", "World", "world"], counts),
    { id: "more", label: "More", href: "/more", icon: "menu" },
  ];
}

const ALL: readonly PlaceKey[] = [...GROUPS.flatMap((group) => group.items.map(([key]) => key)), ...UTILITIES.map(([key]) => key)];

/** The place a pathname sits under: the longest place href that prefixes it. */
export function currentPlace(pathname: string): PlaceKey | undefined {
  let best: PlaceKey | undefined;
  for (const key of ALL) {
    const href = PLACES[key].href;
    const under = pathname === href || pathname.startsWith(`${href}/`);
    if (under && (!best || href.length > PLACES[best].href.length)) best = key;
  }
  return best;
}

/** The phone bar's item for a place: its group's lead. */
export function phoneItemFor(place: PlaceKey | "calendar" | undefined): string | undefined {
  if (!place) return undefined;
  if (place === "brief" || place === "calendar") return "brief";
  if (["washington", "congress", "courts", "oversight"].includes(place)) return "washington";
  if (["nation", "policy", "budget", "economy", "emergency"].includes(place)) return "nation";
  if (["world", "security"].includes(place)) return "world";
  return "more";
}

/**
 * How many matters wait under each place, from the doors they open: a bill's
 * row opens Congress, so Congress carries its badge. Every matter also counts
 * on the Brief, where they are all listed.
 */
export function waitingCounts(hrefs: readonly string[]): NavCounts {
  const counts = new Map<PlaceKey, number>();
  const bump = (key: PlaceKey) => counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const href of hrefs) {
    const place = currentPlace(href.split(/[?#]/)[0] ?? href);
    if (place && place !== "brief") bump(place);
  }
  if (hrefs.length > 0) counts.set("brief", hrefs.length);
  return Object.fromEntries([...counts].map(([key, waiting]) => [key, { waiting }]));
}

/** The rail's badges for the desk's matters: each on the place its row opens, all of them on the Brief. */
export function mattersByPlace(matters: readonly { readonly href?: string }[]): NavCounts {
  return waitingCounts(matters.map((matter) => matter.href ?? PLACES.brief.href));
}

/** The phone bar has one item per group, so a group's item carries the sum of its places. */
export function phoneCounts(counts: NavCounts): NavCounts {
  const summed = new Map<PlaceKey, number>();
  for (const [key, count] of Object.entries(counts) as [PlaceKey, { readonly waiting?: number }][]) {
    if (key === "brief") continue;
    const item = phoneItemFor(key);
    if (item === "washington" || item === "nation" || item === "world") summed.set(item, (summed.get(item) ?? 0) + (count.waiting ?? 0));
  }
  return { ...(counts.brief ? { brief: counts.brief } : {}), ...Object.fromEntries([...summed].map(([key, waiting]) => [key, { waiting }])) };
}
