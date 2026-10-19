import { useCallback, useMemo } from "react";
import { useRouter, useSitemap, type Href } from "expo-router";
import { mapDestination, routePatterns } from "./map-routes";

/** A region chosen on a map goes to its own screen when there is one; otherwise `fallback` keeps the choice on the map. */
export function useRegionDoor(fallback?: (regionKey: string) => void): (regionKey: string) => void {
  const router = useRouter();
  const sitemap = useSitemap();
  const routes = useMemo(() => routePatterns(sitemap), [sitemap]);
  return useCallback(
    (regionKey: string) => {
      const href = mapDestination(regionKey, routes);
      if (href) router.push(href as Href);
      else fallback?.(regionKey);
    },
    [routes, router, fallback],
  );
}
