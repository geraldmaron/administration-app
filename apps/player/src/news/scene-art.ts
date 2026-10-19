import type { ComponentProps } from "react";
import type { Image } from "expo-image";
import type { SceneKey } from "./scene-key";

// Metro resolves an image only through a static require, so every still is
// named here once.
type Source = ComponentProps<typeof Image>["source"];

const SCENES: Readonly<Record<SceneKey, Source>> = {
  culture: require("../../../../assets/player/scenes/scene_culture.webp"),
  death: require("../../../../assets/player/scenes/scene_death.webp"),
  disaster: require("../../../../assets/player/scenes/scene_disaster.webp"),
  economy: require("../../../../assets/player/scenes/scene_economy.webp"),
  economy_capital_strained: require("../../../../assets/player/scenes/scene_economy_capital_strained.webp"),
  espionage: require("../../../../assets/player/scenes/scene_espionage.webp"),
  foreign_crisis: require("../../../../assets/player/scenes/scene_foreign_crisis.webp"),
  hostage: require("../../../../assets/player/scenes/scene_hostage.webp"),
  hostage_interior_strained: require("../../../../assets/player/scenes/scene_hostage_interior_strained.webp"),
  institution: require("../../../../assets/player/scenes/scene_institution.webp"),
  justice: require("../../../../assets/player/scenes/scene_justice.webp"),
  migration: require("../../../../assets/player/scenes/scene_migration.webp"),
  public_health: require("../../../../assets/player/scenes/scene_public_health.webp"),
  scandal: require("../../../../assets/player/scenes/scene_scandal.webp"),
  scandal_capital_intact: require("../../../../assets/player/scenes/scene_scandal_capital_intact.webp"),
  technology: require("../../../../assets/player/scenes/scene_technology.webp"),
  terror: require("../../../../assets/player/scenes/scene_terror.webp"),
  tragedy: require("../../../../assets/player/scenes/scene_tragedy.webp"),
  triumph: require("../../../../assets/player/scenes/scene_triumph.webp"),
  unrest: require("../../../../assets/player/scenes/scene_unrest.webp"),
  unrest_capital_strained: require("../../../../assets/player/scenes/scene_unrest_capital_strained.webp"),
  war: require("../../../../assets/player/scenes/scene_war.webp"),
  war_chokepoint_damaged: require("../../../../assets/player/scenes/scene_war_chokepoint_damaged.webp"),
};

export function sceneSource(key: SceneKey): Source {
  return SCENES[key];
}
