import { stateById } from "@admin/world";
import { solid, type MapLens } from "./contract";
import type { MapPalette } from "./palette";

// Where a ticket is from, before any campaign exists. The lens id names its
// subject (`homes:<you>:<mate>:<bench>`, each a state id or empty, the bench a
// comma list) because the draft being balanced is what it colors.

const HOMES = "homes:";

type Homes = { readonly you: string; readonly mate: string; readonly bench: ReadonlySet<string> };

/** The id that names a ticket's homes: yours, your running mate's, and the shortlisted mates'. */
export function homesLensId(you: string | undefined, mate: string | undefined, bench: readonly string[] = []): string {
  return `${HOMES}${you ?? ""}:${mate ?? ""}:${bench.join(",")}`;
}

function parseHomes(id: string): Homes | undefined {
  if (!id.startsWith(HOMES)) return undefined;
  const [you = "", mate = "", bench = ""] = id.slice(HOMES.length).split(":");
  return { you, mate, bench: new Set(bench.split(",").filter(Boolean)) };
}

export function homesLens(id: string, palette: MapPalette): MapLens | undefined {
  const homes = parseHomes(id);
  if (!homes) return undefined;
  return {
    id,
    name: "Where the ticket is from",
    level: "state",
    scale: "categorical",
    encoding: "color",
    legend: [
      { label: "You", color: palette.own },
      { label: "Your running mate", color: palette.forStrong },
      { label: "Both", color: palette.selection },
      { label: "On the shortlist", color: palette.forLean },
    ],
    read: (region) => {
      if (region.layer !== "states") return null;
      const name = stateById.get(region.id)?.name ?? region.id;
      if (region.id === homes.you && region.id === homes.mate) return solid(`${name}: you and your running mate`, 4, palette.selection);
      if (region.id === homes.you) return solid(`${name}: your home`, 3, palette.own);
      if (region.id === homes.mate) return solid(`${name}: your running mate's home`, 2, palette.forStrong);
      if (homes.bench.has(region.id)) return solid(`${name}: home of a candidate on the shortlist`, 1, palette.forLean);
      return null;
    },
  };
}
