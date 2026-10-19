import { generateUnitDesignation, type UnitDesignation } from "@admin/world";
import {
  unitConstraintOf,
  type ResolutionBeat,
  type ResolutionSequenceDef,
} from "./resolution-beat.js";

// Filling a step's slots, which is the half of this family that did not exist.
//
// The bank was authored, schema-checked and reachability-checked without ever
// being rendered: `generateUnitDesignation` had no caller, so no line was ever
// read with a real designation in it and nothing caught that an aviation verb
// was drawing an undersea squadron five times in six. This is the seam the
// ceremony primitive calls, and until that primitive ships it is what the
// bank's rendering test reads the bank through.

/** The nations and the person a sequence is played for. */
export type ResolutionCast = {
  /** The player's own government, as the roster displays it ("the United States"). */
  readonly actor: string;
  readonly target: string;
  readonly person: string;
};

export type RenderedResolutionStep = {
  readonly kind: ResolutionBeat["kind"];
  readonly outcome: ResolutionBeat["outcome"];
  /** The step's line with every slot filled and nothing left to substitute. */
  readonly line: string;
};

export type RenderedResolutionSequence = {
  readonly id: string;
  readonly steps: readonly RenderedResolutionStep[];
  /** The one formation the whole sequence names, absent if no step names one. */
  readonly unit?: UnitDesignation;
};

/**
 * American style for a name already ending in s: "the United States' airwaves",
 * not "the United States's airwaves". Six authored lines put a slot in the
 * possessive and the player's own government is the case that breaks.
 */
function possessive(name: string): string {
  return name.endsWith("s") || name.endsWith("S") ? `${name}'` : `${name}'s`;
}

function fillSlot(line: string, slot: string, value: string): string {
  return line
    .replaceAll(`{{${slot}}}'s`, possessive(value))
    .replaceAll(`{{${slot}}}`, value);
}

// A line that opens on a slot opens on whatever the roster hands over, and the
// roster hands over "the United States" with its article attached.
function openSentence(line: string): string {
  const first = line.slice(0, 1);
  return first === first.toUpperCase() ? line : `${first.toUpperCase()}${line.slice(1)}`;
}

/**
 * One sequence, ready to read. `seedParts` are joined the way every other
 * deterministic draw in the game joins a stream key, so the same campaign and
 * the same resolution always name the same formation.
 *
 * The unit is drawn once per sequence rather than once per step, because two
 * steps that both say {{unit}} are talking about the same formation.
 */
export function renderResolutionSequence(
  def: ResolutionSequenceDef,
  cast: ResolutionCast,
  ...seedParts: Array<string | number>
): RenderedResolutionSequence {
  const namesAUnit = def.steps.some((step) => step.particulars.includes("unit"));
  const unit = namesAUnit ? generateUnitDesignation(unitConstraintOf(def), ...seedParts, def.id) : undefined;
  const steps = def.steps.map((step) => {
    let line = step.line;
    line = fillSlot(line, "actor", cast.actor);
    line = fillSlot(line, "target", cast.target);
    line = fillSlot(line, "person", cast.person);
    if (unit) line = fillSlot(line, "unit", unit.designation);
    return { kind: step.kind, outcome: step.outcome, line: openSentence(line) };
  });
  return { id: def.id, steps, ...(unit ? { unit } : {}) };
}
