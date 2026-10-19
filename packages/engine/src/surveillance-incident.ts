import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import { createRngStreams } from "./rng.js";

/** An agency act, not a refused presidential tasking. The IG later exposes this log to its target. */
export type SurveillanceIncident = {
  readonly id: string;
  readonly actor: "IC-NSA";
  readonly target: "known-us-person-in-united-states";
  readonly acquired: "private-domestic-message-content";
  readonly location: "united-states";
  readonly intentional: true;
  readonly consent: false;
  readonly fisaOrder: false;
  readonly statutoryException: false;
  readonly interceptTurn: number;
  readonly interceptDay: number;
  readonly auditLog: string;
  readonly exposedTurn?: number;
  readonly status: "recorded" | "exposed" | "damages-ordered" | "complied";
  readonly damages?: number;
  readonly compliedTurn?: number;
};

/** Produce a particular unauthorized collection act; a failed player tasking never enters this path. */
export function surveillancePackets(state: Campaign, day: number): readonly EffectPacket[] {
  const nsa = state.institutions["INST-NSA"];
  const defense = state.institutions["INST-DOD"];
  if (!nsa || !defense || nsa.integrity >= 0.45 || state.security.intelligence.surveillanceIncident
    || createRngStreams(state.seed).stream("nsa-internal-intercept", state.turn).next() >= 0.06) return [];
  const incident: SurveillanceIncident = {
    id: `intercept:nsa:${state.turn}`, actor: "IC-NSA", target: "known-us-person-in-united-states",
    acquired: "private-domestic-message-content", location: "united-states", intentional: true,
    consent: false, fisaOrder: false, statutoryException: false,
    interceptTurn: state.turn, interceptDay: day,
    auditLog: `NSA collection log intercept:nsa:${state.turn}: an analyst intentionally targeted a known U.S. person in the United States and acquired private message content in the United States without consent, a FISA order, or another statutory exception.`,
    status: "recorded",
  };
  return [{ source: "simulate", actor: "world", turn: state.turn,
    provenance: { origin: "institution", confidence: "observed", systems: ["intelligence"], visibility: "internal" },
    narration: { summary: "An internal NSA collection log records unauthorized domestic interception." },
    effects: [{ kind: "intelligence", surveillanceIncident: incident },
      { kind: "institution", institution: "INST-DOD",
        changes: { oversightPressure: Math.min(1, Math.round((defense.oversightPressure + 0.85) * 1000) / 1000) } }] }];
}

/** Deletion is an agency compliance response after damages, not relief ordered by §1810. */
export function surveillanceCompliancePackets(state: Campaign): readonly EffectPacket[] {
  const incident = state.security.intelligence.surveillanceIncident;
  if (incident?.status !== "damages-ordered") return [];
  return [{ source: "simulate", actor: "world", turn: state.turn,
    provenance: { origin: "institution", confidence: "observed", systems: ["intelligence"], visibility: "internal" },
    narration: { summary: "NSA compliance staff delete the intercepted message and close the unauthorized collection channel after the damages judgment." },
    effects: [{ kind: "intelligence", surveillanceIncident: { ...incident, status: "complied", compliedTurn: state.turn } }] }];
}
