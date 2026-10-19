import type { Campaign } from "./state.js";
import type { CommandOfficer, CommandPosture, CombatantCommandId, CommandRuntime, UcpAmendment } from "./combatant-commands.js";
import type { MilitaryBranch } from "@admin/world";
import type { AgReferral } from "./intel-authority.js";
import type {
  BoundaryRefusal,
  CollectionProduct,
  CollectionShare,
  CollectionTasking,
  IgReferral,
  PoliticizationRecord,
  SurveillanceIncident,
  ReferralStage,
  TaskingId,
} from "./intelligence.js";
import type { Assessment, AssessmentId, WordingChange } from "./assessments.js";
import type { CovertFinding, FindingId, UnfoundedAction } from "./findings.js";
import type { ReportObligation, ReportObligationId } from "./war-powers-report.js";
import type { ReportFiling } from "./war-powers-report.js";

// The four writers for the national security state, kept beside their domain
// the way the institution and trade writers are: effects.ts stays one dispatch
// table, and the rules for a domain live with the domain.

export type CommandEffect = {
  readonly kind: "command";
  readonly relieve?: {
    readonly id: CombatantCommandId;
    readonly deputy: CommandOfficer;
    readonly day: number;
    readonly rationale: string;
    readonly outgoing: string;
  };
  readonly reassign?: {
    readonly from: CombatantCommandId;
    readonly to: CombatantCommandId;
    readonly branch: MilitaryBranch;
    readonly share: number;
  };
  readonly amend?: UcpAmendment;
  readonly posture?: { readonly id: CombatantCommandId; readonly posture: CommandPosture };
  readonly confirmActing?: { readonly ids: readonly CombatantCommandId[]; readonly day: number };
};

export type IntelligenceEffect = {
  readonly kind: "intelligence";
  readonly tasking?: CollectionTasking;
  /** A standing requirement filing its cycle's product. */
  readonly product?: CollectionProduct;
  readonly share?: CollectionShare;
  readonly closeTasking?: { readonly id: TaskingId; readonly day: number; readonly reason?: string };
  readonly agReferral?: AgReferral;
  readonly refusal?: BoundaryRefusal;
  readonly referral?: IgReferral;
  readonly pressure?: PoliticizationRecord;
  readonly advanceReferrals?: readonly { readonly id: string; readonly stage: ReferralStage; readonly day: number }[];
  readonly surveillanceIncident?: SurveillanceIncident;
};

export type AssessmentEffect = {
  readonly kind: "assessment";
  readonly issue?: Assessment;
  readonly siteIssue?: import("./strike-assessment.js").CivilianSiteAssessment;
  readonly change?: { readonly id: AssessmentId; readonly change: WordingChange };
};

export type FindingEffect = {
  readonly kind: "finding";
  readonly sign?: CovertFinding;
  readonly notify?: { readonly id: FindingId; readonly day: number; readonly statement: string };
  readonly close?: { readonly id: FindingId; readonly day: number };
  readonly activity?: { readonly id: FindingId };
  readonly unfounded?: UnfoundedAction;
  /** An objective counsel would not paper. Recorded in the same list, because the attempt is the fact. */
  readonly refusedObjective?: UnfoundedAction;
};

export type WarPowersEffect = {
  readonly kind: "warPowers";
  readonly open?: ReportObligation;
  readonly file?: { readonly id: ReportObligationId; readonly filing: ReportFiling };
  readonly certify?: { readonly id: ReportObligationId; readonly day: number; readonly necessity: string };
  readonly miss?: { readonly ids: readonly ReportObligationId[] };
  /** The force came out. What discharges the sixty-day obligation short of a vote. */
  readonly terminate?: { readonly id: ReportObligationId; readonly day: number };
};

function withSecurity(state: Campaign, security: Campaign["security"]): Campaign {
  return { ...state, security };
}

export function applyCommand(state: Campaign, effect: CommandEffect): Campaign {
  const unified = state.security.unifiedCommand;
  const commands: Record<CombatantCommandId, CommandRuntime> = { ...unified.commands };
  let aorOverrides = unified.aorOverrides;
  let amendments = unified.amendments;

  if (effect.relieve) {
    const runtime = commands[effect.relieve.id];
    if (runtime) {
      commands[effect.relieve.id] = {
        ...runtime,
        commander: effect.relieve.deputy,
        vacantSinceDay: effect.relieve.day,
        reliefs: runtime.reliefs + 1,
        lastReliefTurn: state.turn,
      };
    }
  }

  if (effect.reassign) {
    const { from, to, branch, share } = effect.reassign;
    const source = commands[from];
    const target = commands[to];
    if (source && target) {
      commands[from] = {
        ...source,
        assignment: { ...source.assignment, [branch]: round3(Math.max(0, source.assignment[branch] - share)) },
      };
      commands[to] = {
        ...target,
        assignment: { ...target.assignment, [branch]: round3(Math.min(1, target.assignment[branch] + share)) },
      };
    }
  }

  if (effect.posture) {
    const runtime = commands[effect.posture.id];
    if (runtime) commands[effect.posture.id] = { ...runtime, posture: effect.posture.posture };
  }

  if (effect.confirmActing) {
    for (const id of effect.confirmActing.ids) {
      const runtime = commands[id];
      if (!runtime?.commander) continue;
      const { acting: _confirmed, ...officer } = runtime.commander;
      const { vacantSinceDay: _filled, ...rest } = runtime;
      commands[id] = { ...rest, commander: { ...officer, confirmedDay: effect.confirmActing.day } };
    }
  }

  if (effect.amend) {
    aorOverrides = { ...aorOverrides, [effect.amend.nation as string]: effect.amend.to };
    amendments = [...amendments, effect.amend];
  }

  return withSecurity(state, {
    ...state.security,
    unifiedCommand: { commands, aorOverrides, amendments },
  });
}

export function applyIntelligence(state: Campaign, effect: IntelligenceEffect): Campaign {
  const intelligence = state.security.intelligence;
  let taskings = intelligence.taskings;
  let products = intelligence.products;
  let archive = intelligence.archive ?? Object.values(products);
  let shares = intelligence.shares ?? [];
  let refusals = intelligence.refusals;
  let pressure = intelligence.pressure;
  let referrals = intelligence.referrals;
  let surveillanceIncident = intelligence.surveillanceIncident;
  let agReferrals = intelligence.agReferrals;

  if (effect.tasking) {
    taskings = { ...taskings, [effect.tasking.id]: effect.tasking };
  }

  if (effect.product) {
    products = { ...products, [effect.product.tasking]: effect.product };
    if (!archive.some((entry) => entry.id === effect.product!.id)) archive = [...archive, effect.product];
  }

  if (effect.share && !shares.some((entry) => entry.id === effect.share!.id)) shares = [...shares, effect.share];

  if (effect.closeTasking) {
    const existing = taskings[effect.closeTasking.id];
    if (existing) {
      taskings = { ...taskings, [existing.id]: { ...existing, closedDay: effect.closeTasking.day, ...(effect.closeTasking.reason ? { closedReason: effect.closeTasking.reason } : {}) } };
      // A requirement taken off the question stops having a current product:
      // the community is no longer collecting, so nothing should keep reading
      // last month's take as live support for a judgment.
      const { [existing.id]: _stale, ...rest } = products;
      products = rest;
    }
  }

  if (effect.refusal) refusals = [...refusals, effect.refusal];
  if (effect.pressure) pressure = [...pressure, effect.pressure];
  if (effect.referral) referrals = [...referrals, effect.referral];
  if (effect.surveillanceIncident) surveillanceIncident = effect.surveillanceIncident;
  if (effect.agReferral) agReferrals = [...(agReferrals ?? []), effect.agReferral];

  if (effect.advanceReferrals) {
    const moves = new Map(effect.advanceReferrals.map((entry) => [entry.id, entry]));
    referrals = referrals.map((referral) => {
      const move = moves.get(referral.id);
      if (!move) return referral;
      return {
        ...referral,
        stage: move.stage,
        ...(move.stage === "transmitted"
          ? { determinedDay: move.day, transmittedDay: move.day }
          : { }),
      };
    });
  }

  return withSecurity(state, {
    ...state.security,
    intelligence: { taskings, products, archive, shares, refusals, pressure, referrals,
      ...(surveillanceIncident ? { surveillanceIncident } : {}), ...(agReferrals ? { agReferrals } : {}) },
  });
}

export function applyAssessment(state: Campaign, effect: AssessmentEffect): Campaign {
  let assessments = state.security.assessments;

  if (effect.issue) assessments = [...assessments, effect.issue];

  if (effect.change) {
    const { id, change } = effect.change;
    assessments = assessments.map((assessment) =>
      assessment.id === id
        ? {
            ...assessment,
            likelihood: change.to,
            // The confidence is deliberately not touched. A judgment somebody
            // was told to write is not one the community is surer of, and a
            // handler that quietly raised it would undo the whole mechanic.
            changes: [...assessment.changes, change],
            dissents: [
              ...assessment.dissents,
              {
                element: "IC-INR" as const,
                confidence: "low" as const,
                note: "One element notes that the judgment as issued is stronger than the reporting it rests on.",
              },
            ],
          }
        : assessment,
    );
  }

  const strikeSiteAssessments = effect.siteIssue ? { ...state.security.strikeSiteAssessments, [effect.siteIssue.id]: state.security.strikeSiteAssessments?.[effect.siteIssue.id] ?? effect.siteIssue } : state.security.strikeSiteAssessments;
  return withSecurity(state, { ...state.security, assessments, ...(strikeSiteAssessments ? { strikeSiteAssessments } : {}) });
}

export function applyFinding(state: Campaign, effect: FindingEffect): Campaign {
  const covert = state.security.covert;
  let findings = covert.findings;
  let unfounded = covert.unfounded;

  if (effect.sign) findings = [...findings, effect.sign];
  if (effect.unfounded) unfounded = [...unfounded, effect.unfounded];
  if (effect.refusedObjective) unfounded = [...unfounded, effect.refusedObjective];

  if (effect.notify) {
    const { id, day, statement } = effect.notify;
    findings = findings.map((finding) =>
      finding.id === id
        ? { ...finding, notifiedDay: day, reasonsWithheld: finding.reasonsWithheld ?? statement }
        : finding,
    );
  }

  if (effect.close) {
    findings = findings.map((finding) =>
      finding.id === effect.close!.id ? { ...finding, closedDay: effect.close!.day } : finding,
    );
  }

  if (effect.activity) {
    findings = findings.map((finding) =>
      finding.id === effect.activity!.id ? { ...finding, activities: finding.activities + 1 } : finding,
    );
  }

  return withSecurity(state, { ...state.security, covert: { findings, unfounded } });
}

export function applyWarPowers(state: Campaign, effect: WarPowersEffect): Campaign {
  let obligations = state.security.warPowers.obligations;

  if (effect.open) obligations = [...obligations, effect.open];

  if (effect.file) {
    obligations = obligations.map((obligation) =>
      obligation.id === effect.file!.id ? { ...obligation, filing: effect.file!.filing } : obligation,
    );
  }

  if (effect.certify) {
    const { id, day, necessity } = effect.certify;
    obligations = obligations.map((obligation) =>
      obligation.id === id ? { ...obligation, extension: { certifiedDay: day, necessity } } : obligation,
    );
  }

  if (effect.miss) {
    const ids = new Set(effect.miss.ids);
    obligations = obligations.map((obligation) =>
      ids.has(obligation.id) ? { ...obligation, missed: true as const } : obligation,
    );
  }

  if (effect.terminate) {
    const { id, day } = effect.terminate;
    obligations = obligations.map((obligation) =>
      obligation.id === id ? { ...obligation, terminated: { day } } : obligation,
    );
  }

  return withSecurity(state, { ...state.security, warPowers: { obligations } });
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
