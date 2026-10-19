import type { IdeologyVector } from "@admin/world";

// An outlet's politics in the words a media page uses, read off the beliefs
// the engine gives every masthead. The stance toward this administration is
// a separate reading (it moves with the record); this is what the house
// believes whoever is President.

/** Below this an axis is not a lean worth naming. */
const NAMED = 0.2;
const STRONG = 0.55;

function economy(value: number): string | undefined {
  if (Math.abs(value) < NAMED) return undefined;
  const side = value < 0 ? "left" : "right";
  return Math.abs(value) >= STRONG ? `Firmly ${side} on the economy` : `Leans ${side} on the economy`;
}

function authority(value: number): string | undefined {
  if (Math.abs(value) < NAMED) return undefined;
  if (value < 0) return Math.abs(value) >= STRONG ? "Strongly distrusts presidential power" : "Wary of presidential power";
  return value >= STRONG ? "Strongly backs presidential power" : "Open to presidential power";
}

function world(value: number): string | undefined {
  if (Math.abs(value) < NAMED) return undefined;
  return value < 0 ? "Favors working with other countries" : "America first";
}

/** "Leans left on the economy · Wary of presidential power", or "Centrist" when no axis is pronounced. */
export function leanWords(beliefs: IdeologyVector): string {
  const parts = [economy(beliefs.economicLeftRight), authority(beliefs.authLibertarian), world(beliefs.nationalistGlobalist)].filter((part): part is string => part !== undefined);
  return parts.length === 0 ? "Centrist" : parts.join(" · ");
}
