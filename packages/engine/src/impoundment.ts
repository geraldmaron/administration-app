import type { Campaign, ChamberVote, GameDate } from "./state.js";
import type { BudgetAccount } from "./budget.js";
import type { Effect, EffectPacket } from "./effects.js";
import { CHAMBERS, carried, majorityOf, seatedOf } from "./congress.js";
import { legislativeVoteOn } from "./congress-votes.js";
import { addDays, compareDates, fiscalYearEnd } from "./clock.js";
import { sessionDaysSince } from "./congressional-session.js";
import { sittingDate } from "./signing-window.js";

// Withholding appropriated money, under the Impoundment Control Act
// (2 U.S.C. 681-688).
//
// The President may ask Congress to cancel budget authority (a rescission) or
// to let it sit for a while (a deferral), by special message. Both are held
// against a clock counted in days of continuous session, not calendar days.
//
// A rescission lets the funds be withheld while Congress considers a
// rescission bill, and the funds "shall be made available for obligation"
// unless Congress completes action within 45 days of continuous session
// (683(b)). That default release is the Act's whole force: silence from
// Congress is the loss, not the win. A deferral may be made only to provide
// for contingencies, to achieve savings from greater efficiency, or as
// specifically provided by law (684(b)); it cannot run past the fiscal year,
// and since 1987 Congress has no disapproval vote that releases it. The
// Comptroller General reviews every message and reports whether a deferral
// is in accordance with existing law (685(b)); and may sue for release once
// 25 days of continuous session have run after an explanatory statement
// (687).
//
// A rescission message sent so late that its 45 session days would end after
// the fiscal year does is a pocket rescission: the money expires before the
// default release can happen. The Act does not say whether that is lawful. The
// Supreme Court's interim order in Department of State v. AIDS Vaccine
// Advocacy Coalition (Sept. 26, 2025) let one stand and said in terms that it
// is "not a final determination on the merits", so it is carried here as
// contested, with the Comptroller General's view recorded and the cost on the
// Hill.
//
// Withholding money without sending a message at all is the third thing the
// Act reaches (686(a): the Comptroller General treats it as if a message had
// been sent). It is not an act here. The Antideficiency Act (31 U.S.C. 1341)
// bars obligating more than is appropriated, not less, so it has no part in
// this file.

export type ImpoundmentKind = "rescission" | "deferral";

/**
 * Why a deferral is proposed. The first two are the purposes 684(b) allows; a
 * deferral for policy reasons is the one the Act does not, and what the
 * Comptroller General reports against.
 */
export type DeferralPurpose = "contingency" | "savings" | "policy";

export type ImpoundmentStatus =
  | "pending"
  /** Congress completed action on a rescission bill: the authority is gone. */
  | "rescinded"
  /** The window ran out, or the deferral period ended, and the money is available again. */
  | "released"
  /** A pocket rescission's fiscal year ended with the money still withheld. */
  | "lapsed"
  /** A court ordered the money released on the Comptroller General's suit. */
  | "court-ordered";

export type ImpoundmentMessage = {
  readonly id: string;
  readonly kind: ImpoundmentKind;
  readonly account: BudgetAccount;
  /** The withheld amount, as an annual share of GDP, fixed when the message is sent. */
  readonly share: number;
  readonly transmitted: GameDate;
  readonly transmittedTurn: number;
  readonly fiscalYear: number;
  /** Deferral only. */
  readonly purpose?: DeferralPurpose;
  /** Deferral only: the last day the funds are held, never past the fiscal year's end. */
  readonly heldThrough?: GameDate;
  /** Rescission only: the 45th day of continuous session would fall after the fiscal year ends. */
  readonly pocket?: boolean;
  /** Rescission only: how the floor reads the cut, fixed when sent so the one count Congress takes is reproducible. */
  readonly appeal?: number;
  /** Rescission only: Congress has taken its one count. */
  readonly counted?: boolean;
  readonly status: ImpoundmentStatus;
  readonly closed?: GameDate;
  readonly gao?: {
    readonly reported: GameDate;
    /** Deferral only: whether the Comptroller General finds it within existing statutory authority. */
    readonly inAccordance?: boolean;
    readonly suitFiled?: GameDate;
  };
};

/** 2 U.S.C. 682(3), 683(b): the window Congress has to complete action on a rescission bill. */
export const RESCISSION_WINDOW_SESSION_DAYS = 45;
/** 2 U.S.C. 687: days of continuous session after the explanatory statement before the Comptroller General may sue. */
export const GAO_SUIT_WAIT_SESSION_DAYS = 25;
/**
 * 2 U.S.C. 688(b)(1): the committee may be discharged after 25 days of
 * continuous session. The one count Congress takes is placed there, the first
 * day a rescission bill can be forced to the floor.
 */
export const RESCISSION_VOTE_SESSION_DAY = 25;
/** The Comptroller General reviews "as promptly as practicable" (685(b)); this is the abstraction's pace. */
export const GAO_REPORT_SESSION_DAYS = 14;
/** Days from the Comptroller General's filing to an order in the District of Columbia; the Act sets no pace, so this is a design judgment. */
export const COURT_ORDER_DAYS = 56;

/** What the Hill thinks of a finding that the administration is withholding money unlawfully. */
export const UNLAWFUL_DEFERRAL_DISPOSITION_COST = 0.08;
/** What the Hill thinks of a rescission message that was sent so the money would expire. */
export const POCKET_RESCISSION_DISPOSITION_COST = 0.08;

/** What each further unlawful deferral of the same funds in a fiscal year adds, up to the cost of the first finding. */
export const REPEAT_UNLAWFUL_DEFERRAL_STEP = 0.02;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

export function selectImpoundments(campaign: Pick<Campaign, "congress">): readonly ImpoundmentMessage[] {
  return campaign.congress.appropriation.impoundments ?? [];
}

/** The messages whose money is being held back this week. */
export function pendingImpoundments(campaign: Pick<Campaign, "congress">): readonly ImpoundmentMessage[] {
  return selectImpoundments(campaign).filter((message) => message.status === "pending");
}

/** The share of an account that is held back right now, as an annual share of GDP. */
export function withheldShare(campaign: Pick<Campaign, "congress">, account: BudgetAccount): number {
  return pendingImpoundments(campaign)
    .filter((message) => message.account === account)
    .reduce((total, message) => total + message.share, 0);
}

type Step = { readonly message: ImpoundmentMessage; readonly notes: readonly string[]; readonly disposition: number; readonly rescinded?: number };

function closed(message: ImpoundmentMessage, status: ImpoundmentStatus, today: GameDate): ImpoundmentMessage {
  return { ...message, status, closed: today };
}

/** The count on a rescission bill: both chambers at a majority, because the Act's fast track takes the Senate's filibuster away. */
export function countRescission(campaign: Campaign, appeal: number): { readonly votes: readonly ChamberVote[]; readonly carried: boolean } {
  const votes = CHAMBERS.map((chamber) =>
    legislativeVoteOn(campaign, {
      chamber,
      appeal,
      required: majorityOf(seatedOf(campaign.congress, chamber)),
      stance: "administration",
    }),
  );
  return { votes, carried: carried(votes) };
}

function stepRescission(campaign: Campaign, message: ImpoundmentMessage, today: GameDate): Step {
  const elapsed = sessionDaysSince(message.transmitted, today);
  if (!message.counted && elapsed >= RESCISSION_VOTE_SESSION_DAY) {
    if (countRescission(campaign, message.appeal ?? 0).carried) {
      return { message: closed(message, "rescinded", today), notes: ["Congress passes the rescission bill, and the authority is canceled."], disposition: 0, rescinded: message.share };
    }
    return stepRescission(campaign, { ...message, counted: true }, today);
  }
  if (message.pocket && compareDates(today, fiscalYearEnd(message.fiscalYear)) >= 0) {
    return { message: closed(message, "lapsed", today), notes: ["The fiscal year ends with the money still held, and the budget authority expires."], disposition: 0 };
  }
  if (!message.pocket && elapsed >= RESCISSION_WINDOW_SESSION_DAYS) {
    return {
      message: closed(message, "released", today),
      notes: ["Congress has not completed action in 45 days of continuous session, and the Act requires the money released."],
      disposition: 0,
    };
  }
  return { message, notes: [], disposition: 0 };
}

function stepDeferral(message: ImpoundmentMessage, today: GameDate): Step {
  const elapsed = sessionDaysSince(message.transmitted, today);
  let current = message;
  const notes: string[] = [];
  let disposition = 0;
  // 685(b) has the Comptroller General review every message. One that ends
  // before the usual review date is reviewed on the day it ends, so a series of
  // short deferrals cannot be released ahead of the review.
  const ends = current.heldThrough !== undefined && compareDates(today, current.heldThrough) >= 0;
  if (!current.gao && (elapsed >= GAO_REPORT_SESSION_DAYS || ends)) {
    const inAccordance = current.purpose !== "policy";
    current = { ...current, gao: { reported: today, inAccordance } };
    if (!inAccordance) {
      notes.push("The Comptroller General reports that the deferral is not in accordance with existing law.");
      disposition -= UNLAWFUL_DEFERRAL_DISPOSITION_COST;
    }
  }
  if (current.gao && current.gao.inAccordance === false && !current.gao.suitFiled && sessionDaysSince(current.gao.reported, today) >= GAO_SUIT_WAIT_SESSION_DAYS) {
    current = { ...current, gao: { ...current.gao, suitFiled: today } };
    notes.push("The Comptroller General sues in the District of Columbia to have the money released.");
  }
  const suit = current.gao?.suitFiled;
  if (suit && compareDates(today, addDays(suit, COURT_ORDER_DAYS)) >= 0) {
    return { message: closed(current, "court-ordered", today), notes: [...notes, "The court orders the money released."], disposition };
  }
  if (current.heldThrough && compareDates(today, current.heldThrough) >= 0) {
    return { message: closed(current, "released", today), notes: [...notes, "The deferral period ends and the money is available again."], disposition };
  }
  return { message: current, notes, disposition };
}

/**
 * One week of every pending message: the count Congress takes, the default
 * release, the Comptroller General's report and suit, the court's order, and
 * a pocket rescission's expiry. Dated by the sitting date so a week stepped by
 * office day and a week taken whole close the same message in the same week.
 */
export function impoundmentPackets(campaign: Campaign): readonly EffectPacket[] {
  const pending = pendingImpoundments(campaign);
  if (pending.length === 0) return [];
  const today = sittingDate(campaign);
  const changed = pending
    .map((message) => ({ before: message, step: message.kind === "rescission" ? stepRescission(campaign, message, today) : stepDeferral(message, today) }))
    .filter(({ before, step }) => step.message !== before)
    .map(({ step }) => step);
  if (changed.length === 0) return [];

  const byId = new Map(changed.map((step) => [step.message.id, step.message]));
  const impoundments = selectImpoundments(campaign).map((message) => byId.get(message.id) ?? message);
  const disposition = changed.reduce((total, step) => total + step.disposition, 0);
  const congress = {
    ...campaign.congress,
    disposition: round3(clamp01(campaign.congress.disposition + disposition)),
    appropriation: { ...campaign.congress.appropriation, impoundments },
  };
  const rescinded = changed.filter((step) => step.rescinded !== undefined);
  const effects: Effect[] = [
    { kind: "congress", set: congress },
    ...(rescinded.length > 0 ? [{ kind: "budget" as const, allocation: rescindedAllocation(campaign, rescinded) }] : []),
    {
      kind: "feed",
      items: changed.flatMap((step) =>
        step.notes.map((headline) => ({ turn: campaign.turn + 1, kind: "press" as const, visibility: "public" as const, headline })),
      ),
    },
  ];
  return [
    {
      source: "simulate",
      actor: "world",
      turn: campaign.turn + 1,
      background: true,
      narration: { summary: changed.flatMap((step) => step.notes).join(" ") || "A special message moves." },
      effects,
    },
  ];
}

function rescindedAllocation(campaign: Campaign, rescinded: readonly Step[]): Record<BudgetAccount, number> {
  const allocation: Record<string, number> = { ...campaign.player.budget };
  for (const step of rescinded) {
    allocation[step.message.account] = Math.max(0, (allocation[step.message.account] ?? 0) - (step.rescinded ?? 0));
  }
  return allocation as Record<BudgetAccount, number>;
}
