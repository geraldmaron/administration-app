import { generateUnitDesignation } from "@admin/world";
import { unitConstraintOf, } from "./resolution-beat.js";
/**
 * American style for a name already ending in s: "the United States' airwaves",
 * not "the United States's airwaves". Six authored lines put a slot in the
 * possessive and the player's own government is the case that breaks.
 */
function possessive(name) {
    return name.endsWith("s") || name.endsWith("S") ? `${name}'` : `${name}'s`;
}
function fillSlot(line, slot, value) {
    return line
        .replaceAll(`{{${slot}}}'s`, possessive(value))
        .replaceAll(`{{${slot}}}`, value);
}
// A line that opens on a slot opens on whatever the roster hands over, and the
// roster hands over "the United States" with its article attached.
function openSentence(line) {
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
export function renderResolutionSequence(def, cast, ...seedParts) {
    const namesAUnit = def.steps.some((step) => step.particulars.includes("unit"));
    const unit = namesAUnit ? generateUnitDesignation(unitConstraintOf(def), ...seedParts, def.id) : undefined;
    const steps = def.steps.map((step) => {
        let line = step.line;
        line = fillSlot(line, "actor", cast.actor);
        line = fillSlot(line, "target", cast.target);
        line = fillSlot(line, "person", cast.person);
        if (unit)
            line = fillSlot(line, "unit", unit.designation);
        return { kind: step.kind, outcome: step.outcome, line: openSentence(line) };
    });
    return { id: def.id, steps, ...(unit ? { unit } : {}) };
}
