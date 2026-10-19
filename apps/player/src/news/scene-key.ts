import type { SceneClass, SceneRegister } from "@admin/engine";

// Which still in assets/player/scenes a story is set over. Every scene class
// has a base still; a few have a variant painted for one setting and one
// register, which is used when the story's register matches it. The file
// names are the art's own: `scene_<class>[_<setting>_<register>]`.

export const SCENE_KEYS = [
  "culture",
  "death",
  "disaster",
  "economy",
  "economy_capital_strained",
  "espionage",
  "foreign_crisis",
  "hostage",
  "hostage_interior_strained",
  "institution",
  "justice",
  "migration",
  "public_health",
  "scandal",
  "scandal_capital_intact",
  "technology",
  "terror",
  "tragedy",
  "triumph",
  "unrest",
  "unrest_capital_strained",
  "war",
  "war_chokepoint_damaged",
] as const;

export type SceneKey = (typeof SCENE_KEYS)[number];

const VARIANTS: Readonly<Partial<Record<SceneClass, readonly { readonly register: SceneRegister; readonly key: SceneKey }[]>>> = {
  economy: [{ register: "strained", key: "economy_capital_strained" }],
  hostage: [{ register: "strained", key: "hostage_interior_strained" }],
  scandal: [{ register: "intact", key: "scandal_capital_intact" }],
  unrest: [{ register: "strained", key: "unrest_capital_strained" }],
  war: [{ register: "damaged", key: "war_chokepoint_damaged" }],
};

const isKey = (value: string): value is SceneKey => (SCENE_KEYS as readonly string[]).includes(value);

/** The still for a scene facet: the register's variant where one is painted, else the class's base still. */
export function sceneKeyFor(facet: { readonly kind?: SceneClass; readonly register?: SceneRegister }): SceneKey | undefined {
  if (!facet.kind) return undefined;
  const variant = facet.register ? VARIANTS[facet.kind]?.find((entry) => entry.register === facet.register) : undefined;
  if (variant) return variant.key;
  const base = facet.kind.replace(/-/g, "_");
  return isKey(base) ? base : undefined;
}

/** What the still shows, for its accessibility label: "Scene: foreign crisis". */
export function sceneLabel(kind: SceneClass | undefined): string {
  return kind ? `Illustration: ${kind.replace(/-/g, " ")}` : "Illustration";
}
