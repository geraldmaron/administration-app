import { selectPerson, type Campaign } from "@admin/engine";
import { monogramFor, portraitSpecFor } from "@admin/player-core";
import { faceSource } from "@admin/ui-web";
import type { PersonId } from "@admin/world";

export type Face = { readonly name: string; readonly src?: string; readonly monogram: string };

/** A person's drawn face at their age today, or their initials when they have none yet. */
export function faceOf(campaign: Campaign, personId: string, fallbackName = "Unknown"): Face {
  const person = selectPerson(campaign, personId as PersonId)?.base;
  const name = person?.name ?? fallbackName;
  const spec = person ? portraitSpecFor(person, { campaign }) : undefined;
  const src = spec ? faceSource(spec.genome, spec.age, { key: spec.key, ...(spec.mood ? { mood: spec.mood } : {}), ...(spec.treatment ? { treatment: spec.treatment } : {}) }) : undefined;
  return { name, monogram: monogramFor(name), ...(src ? { src } : {}) };
}
