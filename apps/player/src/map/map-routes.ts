import { place } from "@admin/player-core";

/** A kind of map ref, the route pattern that shows it, and how its href is built. */
const DOORS: Readonly<Record<string, { readonly route: string; readonly href: (id: string) => string }>> = {
  state: { route: "/nation/state/[id]", href: place.state },
  district: { route: "/nation/state/[id]", href: place.district },
  nation: { route: "/world/nation/[id]", href: place.country },
};

/**
 * Where a region chosen on the map leads, when the screen for it exists in
 * `routes` (the route tree's patterns). Null otherwise, and the map keeps the
 * choice itself, so a place whose screen is not built is still a place the
 * player can look at.
 */
export function mapDestination(ref: string, routes: ReadonlySet<string>): string | null {
  const colon = ref.indexOf(":");
  if (colon <= 0) return null;
  const door = DOORS[ref.slice(0, colon)];
  const id = ref.slice(colon + 1);
  return door && id && routes.has(door.route) ? door.href(id) : null;
}

interface RouteNode {
  readonly href: unknown;
  readonly children: readonly RouteNode[];
}

/** Every screen's route pattern in the tree, with layout groups erased: `/(game)/nation/state/[id]` is `/nation/state/[id]`. */
export function routePatterns(root: RouteNode | null): ReadonlySet<string> {
  const walk = (node: RouteNode): string[] => [typeof node.href === "string" ? node.href : "", ...node.children.flatMap(walk)];
  const patterns = root ? walk(root) : [];
  return new Set(patterns.filter(Boolean).map((href) => `/${href.split("/").filter((segment) => segment && !/^\(.*\)$/.test(segment)).join("/")}`));
}
