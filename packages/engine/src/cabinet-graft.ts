import type { RoleId } from "@admin/world";
import { selectCabinetHolder, type ActionRecord, type Campaign } from "./state.js";
import { fiscalYearOf, addDays } from "./clock.js";
import { selectBudgetOutlook, type BudgetAccount } from "./budget.js";
import { ACCOUNT_CAP, inShutdown } from "./funding.js";
import { accountDepartments } from "./department-ownership.js";
import { institutionForRole } from "./institutions.js";
import { inspectorIsSeated, selectInspector } from "./oversight.js";
import { axisLean } from "./person-disposition.js";
import { createRngStreams } from "./rng.js";
import { noiseFrom, stampOf, weigh, willDraw, type Term } from "./willingness.js";
import type { EffectPacket } from "./effects.js";

// This is a purchasing opportunity, not another way for a minister to leak or
// resign. The budget has no contract ledger, so an enacted, non-transfer
// appropriation spent by the chair is the narrowest observable proxy.
const THRESHOLD = 0.35;
const NOISE = 0.05;
const MAX_INTEGRITY_LOSS = 0.06;
const MIN_INTEGRITY_LOSS = 0.02;
const round4 = (value: number) => Math.round(value * 10000) / 10000 + 0;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export type PurchasingOpportunity = {
  readonly account: BudgetAccount;
  readonly annualShare: number;
  readonly departmentShare: number;
  readonly annualPurchasing: number;
  readonly reach: number;
};

/** The largest live purchasing line this chair controls; reserve transfers are not contracts. */
export function purchasingOpportunity(campaign: Campaign, role: RoleId): PurchasingOpportunity | undefined {
  if (inShutdown(campaign)) return undefined;
  const outlook = selectBudgetOutlook(campaign);
  const lines = outlook.lines.flatMap((line) => {
    if (line.account === "economic" || line.share <= 0) return [];
    const owned = accountDepartments(campaign.founding.charter, line.account)?.find((entry) => entry.role === role);
    if (!owned || owned.share <= 0) return [];
    const annualShare = round4(line.share * owned.share);
    return annualShare > 0 ? [{ account: line.account, annualShare, departmentShare: owned.share,
      annualPurchasing: Math.round(outlook.gdp * annualShare), reach: round4(clamp01(annualShare / ACCOUNT_CAP)) }] : [];
  });
  return lines.sort((a, b) => b.annualShare - a.annualShare || a.account.localeCompare(b.account))[0];
}

/** One opportunity per fiscal year, in its opening week, on the enacted allocation. */
export function graftYear(campaign: Campaign): number | undefined {
  const now = fiscalYearOf(campaign.calendar);
  return now !== fiscalYearOf(addDays(campaign.calendar, -7)) ? now : undefined;
}

/** Hidden misconduct becomes player-readable only when the inspector's finding is public. */
export function graftDisclosed(campaign: Campaign, entry: ActionRecord): boolean {
  if (!entry.causal?.graft) return true;
  return campaign.oversight.matters.some((matter) => matter.causeId === entry.causal?.eventId
    && matter.origin.kind === "inspector-general" && matter.public && matter.stage !== "opened");
}

export function cabinetGraftPackets(campaign: Campaign): readonly EffectPacket[] {
  const fiscalYear = graftYear(campaign);
  if (fiscalYear === undefined) return [];
  const streams = createRngStreams(campaign.seed);
  // The opportunity belongs to the department's fiscal year, not its holder.
  // A replay or midyear succession cannot use the same appropriation twice.
  const used = new Set(campaign.ledger.flatMap((entry) => entry.causal?.graft?.fiscalYear === fiscalYear
    ? [entry.causal.graft.role] : []));
  const packets: EffectPacket[] = [];
  for (const role of Object.keys(campaign.player.cabinet) as RoleId[]) {
    if (role === campaign.founding.leadRole || used.has(role)) continue;
    const holder = selectCabinetHolder(campaign, role);
    const institution = institutionForRole(role);
    const runtime = institution && campaign.institutions[institution.id];
    const access = purchasingOpportunity(campaign, role);
    if (!holder?.alive || !institution || !runtime || !access) continue;
    const person = holder.base;
    const inspector = inspectorIsSeated(selectInspector(campaign, institution.id));
    const terms: readonly Term[] = [
      { key: "principle", source: "trait", value: round4(-axisLean(person, "principle")) },
      { key: "ambition", source: "trait", value: round4(0.3 * (person.ambition - 0.5)) },
      { key: "budget-reach", source: "situation", value: round4(0.25 * access.reach) },
      { key: "oversight", source: "situation", value: round4(-0.3 * runtime.oversightPressure - (inspector ? 0.1 : 0)) },
    ];
    const noise = noiseFrom(willDraw(streams, "steer-contracts", person.id, role, fiscalYear), NOISE);
    const decision = weigh("steer-contracts", terms, { threshold: THRESHOLD, noiseBound: NOISE, noise });
    if (!decision.acts) continue;
    const integrityLoss = round4(MIN_INTEGRITY_LOSS + (MAX_INTEGRITY_LOSS - MIN_INTEGRITY_LOSS) * access.reach);
    packets.push({
      source: "simulate", actor: "world", turn: campaign.turn + 1, background: true,
      narration: { summary: `A procurement decision at ${institution.name} is diverted inside the department.` },
      provenance: { origin: "world", visibility: "internal", systems: ["cabinet", "graft"],
        entities: [person.id, institution.id], decision: stampOf(decision, person.id, role, "intelligence"),
        graft: { person: person.id, role, institution: institution.id, fiscalYear, account: access.account,
          annualShare: access.annualShare, departmentShare: access.departmentShare,
          annualPurchasing: access.annualPurchasing, purchasingReach: access.reach,
          oversightPressure: runtime.oversightPressure } },
      effects: [{ kind: "institution", institution: institution.id,
        changes: { integrity: round4(clamp01(runtime.integrity - integrityLoss)) } }],
    });
  }
  return packets;
}
