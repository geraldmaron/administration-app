import type { Campaign } from "@admin/engine";
import { courtOverview } from "../../judiciary/court-overview.js";
import { noData, solid, type MapLens } from "../contract.js";
import { rampStep, type MapPalette } from "../palette.js";
import type { CourtCircuit } from "../../judiciary/court-system.js";

// The federal circuits on the map: each state in the color of its circuit's
// bench, Democratic appointees on the blue end of the diverging ramp. An empty
// bench reads as no data, never as an even one.

const NO_ADMINISTRATION = "No game in progress";

/** "Ninth Circuit", "D.C. Circuit". */
function circuitWords(name: string): string {
  return `${name === "District of Columbia" ? "D.C." : name} Circuit`;
}

function marginWords(circuit: Pick<CourtCircuit, "democratic" | "republican" | "vacant">): string {
  const open = circuit.vacant > 0 ? `, ${circuit.vacant} open` : "";
  return `${circuit.democratic} Democratic and ${circuit.republican} Republican appointees${open}. The party that picked a judge is only a rough guide, and it doesn't predict how they'll rule.`;
}

export function circuitsLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const byState = new Map(campaign ? courtOverview(campaign).circuits.flatMap((circuit) => circuit.states.map((state) => [state, circuit] as const)) : []);
  return {
    id: "circuits",
    name: "Circuits by their benches",
    level: "state",
    scale: "diverging",
    encoding: "color",
    legend: [
      { label: "Democratic appointees", color: palette.div[0] ?? palette.neutral },
      { label: "Even", color: palette.div[3] ?? palette.neutral },
      { label: "Republican appointees", color: palette.div[6] ?? palette.neutral },
    ],
    read: (region) => {
      if (region.layer !== "states") return null;
      if (!campaign) return noData(palette, NO_ADMINISTRATION);
      const circuit = byState.get(region.id);
      if (!circuit) return null;
      const filled = circuit.democratic + circuit.republican;
      if (filled === 0) return noData(palette, `${circuitWords(circuit.name)}: no seat filled`);
      const margin = (circuit.democratic - circuit.republican) / filled;
      return solid(`${circuitWords(circuit.name)}: ${marginWords(circuit)}`, margin, rampStep(palette.div, (1 - margin) / 2));
    },
  };
}
