import { ACUTE_CONDITIONS, createRngStreams, pickWeighted, type AcuteCondition, type Campaign } from "@admin/engine";
import {
  SECTOR_AXIS,
  STATE_DISASTER_ELIGIBILITY,
  stateById,
  worldCities,
  type City,
  type State,
  type StateEconomyAxis,
  type StateId,
} from "@admin/world";
import type { ScenarioDef } from "./scenario.js";
import type { ScenarioTopicTag } from "./scenario-topics.js";

// Which state a home scenario lands in when it names none.
//
// The draw used to be even over every state with a city of the site's kind, so
// a refinery strike was as likely in Vermont as in Texas. It is weighted now by
// what the dataset already knows about each state, read against what the
// scenario already declares about itself: its sector, its topics, its class and
// any disaster it is gated on. Nothing is inferred from prose. A scenario that
// declares none of those is weighted by population alone, because an event
// with nothing else to say about where it happened is likeliest where people
// are.
//
// Population enters as its square root. The candidates are only the states
// with a city of the site's kind, which already leaves out most small states
// for a coast or a border site, so a draw in plain proportion to population
// put a fifth of one campaign's unplaced scenarios in California against its
// twelfth of the country. Measured over the shipped corpus on six seeds, the
// square root keeps the most-drawn state near its own population share.

/** What a scenario's own fields say about the kind of state it belongs in. */
export type StateFit = {
  /** Economy axes whose share in a state makes it likelier. */
  readonly axes: readonly StateEconomyAxis[];
  /** Weigh by how many kinds of disaster a state is exposed to. */
  readonly hazard: boolean;
  /** Disasters the scenario is gated on: a state none of them can strike is out. */
  readonly acute: readonly AcuteCondition[];
};

// Only the topics that name an industry. The rest (fiscal, labor, trade,
// health and so on) happen in every state's economy, and reading an axis into
// them would be a guess the dataset cannot back.
const TOPIC_AXIS: Readonly<Partial<Record<ScenarioTopicTag, StateEconomyAxis>>> = {
  energy: "energy",
  tech: "tech",
  war: "defense",
};

// Pandemic is eligible everywhere, so it says nothing about where.
const PLACED_ACUTE: ReadonlySet<string> = new Set(ACUTE_CONDITIONS.filter((kind) => kind !== "pandemic"));

export function stateFit(def: Pick<ScenarioDef, "class" | "topics" | "conditions" | "locus">): StateFit {
  const axes = new Set<StateEconomyAxis>();
  if (def.locus.sector) axes.add(SECTOR_AXIS[def.locus.sector]);
  for (const topic of def.topics ?? []) {
    const axis = TOPIC_AXIS[topic];
    if (axis) axes.add(axis);
  }
  const acute = new Set<AcuteCondition>();
  for (const condition of def.conditions) {
    if (condition.kind === "conditionActive" && condition.condition && PLACED_ACUTE.has(condition.condition)) {
      acute.add(condition.condition as AcuteCondition);
    }
  }
  const hazard = def.class === "disaster" || (def.topics ?? []).includes("disaster");
  return { axes: [...axes].sort(), hazard, acute: [...acute].sort() };
}

/** How many kinds of placed disaster the eligibility table lets strike this state. */
function exposure(state: StateId): number {
  return [...PLACED_ACUTE].filter((kind) => STATE_DISASTER_ELIGIBILITY[kind as AcuteCondition].includes(state)).length;
}

function eligible(state: StateId, acute: readonly AcuteCondition[]): boolean {
  return acute.every((kind) => STATE_DISASTER_ELIGIBILITY[kind].includes(state));
}

export function stateWeight(state: State, fit: StateFit): number {
  if (!eligible(state.id, fit.acute)) return 0;
  const economy = state.character.economy;
  const axis = fit.axes.length === 0 ? 1 : fit.axes.reduce((sum, name) => sum + economy[name], 0) / fit.axes.length;
  const hazard = fit.hazard ? exposure(state.id) : 1;
  return Math.sqrt(state.population) * axis * hazard;
}

/**
 * The state a home scenario that names none is about, from the campaign seed
 * and the scenario id, over the states with a city of the site's kind,
 * weighted by fit. Keyed on the scenario and not the turn, on its own stream,
 * so the same scenario in the same campaign is always about the same state and
 * this draw moves no other. Reads the dataset's authored states rather than the
 * campaign's runtime ones for the same reason: a weight that drifted week to
 * week would move a scenario between states mid-campaign.
 */
export function seededState(campaign: Campaign, def: ScenarioDef, fits: (city: City) => boolean, availableStates?: ReadonlySet<StateId>): StateId | undefined {
  const seen = Object.values(campaign.cases ?? {}).filter((item) => item.story?.place);
  const pinned = seen.find((item) => item.story?.scenario === def.id)?.story?.place?.state;
  if (pinned) return pinned;
  const uses = new Map<StateId, number>();
  for (const item of seen) {
    const state = item.story!.place!.state;
    uses.set(state, (uses.get(state) ?? 0) + 1);
  }
  const candidates = [
    ...(availableStates ?? new Set(worldCities.filter((city) => city.state !== undefined && city.state !== "DC" && fits(city)).map((city) => city.state!))),
  ]
    .sort()
    .map((id) => stateById.get(id))
    .filter((state): state is State => state !== undefined);
  if (candidates.length === 0) return undefined;
  const fit = stateFit(def);
  // A gate the dataset says no candidate can meet is not a reason to place the
  // scenario nowhere: the scenario is still live, so it is weighted without it.
  const gated = candidates.some((state) => stateWeight(state, fit) > 0) ? fit : { ...fit, acute: [] };
  const roll = createRngStreams(campaign.seed).stream("locus-state", def.id).next();
  return pickWeighted(candidates, (state) => stateWeight(state, gated) / (1 + (uses.get(state.id) ?? 0)), roll).id;
}
