import { router } from "expo-router";

/**
 * Writes a screen's presentation context into its address, replacing the
 * entry rather than stacking one per change, so Back leaves the screen.
 */
export function setSearchParams(params: Readonly<Record<string, string | undefined>>): void {
  router.setParams(params as never);
}

/** A route parameter as one string: the router hands an array for a repeated key. */
export function paramOf(value: string | readonly string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : (value as string | undefined);
}
