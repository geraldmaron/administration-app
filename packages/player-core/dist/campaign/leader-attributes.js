import { deriveLeaderAttributes } from "@admin/engine";
export const LEADER_READINGS = [
    { key: "competence", label: "Competence", judged: true },
    { key: "loyalty", label: "Loyalty", judged: true },
    { key: "integrity", label: "Integrity", judged: true },
    { key: "charisma", label: "Charisma", judged: true },
    { key: "ambition", label: "Ambition", judged: false },
];
/**
 * The person a given career and route would produce from this draft.
 *
 * The age is pulled into the career's own plausible window first, because that
 * is exactly what choosing the career would do: the seal refuses an age outside
 * it. Without that, a card for a career whose window starts at 48 would price
 * itself at an age nobody can hold it at, and the figures on the card would not
 * be the figures the player got by pressing it.
 */
export function attributesUnder(draft, background, route) {
    const age = Math.min(Math.max(draft.age, background.ageRange.min), background.ageRange.max);
    return deriveLeaderAttributes({ age, ideology: draft.ideology }, background, route);
}
