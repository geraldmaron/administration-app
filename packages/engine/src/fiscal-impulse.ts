import type { NationId } from "@admin/world";
import { sideOf } from "./conflicts.js";
import { lawShift } from "./law-offsets.js";
import { POLICY_DOMAINS, type PolicySet } from "./policy.js";
import { selectActiveConditions, selectActiveConflicts, type Campaign, type Conflict } from "./state.js";

// The push a government's budget gives its own economy: a change in what it
// borrows to spend, weighted by how much of each kind of spending reaches
// demand, and fading as the economy absorbs it. A fraction of output.
//
// And what moves a government's primary balance in the first place: its
// program, its laws, and the outlays a war or a street in revolt forces on it.
// Only the first two are structural. A war's outlays are spent abroad or on
// munitions, and a crisis's are forced; neither is a budget pushing demand, so
// neither reaches the impulse.

/**
 * What one program does to the national books, as shares of output a year: the
 * take it adds, the outlays it adds, and which lines those outlays sit on. The
 * part on the discretionary line is what the President's own authority is a
 * share of; transfers sit on the mandatory programs; the rest is purchases on
 * other lines, defense above all.
 */
export type FiscalProgramShift = {
  readonly take?: number;
  readonly outlays?: number;
  readonly discretionary?: number;
  readonly transfers?: number;
  /** The part of the outlays that builds something, which reaches demand only as it is spent out. */
  readonly investment?: number;
};

/**
 * Consolidation closes reliefs and cuts both lines; investment borrows to
 * build; redistribution raises the take hardest and spends it on transfers,
 * because it is the one program that says out loud who is paying. Extraction
 * banks its royalties and nationalization its dividends in the general fund,
 * and a drawdown is a smaller defense line: about eight tenths and four tenths
 * of a point of output a year, what the programs used to write straight onto
 * the debt every week.
 */
export const FISCAL_PROGRAM_SHIFTS: Readonly<Record<string, FiscalProgramShift>> = {
  "fiscal-austerity": { take: 0.012, outlays: -0.022, discretionary: -0.008, transfers: -0.014 },
  "fiscal-investment": { take: -0.006, outlays: 0.012, discretionary: 0.012, investment: 0.012 },
  "fiscal-redistribution": { take: 0.022, outlays: 0.018, transfers: 0.018 },
  "industry-extraction": { take: 0.0078 },
  "industry-nationalization": { take: 0.0042 },
  "defense-drawdown": { outlays: -0.0078 },
};

/**
 * `cap` is the cut a statutory cap holds the discretionary line to, as a
 * positive share, already counted inside `discretionary`. Kept apart because a
 * cap and the crowding of the President's own borrowing are the same squeeze
 * on the same line, charged once at the larger of the two.
 */
export type ProgramShift = {
  readonly take: number;
  readonly outlays: number;
  readonly discretionary: number;
  readonly transfers: number;
  readonly investment?: number;
  readonly cap?: number;
};

const NO_SHIFT: ProgramShift = { take: 0, outlays: 0, discretionary: 0, transfers: 0 };

/** A whole program, summed across its domains. */
export function programShiftOf(program: Readonly<Record<string, string>> | undefined): ProgramShift {
  if (!program) return NO_SHIFT;
  let take = 0;
  let outlays = 0;
  let discretionary = 0;
  let transfers = 0;
  let investment = 0;
  for (const domain of POLICY_DOMAINS) {
    const held = program[domain];
    const shift = held ? FISCAL_PROGRAM_SHIFTS[held] : undefined;
    take += shift?.take ?? 0;
    outlays += shift?.outlays ?? 0;
    discretionary += shift?.discretionary ?? 0;
    transfers += shift?.transfers ?? 0;
    investment += shift?.investment ?? 0;
  }
  return { take, outlays, discretionary, transfers, investment };
}

/** The President's program and the laws on the books, together: everything a President's choices do to the take and the lines. */
export function programShift(campaign: Campaign): ProgramShift {
  const program = programShiftOf(campaign.player.policies);
  const laws = lawShift(campaign);
  return {
    take: program.take + laws.take,
    outlays: program.outlays + laws.outlays,
    discretionary: program.discretionary + laws.discretionary,
    transfers: program.transfers + laws.transfers,
    investment: (program.investment ?? 0) + laws.investment,
    cap: laws.cap,
  };
}

/** What the President's program and laws take less what they spend: their part of the primary balance. */
export function programBalance(campaign: Campaign): number {
  const shift = programShift(campaign);
  return shift.take - shift.outlays;
}

/** Another government's program, which is what it legislates with. */
export function governmentShift(campaign: Campaign, nation: NationId): ProgramShift {
  return programShiftOf(campaign.governments[nation]);
}

// --- What a war or a street in revolt costs -----------------------------------

/**
 * What a war costs a government a year as a share of its output, by the part
 * it plays: fighting on its own soil costs most, fighting abroad less, and
 * joining someone else's war least. Scaled by how hot the front is.
 */
const WAR_OUTLAYS = { defender: 0.03, aggressor: 0.02, joiner: 0.005 } as const;

/**
 * Whether the President's government already pays for this war through a
 * standing deployment toward the war or the enemy. That commitment is priced
 * from what the units sent cost and drawn on the authority
 * inside the discretionary line, so the dollars are on the books once already;
 * a share of output on top would bill the same war a second time. Another
 * government's commitments are never billed, so its wars keep the share.
 */
function billedByDeployment(campaign: Campaign, nation: NationId, conflict: Conflict): boolean {
  if (nation !== campaign.founding.nation) return false;
  const enemy = (sideOf(conflict, nation) === "aggressor" ? conflict.defender : conflict.aggressor) as string;
  return Object.values(campaign.commitments).some(
    (commitment) =>
      commitment.actor === nation &&
      commitment.status === "active" &&
      commitment.resource.spec.kind === "currency" &&
      commitment.resource.amountPerTurn > 0 &&
      (commitment.target.id === conflict.id || commitment.target.id === enemy),
  );
}

export function warOutlayShare(campaign: Campaign, nation: NationId): number {
  return selectActiveConflicts(campaign).filter((conflict) => !billedByDeployment(campaign, nation, conflict)).reduce((total, conflict) => {
    const share =
      conflict.defender === nation
        ? WAR_OUTLAYS.defender
        : conflict.aggressor === nation
          ? WAR_OUTLAYS.aggressor
          : conflict.joined.aggressor.includes(nation) || conflict.joined.defender.includes(nation)
            ? WAR_OUTLAYS.joiner
            : 0;
    return total + share * conflict.intensity;
  }, 0);
}

/** Unrest costs a government about a fifth of a point of output a year for each standard deviation of it (IMF Fiscal Monitor, April 2026). */
const UNREST_OUTLAY = 0.002;

export function unrestOutlayShare(campaign: Campaign, nation: NationId): number {
  return selectActiveConditions(campaign)
    .filter((condition) => condition.nation === nation && condition.kind === "unrest")
    .reduce((total, condition) => total + UNREST_OUTLAY * condition.severity, 0);
}

// --- The impulse ----------------------------------------------------------------

/** The structural budget by kind, as shares of potential output: what it takes, and what it spends on purchases and on transfers. */
export type StructuralMix = { readonly taxes: number; readonly purchases: number; readonly transfers: number };

/**
 * How much of a point of each kind of fiscal change reaches demand: purchases
 * most, transfers least, taxes between (Ramey; the budget office's ranges).
 */
const MULTIPLIER = { taxes: 0.6, purchases: 0.8, transfers: 0.5 } as const;

/** The push fades as the economy absorbs it, over about half a year. */
const IMPULSE_FADE = 1 / 26;

/** The week's change in the structural budget, weighted by how much of each kind reaches demand. */
export function impulseOf(from: StructuralMix, to: StructuralMix): number {
  return (
    -MULTIPLIER.taxes * (to.taxes - from.taxes) +
    MULTIPLIER.purchases * (to.purchases - from.purchases) +
    MULTIPLIER.transfers * (to.transfers - from.transfers)
  );
}

/** Last week's push, faded by a week, plus whatever the budget changed this week. */
export function nextImpulse(impulse: number, last: StructuralMix | undefined, now: StructuralMix): number {
  const faded = impulse * (1 - IMPULSE_FADE);
  return last ? faded + impulseOf(last, now) : faded;
}

/** The kinds a program's shift falls on, relative to the program a government had when its books opened. */
export function mixOfShift(shift: ProgramShift): StructuralMix {
  return { taxes: shift.take, purchases: shift.outlays - shift.transfers, transfers: shift.transfers };
}

/**
 * The week's share of public investment not yet spent that gets spent.
 *
 * Money to build is authorized in a year and spent over several, as contracts
 * are let and work is billed, and it pushes demand as it is spent. The budget
 * office's figure: the Federal-Aid Highway program "typically spends about 25
 * percent of its budgetary resources in the year funds are first made
 * available for obligation; the rest is spent over the next several years"
 * (CBO, The Highway Trust Fund and the Treatment of Surface Transportation
 * Programs in the Federal Budget, June 2014, publication 45416, read
 * 2026-09-28 from its archived copy). New programs spend slower still: CBO's
 * estimate of the 2021 infrastructure law put the first year's outlays at
 * about 5% of each year's new highway and transit authority (Senate Amendment
 * 2137 to H.R. 3684, August 2021, publication 57406). The established
 * program's quarter a year is the rate here, drawn weekly on what is left:
 * 25% of a step spent in the first year, 44% by the second, 58% by the third.
 */
export const INVESTMENT_SPENDOUT = 1 - 0.75 ** (1 / 52);

/** What of the investment authorized has been spent by this week, moved a week toward what is authorized now. */
export function spentInvestment(spent: number, authority: number): number {
  return Math.round((spent + INVESTMENT_SPENDOUT * (authority - spent)) * 1e7) / 1e7 + 0;
}

/** The budget as it reaches demand: purchases count the investment spent, not the investment authorized. */
export function spendingMix(mix: StructuralMix, authority: number, spent: number): StructuralMix {
  return { ...mix, purchases: mix.purchases - authority + spent };
}

type ImpulseHistory = { readonly impulse: number; readonly structural?: StructuralMix; readonly investmentSpent?: number };

/**
 * A week of the budget's push on demand: last week's faded, plus the week's
 * change in what is spent. A record kept before investment spent out reads as
 * all of it spent, so opening such a record pushes nothing.
 */
export function weekOfImpulse(last: ImpulseHistory, mix: StructuralMix, investment: number): Required<ImpulseHistory> {
  const spent = spentInvestment(last.investmentSpent ?? investment, investment);
  const spending = spendingMix(mix, investment, spent);
  return { impulse: Math.round(nextImpulse(last.impulse, last.structural, spending) * 1e7) / 1e7 + 0, structural: spending, investmentSpent: spent };
}

/** The push a government's budget is giving its economy this week, as last week's books left it. */
export function fiscalImpulse(campaign: Campaign, nation: NationId): number {
  return campaign.books?.[nation]?.impulse ?? 0;
}

/**
 * The push a program the President has not adopted would give in the week it
 * was adopted, for the preview beside it: what it changes in the take and the
 * lines, weighted by kind, with only the first week's spending of any
 * investment it authorizes.
 */
export function projectFiscalImpulse(campaign: Campaign, draft: Partial<PolicySet>): number {
  const held = programShiftOf(campaign.player.policies);
  const drafted = programShiftOf({ ...campaign.player.policies, ...draft });
  const before = held.investment ?? 0;
  const after = drafted.investment ?? 0;
  return impulseOf(spendingMix(mixOfShift(held), before, before), spendingMix(mixOfShift(drafted), after, spentInvestment(before, after)));
}
