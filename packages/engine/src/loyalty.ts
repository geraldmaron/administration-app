import type { PersonId, RoleId } from "@admin/world";
import type { Effect, EffectPacket } from "./effects.js";
import { selectCabinet, selectPerson, type Campaign, type PersonRuntime } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { crossesTheAisle, ideologyCloseness, usPartyOfPerson } from "./cast-fit.js";
import { institutionForRole } from "./institutions.js";
import { cabinetAgendaPackets } from "./cabinet-week.js";
import { stanceOf } from "./counsel-stance.js";

export { timesOverruled } from "./counsel-stance.js";

// Why a minister's loyalty moves.
//
// It was rolled once at founding (people.ts) and never again, so a cabinet was
// a set of fixed numbers the player could read and never change. That made
// every consequence loyalty prices — the weekly leak, the resignation, the
// rival faction — a property of the deal at founding rather than of how this
// president has governed since. The dossier could print "62%" and the honest
// caption was "62%, and it will be 62% in four years."
//
// The rule is deliberately narrow: loyalty answers to *being listened to*. The
// room argues with every reply the player weighs (counsel.ts), the record
// already keeps the stance each chair took and whether the player went the
// other way (counsel-record.ts), and that is the one relationship between a
// president and a Secretary the game already models in full. Nothing here
// invents a second opinion or a mood.
//
// It reads the turn just resolved and only that turn, so a commitment cannot
// be scored twice — the same reason the phase is composed from the ledger
// rather than from a running tally nothing else can check.

/**
 * What one call is worth.
 *
 * Overruling costs more than heeding pays, and deliberately: a chair notices
 * being ignored more than being agreed with, and a president who takes every
 * piece of advice they are given should not be able to farm a cabinet up to
 * total loyalty by never deciding anything themselves. Sized so a run of four
 * overrulings — the case worth showing a player — moves loyalty by a visible
 * eight points rather than by a rounding error.
 */
export const OVERRULED_COST = -0.02;
export const HEEDED_GAIN = 0.008;


/**
 * The signed move a single week's calls are worth to one chair.
 *
 * Read off the ledger's own counsel stamps rather than through the commitment
 * reader: a position reply carries no instrument and is still a decision the
 * room argued about, and it is the overwhelming majority of what a player
 * actually answers. Scoring only committed action would have made this rule
 * fire on roughly one reply in ten.
 */
export function loyaltyShiftFor(campaign: Campaign, role: RoleId, turn: number): number {
  return campaign.ledger.reduce((shift, entry) => {
    if (entry.turn !== turn || entry.actor !== "player") return shift;
    const counsel = entry.counsel;
    // Only a stance the record actually kept. A reconstructed stance is a guess
    // at what a minister would have said, which is not a thing they can hold
    // against the president.
    if (!counsel) return shift;
    const stance = stanceOf(counsel, role);
    if (stance === "against") return shift + OVERRULED_COST;
    if (stance === "for") return shift + HEEDED_GAIN;
    // A hedge is not a position, so it cannot be a position that was
    // overruled — the same rule the record scores contested calls by.
    return shift;
  }, 0);
}


/**
 * The turn phase: what the week's decisions did to the room's regard for the
 * president.
 *
 * A minister who is not seated has no counsel to be overruled on, and the
 * player's own chair cannot resent itself.
 */
export const cabinetLoyaltyPhase: TurnPhase = (state: Campaign) => {
  const cabinet = selectCabinet(state);
  const packets: EffectPacket[] = [];
  const politics: Effect[] = [];

  for (const role of Object.keys(cabinet) as RoleId[]) {
    if (role === state.founding.leadRole) continue;
    const holder = selectPerson(state, cabinet[role] as PersonId);
    if (!holder || !holder.alive) continue;

    const drift = politicalShiftFor(state, holder);
    if (drift !== 0) politics.push({ kind: "person", person: holder.base.id, changes: {}, loyaltyShift: drift });
    const fall = competenceDecayFor(state, role, holder);
    if (fall !== 0) politics.push({ kind: "person", person: holder.base.id, changes: {}, competenceShift: fall });

    const shift = loyaltyShiftFor(state, role, state.turn);
    if (shift === 0) continue;

    const effects: Effect[] = [{ kind: "person", person: holder.base.id, changes: {}, loyaltyShift: shift }];
    packets.push({
      source: "simulate",
      actor: "world",
      turn: state.turn + 1,
      narration: {
        summary:
          shift < 0
            ? `${holder.base.name} was overruled this week, and it shows.`
            : `${holder.base.name} was listened to this week, and noticed.`,
      },
      effects,
    });
  }

  // One packet for the room's politics, not one per chair: a slow drift is a
  // fact about the week, and fifteen ledger lines saying so would bury it.
  if (politics.length > 0) {
    packets.push({
      source: "simulate",
      actor: "world",
      turn: state.turn + 1,
      provenance: { origin: "world", systems: ["cabinet", "loyalty"] },
      narration: { summary: "The cabinet's politics and its departments wear on it." },
      effects: politics,
    });
  }

  // What the Secretaries put to the President is decided on the same day of the
  // week as their regard moves, and read against the same state.
  return [...packets, ...cabinetAgendaPackets(state)];
};

// --- Politics ------------------------------------------------------------------
//
// Loyalty also answers to politics: a Secretary from across the aisle, one
// whose politics sit far from the President's, and an ambitious one watching the
// President's numbers fall each lose a little regard every week. Bounded: the
// drift stops ten points under where they stood when they were seated, so
// politics can sour a chair but only being overruled can break one.

/** How far politics alone can take a Secretary's loyalty below where it stood when they were seated. */
export const POLITICAL_FLOOR = 0.1;
const CROSSING_WEEKLY = -0.002;
const DISTANCE_WEEKLY = -0.004;
const DISTANCE_TOLERANCE = 0.25;
const SLUMP_WEEKLY = -0.003;
const SLUMP_APPROVAL = 0.4;
const SLUMP_AMBITION = 0.65;

const round4 = (value: number) => Math.round(value * 10000) / 10000 + 0;

/** The week's political drift in one Secretary's loyalty, never below the floor it is bounded by. */
export function politicalShiftFor(campaign: Campaign, holder: PersonRuntime): number {
  const person = holder.base;
  const president = { party: campaign.founding.leader.party, ideology: campaign.founding.leader.ideology };
  // An Independent has no side for a Secretary to have crossed from: their
  // cabinet is drawn from both parties by construction, and a Republican
  // serving one is not a turncoat.
  const partisan = president.party !== "independent";
  const crossing = partisan && usPartyOfPerson(person) !== undefined && crossesTheAisle(person, president) ? CROSSING_WEEKLY : 0;
  const distance = 1 - ideologyCloseness(person.ideology, president.ideology);
  const far = (DISTANCE_WEEKLY * Math.max(0, distance - DISTANCE_TOLERANCE)) / (1 - DISTANCE_TOLERANCE);
  const approval = campaign.player.metrics.approval;
  const slump =
    person.ambition >= SLUMP_AMBITION && approval < SLUMP_APPROVAL ? (SLUMP_WEEKLY * (SLUMP_APPROVAL - approval)) / SLUMP_APPROVAL : 0;
  const floor = (holder.loyaltyAtAppointment ?? person.loyalty) - POLITICAL_FLOOR;
  return round4(Math.max(crossing + far + slump, Math.min(0, floor - person.loyalty)));
}

// --- Competence ---------------------------------------------------------------
//
// Competence falls too. A Secretary running a department that is not carrying
// its work week after week is losing the grip on it the dossier credits them
// with, and nothing else in the game ever marked a Secretary down.

/** Delivery under this is a department beating the person running it. */
const OVERWHELMED_QUALITY = 0.6;
const COMPETENCE_DECAY_WEEKLY = -0.004;
/** Nobody seated in a chair forgets everything they knew. */
export const COMPETENCE_DECAY_FLOOR = 0.3;

/** The week's fall in a Secretary's competence, zero unless their department is underwater. */
export function competenceDecayFor(campaign: Campaign, role: RoleId, holder: PersonRuntime): number {
  const def = institutionForRole(role);
  const quality = def ? campaign.institutions[def.id]?.implementationQuality : undefined;
  if (quality === undefined || quality >= OVERWHELMED_QUALITY) return 0;
  const depth = (OVERWHELMED_QUALITY - quality) / OVERWHELMED_QUALITY;
  const fall = COMPETENCE_DECAY_WEEKLY * (0.5 + depth);
  return round4(Math.max(fall, Math.min(0, COMPETENCE_DECAY_FLOOR - holder.base.competence)));
}

/**
 * How far a seat's holder has moved from where they started, in points.
 *
 * Composed rather than stored, and absent where there is nothing to say: a
 * minister seated this week has no trend, and drawing one would be inventing a
 * history for someone who has none.
 */
export type LoyaltyTrend = {
  readonly person: PersonId;
  readonly now: number;
  readonly atAppointment: number;
  /** Signed, in whole points of loyalty — what a dossier prints. */
  readonly movedPoints: number;
};

export function selectLoyaltyTrend(campaign: Campaign, person: PersonId): LoyaltyTrend | undefined {
  const runtime = selectPerson(campaign, person);
  if (!runtime || runtime.loyaltyAtAppointment === undefined) return undefined;
  const moved = Math.round((runtime.base.loyalty - runtime.loyaltyAtAppointment) * 100);
  if (moved === 0) return undefined;
  return {
    person,
    now: runtime.base.loyalty,
    atAppointment: runtime.loyaltyAtAppointment,
    movedPoints: moved,
  };
}
