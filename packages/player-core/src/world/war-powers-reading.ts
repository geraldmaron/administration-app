import {
  LATEST_TERMINATION_DAYS,
  REPORT_WINDOW_DAYS,
  addDays,
  apply,
  approvalFor,
  blocApprovals,
  headlineOf,
  selectElectorate,
  describeCommitment,
  joinConflict,
  nationName,
  opinionCausesFor,
  opinionTargets,
  projectForceAuthorization,
  projectJoin,
  selectActiveConflicts,
  selectAuthorizationAgainst,
  selectCommitments,
  selectDateOfTurn,
  selectObligations,
  sideOf,
  terminationClockRuns,
  terminationDaysRemaining,
  terminationWindowFromIntroduction,
  type Campaign,
  type Conflict,
  type ConflictSide,
  type DeterrenceAssessment,
  type Likelihood,
  type ReportObligation,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import { dispositionReading, type DispositionReading } from "../congress/congress-reading";
import { formatDate, formatRatio } from "../format/figures";
import { holdingCount } from "./nation-forces";

/** One War Powers deadline, in the shape a clock dial draws. */
export type WarPowersClock = {
  readonly daysRemaining: number;
  readonly dueLabel: string;
  /** The statute's whole window, so the dial reads the days left against it. */
  readonly windowDays: number;
};

/**
 * What joining a war would start, read before the President commits: the
 * report to Congress it obliges, the date forces must come home by without an
 * authorization, and what the other side's arsenal puts at stake. A join is
 * the one act whose legal clock starts the moment it is taken, so the price
 * has to be on the screen before the button, not in the Record after it.
 */
export type WarPowersPreview = {
  readonly report: WarPowersClock;
  /** Absent where Congress has authorized force against that government: no withdrawal clock runs then. */
  readonly withdrawal?: WarPowersClock;
  /** The authorization that covers the entry, in place of the withdrawal clock. */
  readonly cover?: string;
  /** What the office is missing to go in, where its own authority does not reach this war. Nothing may be committed then. */
  readonly refusal?: string;
  /** One sentence on deterrence, absent when nothing on the other side deters. */
  readonly deterrence?: string;
};

function nameOf(campaign: Campaign, id: NationId): string {
  const identity = campaign.nations[id]?.base.identity;
  return identity ? nationName(identity) : (id as string);
}

function sentenceStart(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The arsenal on the other side, said with the country's name rather than a role in somebody else's war. */
function deterrenceLine(campaign: Campaign, against: NationId, deterrence: DeterrenceAssessment): string | undefined {
  if (!deterrence.defenderNuclear) return undefined;
  const them = sentenceStart(nameOf(campaign, against));
  return deterrence.mutual
    ? `${them} has nuclear weapons, and so does ${nameOf(campaign, campaign.founding.nation)}. A nuclear war is a real risk here.`
    : `${them} has nuclear weapons, and its response might go far beyond this war's goals.`;
}

export function dueIn(campaign: Campaign, days: number, windowDays: number, caption: (date: string) => string): WarPowersClock {
  return { daysRemaining: days, dueLabel: caption(formatDate(addDays(campaign.calendar, days))), windowDays };
}

export function warPowersBeforeJoin(campaign: Campaign, conflictId: string, side: ConflictSide): WarPowersPreview | undefined {
  const conflict = campaign.conflicts[conflictId];
  const projection = projectJoin(campaign, conflictId, side);
  if (!conflict || !projection) return undefined;
  const against = side === "aggressor" ? conflict.defender : conflict.aggressor;
  const deterrence = deterrenceLine(campaign, against, projection.deterrence);
  const authorization = projection.warPowers.kind === "authorized" ? projection.warPowers.authorization : undefined;
  return {
    report: dueIn(campaign, REPORT_WINDOW_DAYS, REPORT_WINDOW_DAYS, (date) => `Report to Congress by ${date}`),
    ...(authorization
      ? { cover: `Allowed by the ${authorization.title} until ${formatDate(selectDateOfTurn(campaign, authorization.expiresTurn))}` }
      : { withdrawal: dueIn(campaign, LATEST_TERMINATION_DAYS, LATEST_TERMINATION_DAYS, (date) => `Troops must leave by ${date} unless Congress votes`) }),
    ...(projection.refusal ? { refusal: projection.refusal } : {}),
    ...(deterrence ? { deterrence } : {}),
  };
}

/**
 * What entering a war does at home, read before the President commits: the
 * approval headline now, the one the join's own packet settles, and the level
 * it heads toward while the war lasts; how the Hill reads the administration
 * before and after; and how an authorization against the enemy would count.
 * Every figure comes from applying the join's packet to the campaign, so the
 * preview cannot drift from what the act does.
 */
export type JoinPrice = {
  readonly approval: { readonly now: number; readonly settled: number; readonly heading: number };
  /** Why the level heads where it does: the war term's own sentence, from the cause decomposition. */
  readonly because?: string;
  readonly congress: { readonly before: DispositionReading; readonly after: DispositionReading };
  /** True where no authorization covers the enemy, so the join files a War Powers record of unilateral force. */
  readonly unilateral: boolean;
  readonly authorization: { readonly against: NationId; readonly before: Likelihood; readonly after: Likelihood };
  /** The same, as the lines a confirmation prints. */
  readonly words: readonly string[];
};

function joinPriceWords(campaign: Campaign, price: Omit<JoinPrice, "words">): readonly string[] {
  const { approval, congress, authorization } = price;
  return [
    `Your approval is ${formatRatio(approval.now)} now. It would be ${formatRatio(approval.settled)} the week you go in and head toward ${formatRatio(approval.heading)} while the war lasts.${price.because ? ` ${price.because}` : ""}`,
    price.unilateral
      ? `Congress's mood toward you is ${congress.before.word.toLowerCase()} now. It would be ${congress.after.word.toLowerCase()} after you enter a war without its approval.`
      : `Congress approved this war, so its mood toward you stays ${congress.after.word.toLowerCase()}.`,
    `Odds Congress approves force against ${nameOf(campaign, authorization.against)}: ${authorization.before} now, ${authorization.after} once you're in.`,
  ];
}

/**
 * Whether the war is the reason approval is heading where it is: the front's
 * cost to the settled headline is larger than what the rally adds to it. The
 * rally is an impulse on the record every bloc reads and the cost is a term in
 * the security judgment, so both are measured on the headline.
 */
function warOutweighsRally(after: Campaign, warContribution: number): boolean {
  if (warContribution >= 0) return false;
  const settled = { ...after.player.opinion, ...opinionTargets(after) };
  const reading = selectElectorate(after, settled);
  const withoutRally = headlineOf(reading.shares, blocApprovals({ ...reading, valence: reading.valence - reading.rally }));
  const rallyLift = reading.headline - withoutRally;
  const warCost = approvalFor(after, { ...settled, security: Math.min(1, settled.security - warContribution) }) - reading.headline;
  return warCost > rallyLift;
}

export function joinPriceBeforeJoin(campaign: Campaign, conflictId: string, side: ConflictSide): JoinPrice | undefined {
  const conflict = campaign.conflicts[conflictId];
  const joined = joinConflict(campaign, campaign.founding.nation, conflictId, side);
  if (!conflict || !joined.ok) return undefined;
  const after = apply(campaign, joined.packet);
  const against = side === "aggressor" ? conflict.defender : conflict.aggressor;
  const war = opinionCausesFor(after, "security").find((cause) => cause.key === "war");
  const price = {
    ...(war && warOutweighsRally(after, war.contribution) ? { because: war.detail } : {}),
    approval: {
      now: campaign.player.metrics.approval,
      settled: after.player.metrics.approval,
      // The headline once the six judgments settle where the board is taking them.
      heading: approvalFor(after, { ...after.player.opinion, ...opinionTargets(after) }),
    },
    congress: { before: dispositionReading(campaign), after: dispositionReading(after) },
    unilateral: after.congress.unauthorized.length > campaign.congress.unauthorized.length,
    authorization: {
      against,
      before: projectForceAuthorization(campaign, against).forecast.likelihood,
      after: projectForceAuthorization(after, against).forecast.likelihood,
    },
  };
  return { ...price, words: joinPriceWords(campaign, price) };
}

/** Where the forty-eight hour report on an introduction stands. */
export type ReportStanding = "Filed" | "Filed late" | "Missed" | "Owed";

/**
 * The War Powers position on one front the United States is fighting on: the
 * sixty-day clock where it runs, the authorization where one covers the war,
 * and where the report stands.
 */
export type FrontWarPowers = {
  readonly withdrawal?: WarPowersClock;
  readonly cover?: string;
  readonly report?: ReportStanding;
};

export function reportStanding(obligation: ReportObligation): ReportStanding {
  if (obligation.filing) return obligation.missed === true || obligation.filing.filedDay > obligation.dueDay ? "Filed late" : "Filed";
  return obligation.missed ? "Missed" : "Owed";
}

/**
 * Read off the introductions filed against the government on the other side,
 * the only join the engine records between a war and its War Powers paper:
 * an introduction is filed against a government, not a war.
 */
export function frontWarPowers(campaign: Campaign, counterpart: NationId): FrontWarPowers {
  const authorization = selectAuthorizationAgainst(campaign, counterpart);
  const latest = selectObligations(campaign).find((obligation) => obligation.target === counterpart);
  const running = latest && terminationClockRuns(campaign, latest) ? latest : undefined;
  return {
    ...(authorization ? { cover: `Allowed by the ${authorization.title} until ${formatDate(selectDateOfTurn(campaign, authorization.expiresTurn))}` } : {}),
    ...(running
      ? { withdrawal: dueIn(campaign, terminationDaysRemaining(campaign, running), terminationWindowFromIntroduction(running), (date) => `Troops must leave by ${date} unless Congress votes`) }
      : {}),
    ...(latest ? { report: reportStanding(latest) } : {}),
  };
}

/** A war the United States went into on somebody else's side, with the War Powers position on the government it now fights. */
export type EnteredFront = {
  readonly conflictId: string;
  readonly alongside: NationId;
  readonly against: NationId;
  readonly weeks: number;
  readonly intensity: number;
  readonly warPowers: FrontWarPowers;
};

/**
 * Every war the United States entered beside one of its principals. Entering
 * is the act that starts the War Powers clocks, so the list a joined war
 * appears in is the list that carries them.
 */
export function enteredFronts(campaign: Campaign): readonly EnteredFront[] {
  const us = campaign.founding.nation;
  return selectActiveConflicts(campaign).flatMap((conflict): EnteredFront[] => {
    const side: ConflictSide | undefined = conflict.joined.aggressor.includes(us) ? "aggressor" : conflict.joined.defender.includes(us) ? "defender" : undefined;
    if (!side) return [];
    const against = side === "aggressor" ? conflict.defender : conflict.aggressor;
    return [
      {
        conflictId: conflict.id,
        alongside: side === "aggressor" ? conflict.aggressor : conflict.defender,
        against,
        weeks: Math.max(1, campaign.turn - conflict.startedTurn),
        intensity: conflict.intensity,
        warPowers: frontWarPowers(campaign, against),
      },
    ];
  });
}

/** One government on one side of a war, and what it has committed to the fighting, line by line. */
export type WarParty = {
  readonly nation: NationId;
  readonly role: "principal" | "joined";
  /** Empty where nothing is on record: no other government's commitments are modeled yet. */
  readonly committed: readonly string[];
};

/** The United States' forces in this war: its standing commitments against the enemy or the war, and its open introductions against the enemy. */
function ourCommitted(campaign: Campaign, conflict: Conflict, enemy: NationId): readonly string[] {
  const commitments = selectCommitments(campaign, campaign.founding.nation).filter(
    (commitment) =>
      commitment.status === "active" &&
      ((commitment.target.kind === "nation" && commitment.target.id === enemy) || (commitment.target.kind === "conflict" && commitment.target.id === conflict.id)),
  );
  const lines = commitments.map((commitment) =>
    commitment.source.kind === "orderOfBattle"
      ? `${holdingCount(commitment.source.unitType, commitment.source.count)}: ${describeCommitment(commitment, campaign)}`
      : describeCommitment(commitment, campaign),
  );
  const introductions = selectObligations(campaign)
    .filter((obligation) => obligation.target === enemy && !obligation.terminated)
    .map((obligation) => obligation.description);
  return [...lines, ...introductions];
}

/** Every party to a war, side by side, each with what it has committed. Undefined for a war not on the board. */
export function warPartyForces(campaign: Campaign, conflictId: string): Readonly<Record<ConflictSide, readonly WarParty[]>> | undefined {
  const conflict = campaign.conflicts[conflictId];
  if (!conflict) return undefined;
  const us = campaign.founding.nation;
  const ours = sideOf(conflict, us);
  const enemy = ours === "aggressor" ? conflict.defender : ours === "defender" ? conflict.aggressor : undefined;
  const side = (which: ConflictSide): readonly WarParty[] =>
    [conflict[which], ...conflict.joined[which]].map((nation, index) => ({
      nation,
      role: index === 0 ? "principal" : "joined",
      committed: nation === us && enemy ? ourCommitted(campaign, conflict, enemy) : [],
    }));
  return { aggressor: side("aggressor"), defender: side("defender") };
}
