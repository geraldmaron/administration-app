import { isNationLens, type NationLensId } from "@admin/player-core";
import type { IconName } from "@admin/ui";

// The readings the Nation map can be colored by. Four are the Nation lenses the
// states table also ranks by; problems and governors color the map while the
// table keeps its own columns for them.

export const STAGE_LENSES = ["approval", "call", "lean", "conditions", "governors", "population"] as const;
export type StageLensId = (typeof STAGE_LENSES)[number];

export const isStageLens = (value: unknown): value is StageLensId => typeof value === "string" && (STAGE_LENSES as readonly string[]).includes(value);

export const STAGE_LENS_NAMES: Readonly<Record<StageLensId, string>> = {
  approval: "Approval",
  call: "Electoral call",
  lean: "Partisan lean",
  conditions: "Problems",
  governors: "Governors",
  population: "Population",
};

export const STAGE_LENS_ICONS: Readonly<Record<StageLensId, IconName>> = {
  approval: "ballot",
  call: "election",
  lean: "layerLean",
  conditions: "caution",
  governors: "subjectPerson",
  population: "layerBlocs",
};

/** The registry lens each choice draws. */
export const STAGE_MAP_LENS: Readonly<Record<StageLensId, string>> = {
  approval: "approval",
  call: "call",
  lean: "lean",
  conditions: "conditions",
  governors: "governors",
  population: "state-population",
};

/** What each color means, said under the switch so the map is never a guess. */
export const STAGE_LENS_ABOUT: Readonly<Record<StageLensId, string>> = {
  approval: "How many people in each state approve of the job you're doing. Slate gray means few do, and gold means many do.",
  call: "Which side would win each state if the election were this week, and by how much.",
  lean: "How strongly each state usually votes for one party, no matter what you do. Blue is Democratic and red is Republican.",
  conditions: "Where something is going wrong, like a flood or unrest. Red is the worst, and gold means you've declared an emergency there.",
  governors: "How each governor feels about you. A governor who likes you is more likely to say yes when you ask for help.",
  population: "How many people live in each state.",
};

/** The reading the states table ranks by: the lens itself, or approval where the map's reading has a column of its own. */
export function tableLens(lens: StageLensId): NationLensId {
  return isNationLens(lens) ? lens : "approval";
}
