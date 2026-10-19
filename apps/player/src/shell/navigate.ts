import { useEffect } from "react";
import { router, usePathname } from "expo-router";

/** Opens a screen by its address. Every name, flag, row and button that is a door goes through here. */
export function go(href: string): void {
  router.push(href as never);
}

// The screens visited in this session, newest last. Back pops it only when the
// player arrived from inside the game; a cold deep link has nothing behind it,
// so Back opens the screen's declared parent instead of leaving the game.
let trail: readonly string[] = [];

function record(path: string): void {
  if (trail[trail.length - 1] === path) return;
  trail = trail[trail.length - 2] === path ? trail.slice(0, -1) : [...trail, path];
}

/** Keeps the trail in step with the address; the game frame calls it once. */
export function useTrail(): void {
  const pathname = usePathname();
  useEffect(() => record(pathname), [pathname]);
}

/** Whether Back can return to the screen the player actually came from. */
export function cameFromInside(): boolean {
  return trail.length > 1 && router.canGoBack();
}

/**
 * Returns to where the player came from, with its filters and scroll, or to
 * `parent` when this screen was opened directly.
 */
export function back(parent: string): void {
  if (cameFromInside()) router.back();
  else router.replace(parent as never);
}

/** The last screen visited before `pathname`, for a page shared by every branch that should keep the place the President came from. */
export function cameFrom(pathname: string): string | undefined {
  for (let index = trail.length - 1; index >= 0; index--) if (trail[index] !== pathname) return trail[index];
  return undefined;
}
