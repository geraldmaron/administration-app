// Selectors and the two writes a case effect is allowed to make. Both return
// a new campaign. Illegal raises and dispositions throw, so a bad packet
// never lands a half-updated registry.
import { compareDates } from "./clock.js";
import type { CaseDisposition, CaseRaise, CaseStatus, PresidentialCase } from "./case-types.js";
import type { EffectActor, GameDate } from "./state-campaign.js";
import type { Campaign } from "./state.js";

const OPEN: ReadonlySet<CaseStatus> = new Set(["raised", "opened", "considering", "deferred", "delegated"]);
const TERMINAL: ReadonlySet<CaseDisposition["kind"]> = new Set(["act", "decline", "allow-default"]);

export function isOpenCase(status: CaseStatus): boolean {
  return OPEN.has(status);
}

function statusFor(kind: CaseDisposition["kind"]): CaseStatus {
  switch (kind) {
    case "act":
      return "acted";
    case "defer":
      return "deferred";
    case "delegate":
      return "delegated";
    case "decline":
      return "declined";
    case "allow-default":
      return "defaulted";
  }
}

function assertRaisable(raise: CaseRaise): void {
  if (raise.allowedDispositions.length === 0) throw new Error(`case ${raise.id} has no disposition`);
  if (raise.clock.kind !== "none" && raise.defaultOutcome.kind === "none") {
    throw new Error(`case ${raise.id} has a deadline and no default`);
  }
  const terminal = raise.allowedDispositions.some((kind) => TERMINAL.has(kind));
  if (raise.urgency === "hard" && raise.clock.kind === "none" && !terminal) {
    throw new Error(`case ${raise.id} is hard, has no deadline, and has no way to end`);
  }
}

function born(campaign: Campaign, raise: CaseRaise, actor: EffectActor, causeId: string | undefined): PresidentialCase {
  return {
    ...raise,
    status: "raised",
    raisedAt: campaign.calendar,
    lastTouchedAt: campaign.calendar,
    causeIds: causeId === undefined ? [] : [causeId],
    history: [
      {
        at: campaign.calendar,
        from: "raised",
        to: "raised",
        actor,
        ...(causeId === undefined ? {} : { causeId }),
        narration: "Raised.",
      },
    ],
  };
}

/** Inserts a new case. The same id cannot be raised twice. */
export function withRaisedCase(campaign: Campaign, raise: CaseRaise, actor: EffectActor, causeId: string | undefined): Campaign {
  const registry = campaign.cases ?? {};
  if (registry[raise.id] !== undefined) throw new Error(`case ${raise.id} already exists`);
  assertRaisable(raise);
  const next = born(campaign, raise, actor, causeId);
  return { ...campaign, cases: { ...registry, [next.id]: next } };
}

function withoutDeferral(existing: PresidentialCase): PresidentialCase {
  if (existing.deferredUntil === undefined) return existing;
  const { deferredUntil: _until, ...rest } = existing;
  return rest;
}

function assertMovable(existing: PresidentialCase, disposition: CaseDisposition): void {
  if (!isOpenCase(existing.status)) throw new Error(`case ${existing.id} is already ${existing.status}`);
  if (!existing.allowedDispositions.includes(disposition.kind)) {
    throw new Error(`case ${existing.id} cannot be ${disposition.kind}`);
  }
  if (disposition.kind === "defer" && existing.clock.kind !== "none" && compareDates(disposition.until, existing.clock.dueAt) >= 0) {
    throw new Error(`case ${existing.id} cannot be deferred onto or past its deadline`);
  }
  if (disposition.kind === "delegate" && disposition.institution.trim() === "") {
    throw new Error(`case ${existing.id} cannot be delegated to nobody`);
  }
}

/** Appends one transition. A closed case, a forbidden disposition, and a deferral past a deadline all fail. */
export function withCaseTransition(
  campaign: Campaign,
  id: string,
  disposition: CaseDisposition,
  narration: string,
  actor: EffectActor,
  causeId: string | undefined,
): Campaign {
  const registry = campaign.cases ?? {};
  const existing = registry[id];
  if (existing === undefined) throw new Error(`no case ${id}`);
  assertMovable(existing, disposition);
  const to = statusFor(disposition.kind);
  const base = disposition.kind === "defer" ? { ...withoutDeferral(existing), deferredUntil: disposition.until } : withoutDeferral(existing);
  const next: PresidentialCase = {
    ...base,
    status: to,
    lastTouchedAt: campaign.calendar,
    causeIds: causeId === undefined ? existing.causeIds : [...existing.causeIds, causeId],
    history: [
      ...existing.history,
      {
        at: campaign.calendar,
        from: existing.status,
        to,
        disposition,
        actor,
        ...(causeId === undefined ? {} : { causeId }),
        narration,
      },
    ],
  };
  return { ...campaign, cases: { ...registry, [id]: next } };
}

export function openCases(campaign: Campaign): readonly PresidentialCase[] {
  return Object.values(campaign.cases ?? {}).filter((item) => isOpenCase(item.status));
}

export function deferredCases(campaign: Campaign): readonly PresidentialCase[] {
  return Object.values(campaign.cases ?? {}).filter((item) => item.status === "deferred");
}

function stillHeldOff(item: PresidentialCase, on: GameDate): boolean {
  return item.status === "deferred" && item.deferredUntil !== undefined && compareDates(on, item.deferredUntil) < 0;
}

export function blockingCases(campaign: Campaign, on: GameDate): readonly PresidentialCase[] {
  return openCases(campaign).filter(
    (item) => item.urgency === "hard" && item.responseRequirement === "president" && !stillHeldOff(item, on),
  );
}

export function dueCases(campaign: Campaign, on: GameDate): readonly PresidentialCase[] {
  return openCases(campaign).filter((item) => item.clock.kind !== "none" && compareDates(on, item.clock.dueAt) >= 0);
}
