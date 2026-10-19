import type { CourtCircuit } from "@admin/player-core";
import { circuitWords, marginStep } from "./court-words";

export type CourtSelection = { readonly circuit?: string; readonly caseId?: string };

/** The map ref set that lifts a circuit's states, or nothing when no circuit is chosen. */
export function circuitSelection(circuits: readonly CourtCircuit[], name: string | undefined): string | undefined {
  const circuit = circuits.find((entry) => entry.name === name);
  return circuit ? circuit.states.map((state) => `state:${state}`).join("|") : undefined;
}

type ChipsProps = {
  readonly circuits: readonly CourtCircuit[];
  readonly selection: CourtSelection;
  readonly onSelect: (selection: CourtSelection) => void;
};

/** The thirteen circuits as a list that stands beside the map: pressing one lifts its states there and dims the rest of the page to it. */
export function CircuitChips({ circuits, selection, onSelect }: ChipsProps) {
  const focus = selection.circuit;
  return (
    <ul className="court-map__circuits" aria-label="Circuits">
      {circuits.map((circuit) => (
        <li key={circuit.name}>
          <button type="button" className="court-chip" aria-pressed={focus === circuit.name} data-step={marginStep(circuit.margin)}
            onClick={() => onSelect(focus === circuit.name ? {} : { circuit: circuit.name })}>
            <span className="court-chip__swatch" aria-hidden="true" />
            <span className="court-chip__name">{circuitWords(circuit.name)}</span>
            <span className="court-chip__count">{circuit.caseIds.length > 0 ? `${circuit.caseIds.length} live` : `${circuit.democratic}–${circuit.republican}`}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
