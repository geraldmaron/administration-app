import type { Campaign } from "@admin/engine";
import { faceForPerson, type FaceGenome, type FaceMood, type FaceTreatment, type FacedPerson } from "@admin/world";
import { currentAge } from "../dossier/person-age.js";

// Every face in the game is drawn from its person's own record: the genome the
// record describes, at the age the person is today, in the mood and treatment
// the surface asks for. Nothing is looked up in an image catalogue, so no two
// people share a face and nobody's face changes between screens. This module
// chooses what to draw; `@admin/ui-web/portrait` draws it.

export type PortraitOptions = {
  /** The campaign the person is seen in: it sets their age today. Absent, the record's own age. */
  readonly campaign?: Campaign;
  readonly mood?: FaceMood;
  readonly treatment?: FaceTreatment;
};

export type PortraitSpec = {
  /** Stable for one person at one age, mood and treatment, so a renderer can cache on it. */
  readonly key: string;
  readonly genome: FaceGenome;
  readonly age: number;
  readonly mood?: FaceMood;
  readonly treatment?: FaceTreatment;
};

const GENOMES = new Map<string, FaceGenome | null>();
// A bound on memory, not on correctness: a cleared cache only costs a rederivation.
const MAX_CACHED = 4000;

function genomeOf(person: FacedPerson): FaceGenome | undefined {
  const key = `${person.id}|${person.portraitRef}|${person.name}`;
  const cached = GENOMES.get(key);
  if (cached !== undefined) return cached ?? undefined;
  const genome = faceForPerson(person);
  if (GENOMES.size >= MAX_CACHED) GENOMES.clear();
  GENOMES.set(key, genome ?? null);
  return genome;
}

/** What to draw for this person on this surface, or undefined when they have no face yet and get a monogram. */
export function portraitSpecFor(person: FacedPerson, options: PortraitOptions = {}): PortraitSpec | undefined {
  const genome = genomeOf(person);
  if (genome === undefined) return undefined;
  const age = options.campaign ? currentAge(person, options.campaign) : person.age;
  return {
    key: `${person.id}|${person.portraitRef}|${age}|${options.mood ?? ""}|${options.treatment ?? ""}`,
    genome,
    age,
    ...(options.mood ? { mood: options.mood } : {}),
    ...(options.treatment ? { treatment: options.treatment } : {}),
  };
}

/** One or two initials for a person drawn without a face. */
export function monogramFor(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => [...part][0])
    .filter((letter): letter is string => letter !== undefined)
    .join("");
  return initials.length > 0 ? initials.toLocaleUpperCase("en-US") : "?";
}
