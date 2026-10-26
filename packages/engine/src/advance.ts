import { withDueCaseDefaults } from "./case-defaults.js";
import { addDays, campaignFoundingDate, daysBetween, federalElectionDay, isMidtermYear, isPresidentialElectionYear, isSameDate } from "./clock.js";
import {
  composeAttentionStop,
  gatherMatters,
  pruneDeferrals,
  reviseNotices,
  stopIsWarranted,
  withoutDeferred,
  withoutNoticed,
  type AttentionMatter,
  type AttentionStop,
  type MatterSource,
} from "./attention.js";
import type { TurnPhases } from "./turn-loop.js";
import { TARIFF_STATUTES } from "./tariff-statutes.js";
import { tradeSector } from "./trade-sectors.js";
import { advanceOneDay } from "./day-step.js";
import { settleHeldDocket, type LapseSource, type StagingSource } from "./docket-loop.js";
import { campaignIsOver } from "./elections.js";
import { apply } from "./effects.js";
import type { Campaign, FeedItem } from "./state.js";

// The one function the app and the harness both drive the world with.
//
// `advanceTurn` is still the tick, and every phase is still calibrated to it.
// What changes is who decides how many ticks a sitting is: the world runs until
// it has something the President is actually needed for, and then it stops. A
// quiet fortnight is a quiet fortnight — not fourteen prompts to press a button
// and not a manufactured card to justify having asked.
//
// The three rules that make this different from a loop around advanceTurn:
//
// 1. It stops on ATTENTION, not on a count. Zero matters is a legitimate
//    outcome of a step, and the answer to it is to keep going, not to lower the
//    bar until something qualifies.
// 2. It never runs past the horizon it was given, and the horizon is measured
//    in DAYS. The caller says "advance up to two weeks"; it does not say "run
//    two turns", because a turn is an implementation detail of the tick.
// 3. It stops dead the moment the presidency ends, whichever way it ends: a
//    removal, a lost election or a second term served out. An administration
//    that is over has no next day, and continuing to simulate one is how a
//    harness ends up measuring a government that no longer holds office, and
//    how an election night lost at the polls is followed by weeks more of
//    governing.

export type StopReason =
  /** Something needs the President. `stop.presented` is non-empty. */
  | "attention"
  /** The horizon ran out with a quiet world. Nothing is owed an answer. */
  | "horizon"
  /** The presidency ended — removed, defeated, term-limited. */
  | "ended"
  /** A federal Election Day, with the President still in office. An odd-year governors' night does not stop. */
  | "election";

export type AdvanceOptions = {
  readonly phases: TurnPhases;
  /**
   * Who gets asked what the President is needed for. Injected rather than
   * imported: authored content lives in a package that depends on this one, so
   * a scenario director can be a source without inverting the dependency.
   */
  readonly matterSources?: readonly MatterSource<Campaign>[];
  /**
   * How far the world may run before handing control back even if nothing
   * happened. Days, not turns. Defaults to four weeks — long enough that a
   * genuinely quiet month is experienced as one, short enough that the player
   * is never gone from their own presidency for a season.
   */
  readonly horizonDays?: number;
  /**
   * Who admits a held document on this day. Omitted means the desk still
   * stages the old way and this call does not create a docket.
   */
  readonly stagingSources?: readonly StagingSource<Campaign>[];
  /** Who prices a document whose window closes today. The entry is removed either way. */
  readonly lapseSources?: readonly LapseSource<Campaign>[];
};

export type { LapseSource, StagingSource };

export type AdvanceResult = {
  readonly campaign: Campaign;
  /** Calendar days actually spent. Zero when the first look already stopped. */
  readonly elapsedDays: number;
  /** Ticks actually run, for a harness that needs to reconcile with `turn`. */
  readonly turnsRun: number;
  /** What reached the player while the world ran. Never stops time by itself. */
  readonly ambientEvents: readonly FeedItem[];
  /** At most three presidential matters, plus what is still owed behind them. */
  readonly stop: AttentionStop;
  readonly stopReason: StopReason;
};

/** Four weeks. See `horizonDays`. */
export const DEFAULT_HORIZON_DAYS = 28;

const EMPTY_STOP: AttentionStop = { presented: [], deferred: [], ambient: [] };

/** Drops deferrals whose date has arrived, leaving the campaign alone if none had. */
function withPrunedDeferrals(campaign: Campaign): Campaign {
  const pruned = pruneDeferrals(campaign.deferrals, campaign.calendar);
  return pruned === campaign.deferrals ? campaign : { ...campaign, deferrals: pruned };
}

type Look = { readonly stop: AttentionStop; readonly campaign: Campaign };

/**
 * The notice ledger's change, written as a presentation packet so it travels
 * the one gate without a ledger entry or a causal id: what the President was
 * shown depends on their settings and must not shift the numbering every later
 * record cites. Nothing is written when the look changed nothing.
 */
function withNotices(campaign: Campaign, next: Campaign["noticed"]): Campaign {
  const before = campaign.noticed ?? {};
  const after = next ?? {};
  const notice = Object.fromEntries(Object.entries(after).filter(([id, signature]) => before[id] !== signature));
  const forget = Object.keys(before).filter((id) => after[id] === undefined).sort();
  if (Object.keys(notice).length === 0 && forget.length === 0) return campaign;
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    presentation: true,
    provenance: { origin: "world", entities: [...Object.keys(notice), ...forget].sort() },
    narration: { summary: "The world stopped for a change on the desk, and noted it." },
    effects: [{ kind: "attention", ...(Object.keys(notice).length > 0 ? { notice } : {}), ...(forget.length > 0 ? { forget } : {}) }],
  });
}

/**
 * Asks every source, shows the President what is news, and notes what was shown.
 *
 * A matter the President put off does not get to stop the world again before
 * the date they put it off until. Without that the pre-tick look is a trap:
 * defer a bill, press Continue, and the same bill is presented at
 * `elapsedDays: 0` forever. A matter whose signature is unchanged since the
 * world last stopped for it is held back the same way, for as long as it stays
 * unchanged, so a deferral that lapses does not turn the same level into a
 * second interruption.
 */
function lookForMatters(campaign: Campaign, sources: readonly MatterSource<Campaign>[]): Look {
  if (sources.length === 0) return { stop: EMPTY_STOP, campaign };
  const matters: readonly AttentionMatter[] = gatherMatters(campaign, campaign.calendar, sources);
  const news = withoutNoticed(withoutDeferred(matters, campaign.deferrals, campaign.calendar), campaign.noticed);
  const stop = composeAttentionStop(news);
  return { stop, campaign: withNotices(campaign, reviseNotices(campaign.noticed, matters, stop.presented)) };
}

const FINDING_WORD: Readonly<Record<"affirmative" | "negative", string>> = { affirmative: "made the finding", negative: "found no case" };

/**
 * The answers the President was waiting on that came back during this run: an
 * investigation's finding, the Senate's vote on a treaty, Congress's on a use of
 * force. Each stops the run once, the day it lands, the way an operation's
 * first report does. They are read off the change rather than raised as
 * standing matters, because a standing matter would go on holding the week on
 * news there is nothing left to answer.
 */
function answersReturned(before: Campaign, now: Campaign): readonly AttentionMatter[] {
  const findings = Object.values(now.trade.findings ?? {})
    .filter((finding) => finding.outcome && !before.trade.findings?.[finding.id]?.outcome)
    .map((finding): AttentionMatter => {
      const law = TARIFF_STATUTES[finding.statute];
      const by = law.investigation?.by ?? "The agency";
      return {
        id: finding.id, source: "investigation", urgency: "soft", subject: finding.id, date: now.calendar,
        title: `${law.name} finding`,
        reason: `${by.charAt(0).toUpperCase()}${by.slice(1)} ${FINDING_WORD[finding.outcome!]} on ${finding.partner ? now.nations[finding.partner]?.base.identity.name ?? finding.partner : (tradeSector(finding.sector!)?.name ?? finding.sector!).toLowerCase()}.`,
      };
    });
  const votes = Object.values(now.issuedActs ?? {})
    .filter((act) => (act.kind === "treaty" || act.kind === "authorization") && act.outcome && !before.issuedActs?.[act.id]?.outcome)
    .map((act): AttentionMatter => {
      const treaty = act.kind === "treaty";
      const title = act.kind === "treaty" || act.kind === "authorization" ? act.title : "";
      return {
        id: treaty ? `issued-treaty:${act.id}` : `issued-aumf:${act.id}`, source: "consequence-return", urgency: "soft", subject: act.id, date: now.calendar,
        title: `${treaty ? "The Senate" : "Congress"} voted on ${title}`,
        reason: act.outcome!.account,
      };
    });
  return [...findings, ...votes];
}

function ended(campaign: Campaign): boolean {
  return campaignIsOver(campaign);
}

function arrivedOnFederalElection(campaign: Campaign): boolean {
  const { year } = campaign.calendar;
  if (!isPresidentialElectionYear(year) && !isMidtermYear(year)) return false;
  return isSameDate(campaign.calendar, federalElectionDay(year));
}

/**
 * Runs the world forward until it needs the President, the horizon runs out, or
 * the presidency ends.
 *
 * The look happens BEFORE the first tick as well as after each one: a president
 * returning to a desk that already has a bill on it should not have to spend a
 * week of their term to be told so.
 */
export function advanceUntilAttention(campaign: Campaign, options: AdvanceOptions): AdvanceResult {
  const sources = options.matterSources ?? [];
  const horizonDays = options.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const startDate = campaign.calendar;
  const startTurn = campaign.turn;
  const deadline = addDays(startDate, horizonDays);

  function result(state: Campaign, stop: AttentionStop, stopReason: StopReason): AdvanceResult {
    return {
      campaign: state,
      elapsedDays: daysBetween(startDate, state.calendar),
      turnsRun: state.turn - startTurn,
      // Everything filed during the call, not everything filed under a later
      // turn: a one-day step files press outcomes under the turn it started in.
      ambientEvents: state.feed.slice(campaign.feed.length),
      stop,
      stopReason,
    };
  }

  if (ended(campaign)) return result(campaign, EMPTY_STOP, "ended");

  const opening = lookForMatters(campaign, sources);
  if (stopIsWarranted(opening.stop)) return result(opening.campaign, opening.stop, "attention");

  let working = withPrunedDeferrals(opening.campaign.foundingDate ? opening.campaign : { ...opening.campaign, foundingDate: campaignFoundingDate(opening.campaign) });
  let latest = opening.stop;
  while (daysBetween(working.calendar, deadline) >= 1) {
    working = settleHeldDocket(withPrunedDeferrals(advanceOneDay(withDueCaseDefaults(working), options.phases)), options);
    if (ended(working)) return result(working, EMPTY_STOP, "ended");
    if (arrivedOnFederalElection(working)) return result(working, latest, "election");
    const answers = Object.values(working.issuedActs ?? {}).filter((act) => act.kind === "instrument" && act.request.actor === working.founding.nation && act.supportRequests?.some((response, index) => response.status !== "pending" && campaign.issuedActs?.[act.id]?.kind === "instrument" && (campaign.issuedActs[act.id] as import("./state.js").IssuedInstrumentAct).supportRequests?.[index]?.status === "pending"));
    if (answers.length) return result(working, composeAttentionStop(answers.map((act) => ({
      id: `support:${act.id}`, source: "consequence-return" as const, urgency: "soft" as const,
      subject: act.id, title: act.kind === "instrument" ? `Partner responses · ${act.title}` : "Partner responses",
      reason: act.kind === "instrument" ? act.supportRequests!.filter((response) => response.status !== "pending").map((response) => `${response.name}: ${response.status}. ${response.reason}`).join(" ") : "Partner responses arrived.", date: working.calendar,
    }))), "attention");
    const reports = Object.values(working.issuedActs ?? {}).filter((act) => act.kind === "instrument" && act.request.actor === working.founding.nation && act.outcome && !campaign.issuedActs?.[act.id]?.outcome);
    if (reports.length) return result(working, composeAttentionStop(reports.map((act) => ({
      id: act.id, source: "consequence-return" as const, urgency: "soft" as const,
      subject: act.id, title: act.kind === "instrument" ? act.title : "Operation report",
      reason: act.outcome!.account, date: working.calendar,
    }))), "attention");
    const answered = answersReturned(campaign, working);
    if (answered.length) return result(working, composeAttentionStop(answered), "attention");
    const look = lookForMatters(working, sources);
    working = look.campaign;
    latest = look.stop;
    if (stopIsWarranted(latest)) return result(working, latest, "attention");
  }

  return result(working, latest, "horizon");
}
