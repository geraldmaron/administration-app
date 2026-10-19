import { useCallback, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";

/** A route pattern ("/brief/decision/$id") as a test for a pathname. */
function patternTest(pattern: string): RegExp {
  const trimmed = pattern.length > 1 ? pattern.replace(/\/$/, "") : pattern;
  const body = trimmed
    .split("/")
    .map((segment) => (segment.startsWith("$") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${body}/?$`);
}

/** Whether an href has a screen in this route tree, read off the given patterns. */
export function hasRoute(href: string, patterns: readonly RegExp[]): boolean {
  const pathname = href.split(/[?#]/)[0] ?? href;
  return patterns.some((pattern) => pattern.test(pathname));
}

/**
 * Whether an href leads to a screen that exists in this build. A door to a
 * screen a later build adds is drawn as words, not as a link to nowhere.
 */
export function useBuilt(): (href: string | undefined) => href is string {
  const router = useRouter();
  const patterns = useMemo(() => Object.keys(router.routesByPath).map(patternTest), [router]);
  return useCallback((href: string | undefined): href is string => href !== undefined && hasRoute(href, patterns), [patterns]);
}

export { patternTest };
