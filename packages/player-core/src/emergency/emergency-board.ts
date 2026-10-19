import {
  EMERGENCY_NOTICE_TURNS,
  EMERGENCY_RENEWAL_TURNS,
  hazardLabel,
  emergencyCauseLabel,
  liveCauses,
  renewalIsOpen,
  selectDateOfTurn,
  selectDeclaredEmergencies,
  underDeclaredEmergency,
  weeklyStandingCost,
  weeksToLapse,
  type Campaign,
  type DeclaredEmergency,
  type EmergencyScope,
  type GameDate,
} from "@admin/engine";
import { STATE_IDS, stateById, type StateId } from "@admin/world";
import { WILLINGNESS_WORDS } from "../act/preview";
import { guardRequestCandidates } from "../desk/attention-requests";
import { conditionReadings, type ConditionReading } from "../world/board-state";

// The emergency board: every declaration in force with its renewal window and
// what it costs this week, every condition running at home and whether it
// could carry a declaration, the incidents, and the states a Guard
// federalization could be asked of. The acts and their comparisons are
// `emergency-choices.ts`.

/** Where a declaration reaches, in words. */
export function scopeWords(scope: EmergencyScope): string {
  return scope.kind === "nation" ? "The whole country" : (stateById.get(scope.state)?.name ?? (scope.state as string));
}

/** The camera key for a scope. */
export function scopeCamera(scope: EmergencyScope): string {
  return scope.kind === "nation" ? "us" : `state:${scope.state as string}`;
}

export type DeclarationRow = {
  readonly id: string;
  readonly scope: EmergencyScope;
  readonly where: string;
  readonly cause: DeclaredEmergency["cause"];
  readonly causeLabel: string;
  readonly declared: GameDate;
  readonly weeksStanding: number;
  /** Weeks left before it lapses unrenewed. */
  readonly weeksToLapse: number;
  readonly lapses: GameDate;
  /** Whether the continuation notice can be published this week. */
  readonly renewalOpen: boolean;
  /** Weeks until the notice window opens; zero once it has. */
  readonly renewalOpensIn: number;
  /** Standing it charges this week, as a positive fraction. */
  readonly weeklyCost: number;
  /** Whether a live condition is still running where it reaches. */
  readonly causeRunning: boolean;
  readonly camera: string;
};

function declarationRow(campaign: Campaign, emergency: DeclaredEmergency): DeclarationRow {
  const left = weeksToLapse(emergency, campaign.turn);
  return {
    id: emergency.id,
    scope: emergency.scope,
    where: scopeWords(emergency.scope),
    cause: emergency.cause,
    causeLabel: emergencyCauseLabel(emergency.cause),
    declared: selectDateOfTurn(campaign, emergency.declaredTurn),
    weeksStanding: Math.max(0, campaign.turn - emergency.declaredTurn),
    weeksToLapse: left,
    lapses: selectDateOfTurn(campaign, emergency.renewedTurn + EMERGENCY_RENEWAL_TURNS),
    renewalOpen: renewalIsOpen(emergency, campaign.turn),
    renewalOpensIn: Math.max(0, left - EMERGENCY_NOTICE_TURNS),
    weeklyCost: weeklyStandingCost(emergency, campaign.turn),
    causeRunning: emergency.cause === "armed-conflict"
      ? Object.values(campaign.conflicts).some((conflict) => conflict.id === emergency.armedForcesConflictId && conflict.status === "active")
      : liveCauses(campaign, emergency.scope).some((condition) => condition.kind === emergency.cause),
    camera: scopeCamera(emergency.scope),
  };
}

/** Every declaration in force, the one closest to lapsing first. */
export function declarationRows(campaign: Campaign): readonly DeclarationRow[] {
  return selectDeclaredEmergencies(campaign)
    .map((emergency) => declarationRow(campaign, emergency))
    .sort((a, b) => a.weeksToLapse - b.weeksToLapse || a.id.localeCompare(b.id));
}

/** A scope a declaration over this condition could honestly take this week. */
export type DeclarableScope = { readonly scope: EmergencyScope; readonly where: string };

export type ConditionBoardRow = ConditionReading & {
  /** The scopes a declaration over it could take now; empty when none can. */
  readonly declarable: readonly DeclarableScope[];
  /** A declaration already reaches where it runs. */
  readonly covered: boolean;
  readonly camera: string;
};

function scopesFor(campaign: Campaign, reading: ConditionReading): readonly DeclarableScope[] {
  const candidates: EmergencyScope[] = [...(reading.state ? [{ kind: "state" as const, state: reading.state }] : []), { kind: "nation" as const }];
  return candidates.flatMap((scope) => {
    const live = liveCauses(campaign, scope).some((condition) => condition.id === reading.id);
    const held = underDeclaredEmergency(campaign, scope.kind === "state" ? scope.state : undefined);
    return live && !held ? [{ scope, where: scopeWords(scope) }] : [];
  });
}

function boardRow(campaign: Campaign, reading: ConditionReading): ConditionBoardRow {
  return {
    ...reading,
    declarable: scopesFor(campaign, reading),
    covered: underDeclaredEmergency(campaign, reading.state),
    camera: reading.state ? `state:${reading.state as string}` : "us",
  };
}

export type GuardRow = {
  readonly state: StateId;
  readonly stateName: string;
  readonly conditionLabel: string;
  readonly forecast: string;
};

export type EmergencyBoard = {
  readonly declarations: readonly DeclarationRow[];
  /** Conditions the country is living through, worst first. */
  readonly conditions: readonly ConditionBoardRow[];
  /** One-afternoon events: dated, and never declarable once over. */
  readonly incidents: readonly ConditionBoardRow[];
  readonly guard: readonly GuardRow[];
  /** Standing every declaration charges this week, summed. */
  readonly weeklyCost: number;
};

export function emergencyBoard(campaign: Campaign): EmergencyBoard {
  const rows = conditionReadings(campaign).map((reading) => boardRow(campaign, reading));
  const declarations = declarationRows(campaign);
  return {
    declarations,
    conditions: rows.filter((row) => !row.incident),
    incidents: rows.filter((row) => row.incident),
    guard: guardRequestCandidates(campaign).map((candidate) => ({
      state: candidate.state,
      stateName: candidate.stateName,
      conditionLabel: hazardLabel(candidate.condition.kind),
      forecast: WILLINGNESS_WORDS[candidate.forecast.forecast],
    })),
    weeklyCost: declarations.reduce((sum, row) => sum + row.weeklyCost, 0),
  };
}

/** One state as the conditions lens reads it. */
export type StateConditionReading = {
  readonly state: StateId;
  /** The worst condition running there, 0..1; zero where nothing is. */
  readonly severity: number;
  readonly labels: readonly string[];
  readonly declared: boolean;
};

/**
 * Conditions by state, for the map: each state's worst running condition and
 * whether a declaration reaches it. A condition across the whole country is
 * felt in every state, so it counts everywhere.
 */
export function stateConditions(campaign: Campaign): ReadonlyMap<StateId, StateConditionReading> {
  const running = conditionReadings(campaign);
  return new Map(
    STATE_IDS.map((state) => {
      const here = running.filter((reading) => reading.state === state || reading.state === undefined);
      return [
        state,
        {
          state,
          severity: here.reduce((worst, reading) => Math.max(worst, reading.severity.fraction), 0),
          labels: here.map((reading) => reading.headline),
          declared: underDeclaredEmergency(campaign, state),
        },
      ] as const;
    }),
  );
}
