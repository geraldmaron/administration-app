import type { MilitaryBranch, NationId } from "@admin/world";
import type { Campaign, ConflictSide, GameDate } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { selectNation } from "./state.js";
import { availableUnits } from "./capacity.js";
import { campaignDay } from "./nomination.js";
import { sideOf } from "./conflicts.js";
import { conflictsAsParty } from "./war-party.js";
import { selectObligations } from "./war-powers-report.js";
import { COMBATANT_COMMANDS, DEFAULT_AOR_BY_REGION, AOR_EXCEPTIONS, type CombatantCommandDef, type CombatantCommandId } from "./command-catalog.js";

export { COMBATANT_COMMANDS };
export type { CombatantCommandDef, CombatantCommandId };

// The chain of command below the president, which the game did not have.
//
// Before this the player ordered force and force happened. There was a ladder,
// a readiness bill, an order of battle and a war powers clock, and between the
// decision and the front there was nothing at all: no theater, no officer, no
// question of whose forces those were. So relieving a commander was not a move,
// a theater could not be under-resourced while another was full, and moving a
// country from one command's map to another — which is a real presidential act,
// done three times in twenty years — could not be done at all.
//
// Three statutory facts shape everything here, and none of them is decoration.
//
// **The chain runs President → Secretary of Defense → combatant commander.**
// The Chairman of the Joint Chiefs may carry the order and may argue with it;
// the Chairman never issues it. A design where the player "orders the Joint
// Chiefs" would be a design that got the law backwards.
//
// **A commander commands what has been assigned.** Forces move between commands
// by an act of the Secretary of Defense under procedures the President
// approved. A theater cannot help itself to another theater's bench, which is
// what makes a second crisis a harder problem than the first.
//
// **The map is a document.** Areas of responsibility are the Unified Command
// Plan's, prepared by the Chairman and approved by the President, so a country
// changing hands between commands is an amendment with a date on it rather
// than a fact of geography.
//
// Nothing here mutates. Every act returns a packet and apply() is the writer.

/**
 * An officer holding a four-star position.
 *
 * Not a `PersonId`, and deliberately: the campaign's people are the political
 * cast, and a combatant commander is not one of them. The star belongs to the
 * position rather than to the officer — it terminates when the assignment does
 * and the officer keeps a permanent grade — so what this records is a tenure in
 * a chair, which is the fact the game needs when the chair is emptied.
 */
export type CommandOfficer = {
  readonly name: string;
  readonly service: MilitaryBranch;
  /** The permanent grade the officer reverts to. Relief costs the star, not the career. */
  readonly permanentGrade: string;
  readonly confirmedDay: number;
  /** Serving as acting commander because the seat was emptied and no successor is confirmed. */
  readonly acting?: true;
};

export type CommandPosture = "routine" | "heightened" | "surge";

export type CommandRuntime = {
  readonly id: CombatantCommandId;
  readonly commander?: CommandOfficer;
  /** Day the seat was emptied, where it is. A command is never left unled, only led by a deputy. */
  readonly vacantSinceDay?: number;
  /**
   * Share of each service's formations assigned to this command, 0..1.
   * Assigned, not allocated: what a commander may employ without asking.
   */
  readonly assignment: Readonly<Record<MilitaryBranch, number>>;
  readonly posture: CommandPosture;
  /** How many commanders this administration has relieved here. The institution counts. */
  readonly reliefs: number;
  readonly lastReliefTurn?: number;
  /** Missions the President and Secretary have actually assigned. A commander acts inside these and nowhere else. */
  readonly missions: readonly string[];
};

/** One country moved from one command's map to another, and why. */
export type UcpAmendment = {
  readonly nation: NationId;
  readonly from: CombatantCommandId;
  readonly to: CombatantCommandId;
  readonly day: number;
  readonly date: GameDate;
  readonly rationale: string;
};

export type UnifiedCommandState = {
  readonly commands: Readonly<Record<CombatantCommandId, CommandRuntime>>;
  /**
   * Only the deviations from the region default are stored, for the reason
   * trade edges are derived: a sixty-one row table nobody authored would be a
   * sixty-one row invention, and the default is a real reading of the plan.
   */
  readonly aorOverrides: Readonly<Record<string, CombatantCommandId>>;
  readonly amendments: readonly UcpAmendment[];
};

const BY_ID: ReadonlyMap<CombatantCommandId, CombatantCommandDef> = new Map(
  COMBATANT_COMMANDS.map((def) => [def.id, def]),
);

export function commandDef(id: CombatantCommandId): CombatantCommandDef | undefined {
  return BY_ID.get(id);
}

export const GEOGRAPHIC_COMMANDS: readonly CombatantCommandDef[] = COMBATANT_COMMANDS.filter(
  (def) => def.type === "geographic",
);
export const FUNCTIONAL_COMMANDS: readonly CombatantCommandDef[] = COMBATANT_COMMANDS.filter(
  (def) => def.type === "functional",
);

// --- The map ---------------------------------------------------------------

/**
 * Which command owns a country, before any amendment this administration made.
 *
 * Region first, then the named exceptions, because the exceptions are the
 * interesting part: Israel and Turkey and Egypt do not sit where their
 * neighborhood does, and each of those is a decision somebody took rather than
 * a line a map drew.
 */
export function defaultCommandFor(campaign: Campaign, nation: NationId): CombatantCommandId | undefined {
  const exception = AOR_EXCEPTIONS[nation as string];
  if (exception) return exception;
  const record = selectNation(campaign, nation);
  if (!record) return undefined;
  return DEFAULT_AOR_BY_REGION[record.base.geo.region as string];
}

/** Which command owns a country now, amendments included. */
export function commandFor(campaign: Campaign, nation: NationId): CombatantCommandId | undefined {
  return campaign.security.unifiedCommand.aorOverrides[nation as string] ?? defaultCommandFor(campaign, nation);
}

/** Every country on one command's map. */
export function nationsInAor(campaign: Campaign, id: CombatantCommandId): readonly NationId[] {
  return (Object.keys(campaign.nations) as unknown as readonly NationId[])
    .filter((nation) => commandFor(campaign, nation) === id)
    .sort();
}

// --- Assignment ------------------------------------------------------------

/**
 * Formations of a service this command may actually employ.
 *
 * Derived from the national bench rather than stored beside it: two ledgers of
 * the same divisions would disagree the first time a unit was committed, and
 * the one that mattered would be whichever the gate happened to read.
 */
export function assignedFormations(
  campaign: Campaign,
  id: CombatantCommandId,
  branch: MilitaryBranch,
): number | undefined {
  const runtime = campaign.security.unifiedCommand.commands[id];
  if (!runtime) return undefined;
  const bench = availableUnits(campaign, campaign.founding.nation, branch);
  if (bench === undefined) return undefined;
  return Math.floor(bench * runtime.assignment[branch]);
}

/** What share of each service is assigned somewhere at all. Above 1 is impossible and is checked. */
export function assignedShare(campaign: Campaign, branch: MilitaryBranch): number {
  return round3(
    Object.values(campaign.security.unifiedCommand.commands).reduce(
      (total, runtime) => total + runtime.assignment[branch],
      0,
    ),
  );
}

// --- The chain -------------------------------------------------------------

export type ChainLink = "president" | "secretary" | "commander";

export type CommandAuthority = {
  readonly command?: CombatantCommandDef;
  /** Every link that is not what it should be, in the order the order would travel. */
  readonly breaks: readonly { readonly link: ChainLink; readonly reason: string }[];
  /**
   * How well an execute order would actually be carried out in this theater,
   * 0..1. Never zero: a broken chain degrades execution, it does not make the
   * armed forces stop existing.
   */
  readonly execution: number;
};

const SECRETARY_VACANT_DRAG = 0.3;
const SECRETARY_ACTING_DRAG = 0.12;
const COMMANDER_ACTING_DRAG = 0.15;
const RELIEF_DRAG_EACH = 0.05;
const RELIEF_DRAG_CEILING = 0.2;

/**
 * Whether an order can travel from this desk to that theater, and what it
 * loses on the way.
 *
 * The Secretary of Defense is a link, not a formality. An empty seat at the
 * Pentagon is the single most expensive thing on this list because the statute
 * puts the Secretary between the President and every commander in the world,
 * and an acting secretary can sign what a confirmed one can while carrying
 * none of the standing.
 */
export function commandAuthority(campaign: Campaign, nation: NationId): CommandAuthority {
  const id = commandFor(campaign, nation);
  if (id && commandDef(id)) return commandChain(campaign, id);
  const secretary = secretaryLink(campaign);
  return {
    breaks: [...secretary.breaks, { link: "commander", reason: "No combatant command holds that country on its map." }],
    execution: clamp01(round3(secretary.execution - 0.2)),
  };
}

/**
 * The same chain, read for a command rather than for a country on its map.
 *
 * The question a theater board asks, and the only form a functional command can
 * be asked in: Cyber Command and Transportation Command hold no map, so there is
 * no country whose chain would reach them.
 */
export function commandChain(campaign: Campaign, id: CombatantCommandId): CommandAuthority {
  const secretary = secretaryLink(campaign);
  const breaks = [...secretary.breaks];
  let execution = secretary.execution;
  const def = commandDef(id);
  if (!def) {
    breaks.push({ link: "commander", reason: "No such combatant command." });
    return { breaks, execution: clamp01(round3(execution - 0.2)) };
  }

  const runtime = campaign.security.unifiedCommand.commands[id];
  if (!runtime?.commander) {
    breaks.push({ link: "commander", reason: `${def.abbr} has no commander.` });
    execution -= SECRETARY_VACANT_DRAG;
  } else if (runtime.commander.acting) {
    breaks.push({ link: "commander", reason: `${def.abbr} is led by an acting commander.` });
    execution -= COMMANDER_ACTING_DRAG;
  }

  if (runtime) {
    execution -= Math.min(RELIEF_DRAG_CEILING, runtime.reliefs * RELIEF_DRAG_EACH);
  }

  return { command: def, breaks, execution: clamp01(round3(execution)) };
}

function secretaryLink(campaign: Campaign): { readonly breaks: CommandAuthority["breaks"]; readonly execution: number } {
  const dod = campaign.institutions["INST-DOD"];
  if (dod && !dod.vacancy) return { breaks: [], execution: 1 };
  if (dod?.actingLeader) {
    return {
      breaks: [{ link: "secretary", reason: "An acting Secretary of Defense signs the order." }],
      execution: 1 - SECRETARY_ACTING_DRAG,
    };
  }
  return {
    breaks: [{ link: "secretary", reason: "There is no confirmed Secretary of Defense to pass the order." }],
    execution: 1 - SECRETARY_VACANT_DRAG,
  };
}

// --- Founding --------------------------------------------------------------

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Every command at inauguration, led.
 *
 * The asymmetry with the civilian side is the point and it is real: political
 * appointees leave with the administration that appointed them, and a four-star
 * does not. A new president is sworn in over a Pentagon with empty offices and
 * eleven theaters that all have a commander already, confirmed under the last
 * president, whose relief would be this president's decision rather than an
 * inherited vacancy.
 */
export function foundingUnifiedCommand(): UnifiedCommandState {
  const commands: Record<CombatantCommandId, CommandRuntime> = {} as Record<CombatantCommandId, CommandRuntime>;
  for (const def of COMBATANT_COMMANDS) {
    commands[def.id] = {
      id: def.id,
      commander: {
        name: def.incumbent.name,
        service: def.incumbent.service,
        permanentGrade: def.incumbent.permanentGrade,
        confirmedDay: -def.incumbent.tenureDays,
      },
      assignment: def.foundingAssignment,
      posture: "routine",
      reliefs: 0,
      missions: def.standingMissions,
    };
  }
  return { commands, aorOverrides: {}, amendments: [] };
}

// --- Acts ------------------------------------------------------------------

export type CommandResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

/**
 * Relieve a combatant commander.
 *
 * Not a firing, and the difference is the whole reason this is its own act. A
 * civilian who is dismissed leaves; a relieved officer reverts to a permanent
 * grade and stays in the service, the deputy takes the command that afternoon,
 * and what the building reads is whether the relief was about the officer or
 * about the president. So the seat is never empty — it is worse than that, it
 * is filled by someone who knows they are temporary — and the residue lands on
 * the institution rather than on a vacancy counter.
 */
export function relieveCommander(campaign: Campaign, id: CombatantCommandId, rationale: string): CommandResult {
  const def = commandDef(id);
  if (!def) return { ok: false, reason: "No such combatant command." };
  const runtime = campaign.security.unifiedCommand.commands[id];
  if (!runtime?.commander) return { ok: false, reason: `${def.abbr} has no commander to relieve.` };
  if (runtime.commander.acting) {
    return { ok: false, reason: `${def.abbr} is already under an acting commander awaiting confirmation.` };
  }
  if (!rationale.trim()) return { ok: false, reason: "A relief has to be given a reason." };

  const day = campaignDay(campaign);
  const outgoing = runtime.commander;
  const deputy: CommandOfficer = {
    name: def.deputy.name,
    service: def.deputy.service,
    permanentGrade: def.deputy.permanentGrade,
    confirmedDay: day,
    acting: true,
  };

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [id, "INST-DOD", "INST-JCS"],
        systems: ["combatant-commands"],
      },
      narration: {
        summary: `${outgoing.name} is relieved of ${def.name}; ${deputy.name} takes acting command.`,
      },
      effects: [
        {
          kind: "command",
          relieve: { id, deputy, day, rationale, outgoing: outgoing.name },
        },
        {
          kind: "feed",
          items: [
            {
              turn: campaign.turn,
              kind: "press",
              visibility: "public",
              headline: `The President relieves the commander of ${def.abbr}.`,
              facts: { subject: outgoing.name },
            },
          ],
        },
      ],
    },
  };
}

/**
 * Move forces between commands.
 *
 * Refused outright with no Secretary of Defense, and that refusal is the
 * statute rather than a difficulty setting: assignment runs through the
 * Secretary under procedures the President approved, so an empty Pentagon is
 * a president who can order a war and cannot move a division to it.
 */
export function reassignForces(
  campaign: Campaign,
  from: CombatantCommandId,
  to: CombatantCommandId,
  branch: MilitaryBranch,
  share: number,
): CommandResult {
  const fromDef = commandDef(from);
  const toDef = commandDef(to);
  if (!fromDef || !toDef) return { ok: false, reason: "No such combatant command." };
  if (from === to) return { ok: false, reason: "That is the same command." };
  if (!(share > 0)) return { ok: false, reason: "A reassignment has to move something." };

  const dod = campaign.institutions["INST-DOD"];
  if (!dod || (dod.vacancy && !dod.actingLeader)) {
    return {
      ok: false,
      reason: "Forces are assigned by the Secretary of Defense. That office is empty.",
    };
  }

  const source = campaign.security.unifiedCommand.commands[from];
  const target = campaign.security.unifiedCommand.commands[to];
  if (!source || !target) return { ok: false, reason: "That command is not standing." };
  const moved = Math.min(share, source.assignment[branch]);
  if (moved <= 0) {
    return { ok: false, reason: `${fromDef.abbr} has no ${branch} forces assigned to give up.` };
  }

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [from, to, "INST-DOD"],
        systems: ["combatant-commands"],
      },
      narration: {
        summary: `${describeShare(moved)} of the ${branch} force is reassigned from ${fromDef.abbr} to ${toDef.abbr}.`,
      },
      effects: [{ kind: "command", reassign: { from, to, branch, share: round3(moved) } }],
    },
  };
}

/**
 * Move a country from one command's map to another.
 *
 * The Unified Command Plan is a document the Chairman prepares and the
 * President approves, so this is an act with a date and a rationale rather than
 * a setting. It is also the only way the map in this game ever changes, which
 * is the honest shape: nothing about geography moved when Israel changed hands.
 */
export function amendUnifiedCommandPlan(
  campaign: Campaign,
  nation: NationId,
  to: CombatantCommandId,
  rationale: string,
): CommandResult {
  const toDef = commandDef(to);
  if (!toDef) return { ok: false, reason: "No such combatant command." };
  if (toDef.type !== "geographic") {
    return { ok: false, reason: `${toDef.abbr} is a functional command and holds no map.` };
  }
  const record = selectNation(campaign, nation);
  if (!record) return { ok: false, reason: "No such nation." };
  if (nation === campaign.founding.nation) {
    return { ok: false, reason: "The homeland's own defense is not moved between theaters." };
  }
  const from = commandFor(campaign, nation);
  if (!from) return { ok: false, reason: "That country sits on no command's map." };
  if (from === to) return { ok: false, reason: `${record.base.identity.name} is already ${toDef.abbr}'s.` };
  if (!rationale.trim()) return { ok: false, reason: "An amendment has to be given a reason." };

  const amendment: UcpAmendment = {
    nation,
    from,
    to,
    day: campaignDay(campaign),
    date: campaign.calendar,
    rationale,
  };

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [nation as string, from, to, "INST-JCS"],
        systems: ["combatant-commands"],
      },
      narration: {
        summary: `${record.base.identity.name} moves from ${commandDef(from)?.abbr ?? from} to ${toDef.abbr} under an amended Unified Command Plan.`,
      },
      effects: [{ kind: "command", amend: amendment }],
    },
  };
}

// --- Engagement: posture follows war -----------------------------------------

/**
 * Why a theater stands engaged: governments in its area the country is fighting,
 * as a principal or beside one, has forces introduced against, or holds forces
 * committed toward. A strike opens no war, so a reading resting on wars alone
 * would leave the theater of an air campaign standing at routine.
 */
export type CommandEngagement = { readonly against: readonly NationId[]; readonly toward: readonly NationId[] };

function enemiesAtWar(campaign: Campaign): readonly NationId[] {
  const us = campaign.founding.nation;
  return conflictsAsParty(campaign, us).flatMap((conflict) => {
    const theirs: ConflictSide = sideOf(conflict, us) === "aggressor" ? "defender" : "aggressor";
    return [conflict[theirs], ...conflict.joined[theirs]];
  });
}

function forcesCommittedToward(campaign: Campaign): readonly NationId[] {
  const us = campaign.founding.nation;
  return Object.values(campaign.commitments)
    .filter((commitment) => commitment.actor === us && commitment.status === "active" && commitment.source.kind === "orderOfBattle" && commitment.target.kind === "nation")
    .map((commitment) => commitment.target.id as NationId);
}

export function commandEngagement(campaign: Campaign, id: CombatantCommandId): CommandEngagement | undefined {
  const inArea = (nation: NationId) => commandFor(campaign, nation) === id;
  const introduced = selectObligations(campaign)
    .filter((obligation) => !obligation.terminated)
    .map((obligation) => obligation.target);
  const against = [...new Set([...enemiesAtWar(campaign), ...introduced])].filter(inArea).sort();
  const toward = [...new Set(forcesCommittedToward(campaign))].filter((nation) => inArea(nation) && !against.includes(nation)).sort();
  return against.length + toward.length > 0 ? { against, toward } : undefined;
}

/**
 * What a theater actually stands at: the President's order, and never below
 * heightened while the theater is engaged. An order back to routine is kept,
 * and takes effect the week the engagement ends.
 */
export function effectivePosture(campaign: Campaign, id: CombatantCommandId): CommandPosture {
  const ordered = campaign.security.unifiedCommand.commands[id]?.posture ?? "routine";
  return ordered === "routine" && commandEngagement(campaign, id) ? "heightened" : ordered;
}

/**
 * Raise or lower what a theater is standing at.
 *
 * A posture is a bill, not a mood: a surged theater burns readiness every week
 * it stays surged, which is why leaving one at surge because a crisis might
 * come back is a decision with a price rather than free insurance.
 */
export function setCommandPosture(
  campaign: Campaign,
  id: CombatantCommandId,
  posture: CommandPosture,
): CommandResult {
  const def = commandDef(id);
  if (!def) return { ok: false, reason: "No such combatant command." };
  const runtime = campaign.security.unifiedCommand.commands[id];
  if (!runtime) return { ok: false, reason: "That command is not standing." };
  if (runtime.posture === posture) {
    const held = posture === "routine" && commandEngagement(campaign, id) !== undefined;
    return {
      ok: false,
      reason: held ? `${def.abbr} is ordered to routine, and stands at heightened until the engagement ends.` : `${def.abbr} is already at ${posture}.`,
    };
  }

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [id, "INST-DOD"],
        systems: ["combatant-commands"],
      },
      narration: {
        summary: `${def.abbr} goes to ${posture}.`,
      },
      effects: [{ kind: "command", posture: { id, posture } }],
    },
  };
}

function describeShare(share: number): string {
  return `${Math.round(share * 100)} percent`;
}

// --- The weekly tick -------------------------------------------------------

// What a posture costs the national bench every week it is held. Routine is
// free because routine is what the readiness recovery rate is written against.
export const POSTURE_READINESS_COST: Readonly<Record<CommandPosture, number>> = {
  routine: 0,
  heightened: 0.004,
  surge: 0.012,
};

/**
 * How much of a war week's pressure a theater's posture takes off the
 * American side: nothing at routine, a twentieth at heightened, a tenth at
 * surge. Bounded on purpose. A posture is readiness spent in advance, and it
 * buys a margin in the fighting, not the outcome; the surge keeps its own
 * readiness bill above.
 */
export const POSTURE_PRESSURE_RELIEF: Readonly<Record<CommandPosture, number>> = {
  routine: 0,
  heightened: 0.05,
  surge: 0.1,
};

/** The share of a war week's pressure the American side still carries in this theater, from 1 down to 0.9. */
export function posturePressureFactor(campaign: Campaign, theater: NationId): number {
  const command = commandFor(campaign, theater);
  return command ? 1 - POSTURE_PRESSURE_RELIEF[effectivePosture(campaign, command)] : 1;
}

// How long a theater runs under a deputy before the Senate has had time to act
// on a successor. Deliberately long: a four-star confirmation is not a
// formality, and a president who relieves two commanders in a season is running
// two theaters on acting authority at once.
export const SUCCESSOR_CONFIRMATION_DAYS = 84;

/**
 * The commands' own week: postures draw on readiness, an engaged theater at
 * least at heightened, and acting commanders are confirmed once the Senate has
 * had the time it takes.
 */
export const commandPhase: TurnPhase = (state: Campaign) => {
  const confirmations: CombatantCommandId[] = [];
  let readinessCost = 0;
  const day = campaignDay(state);

  for (const def of COMBATANT_COMMANDS) {
    const runtime = state.security.unifiedCommand.commands[def.id];
    if (!runtime) continue;
    readinessCost += POSTURE_READINESS_COST[effectivePosture(state, def.id)];
    if (runtime.commander?.acting && day - runtime.commander.confirmedDay >= SUCCESSOR_CONFIRMATION_DAYS) {
      confirmations.push(def.id);
    }
  }

  if (confirmations.length === 0 && readinessCost === 0) return [];

  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      provenance: { origin: "institution", systems: ["combatant-commands"] },
      narration: {
        summary:
          confirmations.length > 0
            ? `The Senate confirms ${confirmations.length} combatant ${confirmations.length === 1 ? "commander" : "commanders"}.`
            : "The theaters hold their posture for another week.",
      },
      effects: [
        ...(confirmations.length > 0
          ? [{ kind: "command" as const, confirmActing: { ids: confirmations, day } }]
          : []),
        ...(readinessCost > 0
          ? [{ kind: "metric" as const, deltas: { militaryReadiness: -round3(readinessCost) } }]
          : []),
      ],
    },
  ];
};
