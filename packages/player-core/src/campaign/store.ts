import {
  advanceUntilAttention,
  apply,
  campaignFoundingDate,
  campaignTurnPhases,
  deferUntil,
  isDeferred,
  selectEnding,
  type AttentionStop,
  type Campaign,
  type CampaignEnding,
  type Effect,
  type EffectPacket,
  type FeedItem,
  type MatterSource,
  type StopReason,
  type TurnPhases,
} from "@admin/engine";
import type { Charter } from "@admin/world";
import { charterOf } from "./founding-options";
import { stopBriefOf, type StopBrief } from "./stop-brief";

/** The sitting as the store wrote it; anything else on the key is dropped rather than shown. */
function isStopBrief(value: unknown): value is StopBrief {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StopBrief>;
  return typeof candidate.fromTurn === "number" && typeof candidate.toTurn === "number" && typeof candidate.stop === "object" && Array.isArray(candidate.ambient) && typeof candidate.before === "object" && typeof candidate.after === "object";
}
import { inactionPacket, scenarioOccurrenceKey } from "@admin/content";
import { withHeldRemoval } from "../conversation/docket-removal";
import { scenarioPutOffEffects } from "../conversation/scenario-dispositions";
import { chargedThisWeek, docketSilenced, scenarioLapseSource } from "../conversation/lapse-source";
import { scenarioStagingSource } from "../conversation/staging-source";
import { pendingConversations, scenarioMatterId, scenarioMatterSource, seatScenarioCases } from "../conversation/scripts";
import { seatFamilyCases } from "../desk/family-cases";
import type { AttentionPolicySettings } from "../desk/attention";
import { handOff } from "./hand-off";
import type { SaveStore } from "../persistence/save-store";
import { isQuotaExhausted, playerFacingStorageFailure } from "../persistence/storage-failure";

// The shell owns no game rules. Every transition here delegates to the engine
// and then publishes the new immutable campaign; screens read it through
// selectors, so there is nowhere for a screen to keep its own truth.

export type CampaignState =
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly campaign: Campaign;
      /**
       * What the world raised the last time it was run forward, and why it
       * stopped. Session-only, never written to a save: a stop is a fact about
       * this sitting, not about the country.
       */
      readonly stop?: AttentionStop;
      readonly stopReason?: StopReason;
      readonly ambient?: readonly FeedItem[];
      /**
       * The same run as one record: the span it spent, the readings it crossed,
       * the wire it filed and the stop it ended on. Produced by
       * `continueUntilAttention` and by nothing else — `restore` does not
       * produce one, because restoring does not run the world.
       */
      readonly brief?: StopBrief;
      /**
       * Session-only: set once the brief has actually been read. The Desk routes
       * to it while one is pending and unacknowledged; without this flag every
       * return to the Desk routed unconditionally, because the brief itself is
       * not cleared until the world runs again (it stays revisitable). Never
       * written to a save — an acknowledgment is a fact about this session's
       * screen, not about the campaign.
       */
      readonly briefAcknowledged?: boolean;
    }
  | { readonly status: "failed"; readonly message: string };

/**
 * What a committed act hands back: which ledger events it wrote, and whether
 * the device kept them.
 *
 * The two answers are separate because they fail separately. By the time a
 * save is attempted the act has already applied and been published — the
 * country has moved — so a refused write is not a refused act, and rejecting
 * would tell the caller an act that happened did not. `persisted: false` says
 * the act stands in this session and is not yet durable; the save store's own
 * status says the same thing to the shell, and `retrySave` is the way back.
 */
export type ActReceipt = {
  /** The ledger events this act appended, oldest first. Empty when it wrote none. */
  readonly eventIds: readonly string[];
  readonly persisted: boolean;
  /** A sentence a player can read, present only when `persisted` is false. */
  readonly saveError?: string;
};

export type CommitOptions = {
  /**
   * The campaign the packet was computed against.
   *
   * A packet is priced against one state. Applied to a later one — a second
   * press on the same button, or a preview the week has moved under — it
   * charges costs nobody quoted and can land an act twice. When this is given
   * and is no longer the campaign in play, the packet is refused and nothing
   * applies.
   */
  readonly basis?: Campaign;
};

/** The sentence a stale packet is refused with; `isStaleAct` matches it. */
export const STALE_ACT_MESSAGE =
  "Things changed while you were deciding, so nothing went through. Take another look when you're ready.";

/** True when a refusal is the stale-basis guard rather than the engine or the charter. */
export function isStaleAct(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return text === STALE_ACT_MESSAGE;
}

export type CampaignStore = {
  getState(): CampaignState;
  subscribe(listener: () => void): () => void;
  /** Read the local slot; resolves to the state the shell should render. */
  restore(): Promise<CampaignState>;
  begin(campaign: Campaign): Promise<void>;
  /**
   * Run a packet the engine produced — a conversation reply, an action — through
   * the one mutator. Rejects only when nothing applied (no campaign in play, or
   * a stale `basis`); a refused save resolves with `persisted: false`.
   */
  commit(packet: EffectPacket, options?: CommitOptions): Promise<ActReceipt>;
  /**
   * Run a run of packets that are one act by the player, and save once.
   *
   * Committing them one at a time is correct on the ledger — each is its own
   * event and each must apply to the state the one before it produced — and
   * wrong on the disk: `commit` writes the whole campaign after every packet,
   * so sending forty-four names to the Senate wrote a multi-megabyte save
   * forty-four times to record one decision. Forty-three of those writes are
   * pure cost, and on a phone they are the difference between an action and a
   * freeze.
   *
   * `onProgress` is called with how many have applied, so a caller can report
   * real sequence position rather than a spinner. The packets still apply in
   * the order given, because each was computed against the state its
   * predecessor produced.
   */
  commitAll(
    packets: readonly EffectPacket[],
    onProgress?: (applied: number) => void,
    options?: CommitOptions,
  ): Promise<ActReceipt>;
  /**
   * Runs the world forward until something needs the President, the horizon
   * runs out, or the presidency ends — the one advance the balance harness also
   * drives, so the game measured and the game played are the same sequence.
   *
   * `horizonDays` is days, never turns: the caller says how much of the
   * presidency it is willing to spend, and the engine decides how many ticks
   * that is.
   */
  continueUntilAttention(horizonDays?: number, options?: CommitOptions): Promise<ActReceipt>;
  /**
   * Hands every waiting matter a chief of staff may take to the Chief of Staff,
   * then runs the world as Continue does.
   *
   * Rows are put off and decisions left unanswered at the price each already
   * carries, one player act apiece. A matter that must come from the President
   * stays on the desk, and while one does the world does not run: the hand-off
   * is applied and saved, and Continue stays held on what is left.
   */
  handOffAndContinue(horizonDays?: number, options?: CommitOptions & { readonly settings?: AttentionPolicySettings }): Promise<ActReceipt>;
  /**
   * One office day, whether or not the desk already has something on it.
   *
   * The clock looks after the day. Passing the matter sources through would
   * stop on the opening look and the date would never move.
   *
   * `persist` defaults to true, so a paused single step still saves. The running
   * clock passes `false` for its tick and run-to-next-pause steps: a save on
   * every one of those encoded a multi-megabyte campaign several times a second
   * while running. The runner takes its own safety and exit saves instead.
   */
  stepClockDay(options?: { readonly persist?: boolean }): Promise<ActReceipt>;
  /**
   * Write the campaign in play now, exactly as it stands, without advancing it.
   *
   * The running clock's safety and exit saves route through here rather than
   * `retrySave`: they are a deliberate snapshot of a campaign that already
   * applied, not a recovery from a refused write, and overloading `retrySave`
   * would blur the two.
   */
  saveCampaign(): Promise<ActReceipt>;
  /**
   * Write the campaign in play again, exactly as it stands.
   *
   * The way back from a refused save. It applies nothing — the act that failed
   * to save has already happened, and replaying it would charge the country
   * twice — so it is safe to press as often as the device keeps refusing.
   */
  retrySave(): Promise<ActReceipt>;
  /**
   * Marks the current brief as read, so the Desk stops re-routing on every
   * mount. The brief itself is untouched and stays readable until the world runs
   * again — acknowledgment silences the redirect, it does not consume the record.
   */
  acknowledgeBrief(): void;
  /** End the campaign in play: its slot is deleted and the shell re-reads the vault. */
  abandon(): Promise<void>;
  /**
   * Delete one stored campaign by id, whether or not it is the one in play.
   *
   * Screens route deletion through here rather than calling `saves.delete`
   * directly: the save store promotes another slot to active when it removes
   * the active one, so a delete that only touched persistence left the shell
   * rendering a campaign that no longer exists.
   */
  discard(id: string): Promise<void>;
  /** Access to the save store for campaign library operations. */
  readonly saves: SaveStore;
};

export type CampaignStoreOptions = {
  readonly saves: SaveStore;
  /**
   * The turn's phase sequence, keyed on the campaign's charter. Defaults to the
   * engine's own list. The shell does not assemble one: a phase list written
   * here is a second copy of the rules, and the copy is what left removal
   * unrun while the balance harness measured a sequence nobody played.
   */
  readonly phases?: (charter: Charter) => TurnPhases;
  /** Called just before the first campaign is published, so cold start is stamped before anything renders it. */
  readonly onFirstPlayable?: () => void;
  /**
   * Who is asked what the President is needed for. Injected rather than
   * imported so the store owns no content: a scenario director, a deadline
   * watcher and a court are all just sources, and the store cannot tell them
   * apart. An empty list is a legitimate configuration — it means a world that
   * runs to the horizon and asks for nothing.
   */
  readonly matterSources?: readonly MatterSource<Campaign>[];
  /**
   * Consulted when the vault turns out to be empty. Returning a campaign opens
   * the app straight onto it instead of onto the threshold; returning `null`
   * leaves the vault empty, which is what every shipped build does.
   *
   * This is the local development seed and nothing else. It is deliberately an
   * injected function rather than an environment read inside the store: the
   * store owns no configuration, and a test must be able to prove both answers
   * without an environment to set.
   */
  readonly seedWhenEmpty?: () => Campaign | null;
};

/**
 * Why the world will not run another week, in the words of the ending that
 * stopped it.
 *
 * One sentence per ending rather than one for all three: "the campaign is over"
 * is true of a removal, a defeat and a second term served out, and it is the
 * least a player is owed about which of them happened to them.
 */
const ENDED_REFUSALS: Readonly<Record<Exclude<CampaignEnding, "in-office">, string>> = {
  removed: "You were removed from office. Your time as President is over.",
  defeated: "You lost the election. Your time as President is over.",
  "term-limited": "You served both of your terms. Your time as President is over.",
};

/**
 * The ledger events one transition appended. `apply()` grows the ledger by one
 * record per packet and stamps each with its causal id, so the new tail is
 * exactly what the act wrote.
 */
function eventIdsBetween(before: Campaign, after: Campaign): readonly string[] {
  return after.ledger.slice(before.ledger.length).flatMap((entry) => (entry.causal ? [entry.causal.eventId] : []));
}

/** Outer restore deadline — must exceed IndexedDB open demotion. */
const RESTORE_BUDGET_MS = 10_000;

function withBudget<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Restoring the campaign took too long on this device."));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * The week's staged documents, put off to the next time they may interrupt.
 *
 * Silence is this week's answer to them, and the deferral is what makes it the
 * answer. Without it the advance's pre-tick look found the same staged document
 * still on the desk and stopped at day zero: every press of Continue charged
 * the same silence again and the week never moved. The engine sets the date,
 * a week for a hard matter and a fortnight for a soft one, as it does for a
 * matter the President puts off by hand.
 */
function silencePutOff(campaign: Campaign): ReadonlyMap<string, readonly Effect[]> {
  const foundingDate = campaignFoundingDate(campaign);
  const casts = new Map(pendingConversations(campaign).map((cast) => [scenarioMatterId(scenarioOccurrenceKey(cast)), cast]));
  return new Map(
    scenarioMatterSource(campaign, campaign.calendar)
      .filter((matter) => matter.urgency !== "ambient" && !isDeferred(campaign.deferrals, matter.id, campaign.calendar))
      .map((matter): [string, readonly Effect[]] => {
        const until = deferUntil(matter, campaign.calendar, foundingDate);
        // The same silence, said to the case as well: a scenario matter and its
        // case are one document, and a deferral only one of them records leaves
        // the other believing it is still today's work.
        const cast = casts.get(matter.id);
        const onCases = cast ? scenarioPutOffEffects(campaign, cast, until) : [];
        return [matter.id, [{ kind: "attention", defer: { [matter.id]: until } }, ...onCases]];
      }),
  );
}

/**
 * Prices the documents already waiting, then puts off any document that
 * pricing itself brought onto the desk.
 *
 * The charge can change what the director stages. The opening look runs on
 * that later desk. A document that was not there when the charge was computed
 * is not in the put-off, and the look then stops on it before the week moves.
 */
function priceWalkedPast(campaign: Campaign): Campaign {
  const unanswered = pendingConversations(campaign).filter(
    (cast) =>
      cast.orderCase?.posture !== "adverse-lower" &&
      !isDeferred(campaign.deferrals, scenarioMatterId(scenarioOccurrenceKey(cast)), campaign.calendar) &&
      !chargedThisWeek(campaign, scenarioOccurrenceKey(cast)) &&
      // A document the held docket already charged at its close is not billed a
      // second time here. Only the charge is skipped — the deferral below still
      // runs, or a hard document left pending would stall the week at day zero.
      !docketSilenced(campaign, scenarioOccurrenceKey(cast)),
  );
  const putOff = silencePutOff(campaign);
  const priced = unanswered.reduce((opening, cast) => {
    const packet = inactionPacket(opening, cast);
    const effects = [...packet.effects, ...(putOff.get(scenarioMatterId(scenarioOccurrenceKey(cast))) ?? [])];
    return apply(opening, { ...packet, effects });
  }, campaign);
  return holdSwappedPicks(priced);
}

function holdSwappedPicks(campaign: Campaign): Campaign {
  const effects = [...silencePutOff(campaign).values()].flat();
  if (effects.length === 0) return campaign;
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    background: true,
    narration: { summary: "A document that came up with the silence waits for its next call." },
    effects,
  });
}

export function createCampaignStore({
  saves,
  phases = (charter) => campaignTurnPhases(charter, true),
  onFirstPlayable,
  matterSources = [],
  seedWhenEmpty,
}: CampaignStoreOptions): CampaignStore {
  let state: CampaignState = { status: "loading" };
  const listeners = new Set<() => void>();

  let announcedPlayable = false;

  function publish(next: CampaignState): CampaignState {
    if (next.status === "ready" && !announcedPlayable) {
      announcedPlayable = true;
      onFirstPlayable?.();
    }
    state = next;
    for (const listener of listeners) listener();
    return state;
  }

  function requireCampaign(basis?: Campaign): Campaign {
    if (state.status !== "ready") {
      throw new Error(`No campaign is in play: the store is "${state.status}".`);
    }
    if (basis !== undefined && basis !== state.campaign) {
      throw new Error(STALE_ACT_MESSAGE);
    }
    return state.campaign;
  }

  function carriedStop(): Pick<Extract<CampaignState, { status: "ready" }>, "stop" | "stopReason" | "ambient" | "brief" | "briefAcknowledged"> {
    // Answering a document is not running the world: the stop stays
    // revisitable across it, carried forward rather than dropped the moment
    // any packet applies.
    return state.status === "ready"
      ? {
          stop: state.stop,
          stopReason: state.stopReason,
          ambient: state.ambient,
          brief: state.brief,
          briefAcknowledged: state.briefAcknowledged,
        }
      : {};
  }

  // One set of day sources for both ways time is spent, so a press of Continue
  // and a running clock admit and lapse the same documents on the same day.
  function advanceOptions(campaign: Campaign) {
    return {
      phases: phases(charterOf(campaign)),
      stagingSources: [scenarioStagingSource()],
      lapseSources: [scenarioLapseSource()],
    };
  }

  function refuseEnded(campaign: Campaign): void {
    const ending = selectEnding(campaign);
    if (ending !== "in-office") throw new Error(ENDED_REFUSALS[ending]);
  }

  async function runFrom(before: Campaign, start: Campaign, horizonDays: number | undefined): Promise<ActReceipt> {
    // The week's decision is frozen before it is priced, so the document the
    // silence is charged against is the one the desk will still be holding
    // next week rather than whatever the next draw happens to produce.
    const opening = priceWalkedPast(seatFamilyCases(seatScenarioCases(start)));
    const run = advanceUntilAttention(opening, {
      ...advanceOptions(opening),
      matterSources,
      ...(horizonDays === undefined ? {} : { horizonDays }),
    });
    // What the run brought onto the desk is on the case registry before it is
    // saved, and what the run settled is closed there.
    const result = { ...run, campaign: seatFamilyCases(run.campaign) };
    const brief = stopBriefOf(before, result);
    publish({
      status: "ready",
      campaign: result.campaign,
      stop: result.stop,
      stopReason: result.stopReason,
      ambient: result.ambientEvents,
      brief,
    });
    const receipt = await persist(result.campaign, eventIdsBetween(before, start));
    // The sitting is written only once the campaign it belongs to is on the
    // device; a brief for a run the device never kept would describe a
    // world the reload does not hold.
    if (receipt.persisted) await saves.writeSitting(brief);
    return receipt;
  }

  async function persist(campaign: Campaign, eventIds: readonly string[]): Promise<ActReceipt> {
    try {
      await saves.write(campaign);
      return { eventIds, persisted: true };
    } catch (err) {
      return { eventIds, persisted: false, saveError: playerFacingStorageFailure(err) };
    }
  }

  async function restore(): Promise<CampaignState> {
    try {
      // Phone web has hung forever on a stuck IndexedDB open; the vault layer
      // demotes after a short open timeout, and this outer budget is the last
      // line so RESTORING CAMPAIGN cannot spin past a playable deadline.
      const campaign = await withBudget(saves.read(), RESTORE_BUDGET_MS);
      if (!campaign) {
        const seeded = seedWhenEmpty?.() ?? null;
        if (!seeded) return publish({ status: "empty" });
        // Prefer a durable seed so reload keeps the session. When the vault
        // cannot hold it (phone web demoted off IndexedDB onto a ~5MB
        // localStorage quota facing a ~6MB campaign), still open Desk with the
        // seeded campaign in memory — RESTORE FAILED is worse than a session
        // that only lasts until refresh.
        try {
          await saves.write(seeded);
        } catch (err) {
          if (!isQuotaExhausted(err)) throw err;
        }
        return publish({ status: "ready", campaign: seeded });
      }

      // Restoring advances NOTHING. This used to read the wall clock, convert
      // elapsed hours into drift steps and run them — which moved
      // `campaign.calendar`, so four days away spent fifty-six days of a fixed
      // four-year term while running three of the thirty-one phases. A
      // presidency could be run out by closing a laptop.
      //
      // Real time is no longer a currency the world accepts. The only thing
      // that buys world time is a player present and pressing Continue, which
      // is why restoring a save advances nothing: there is no banked absence to
      // spend, because absence accrues none.
      //
      // What the world did the last time it ran is still readable after a
      // reload: the sitting comes back with the campaign, already acknowledged
      // so the Desk does not route to it again.
      const sitting = await saves.readSitting();
      const brief = isStopBrief(sitting) ? sitting : undefined;
      return publish({ status: "ready", campaign, ...(brief ? { brief, briefAcknowledged: true } : {}) });
    } catch (err) {
      return publish({ status: "failed", message: playerFacingStorageFailure(err) });
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    restore,
    async begin(campaign) {
      // Founding always opens a *new* slot. Routed through `saves.write` this
      // wrote over whichever campaign the manifest had marked active, so
      // taking office beside a save the build could not read destroyed that
      // save — the one outcome a player who asked to form a new
      // administration never asked for. `create` appends and promotes, so the
      // unreadable campaign stays listed and repairable in Administrations.
      //
      // The write lands before the campaign is published: publishing first
      // put the app into a term the device had not accepted yet, so a refused
      // write left the oath printing a failure while every other screen had
      // already moved in. Nothing is in play until something is stored.
      await saves.create(campaign);
      publish({ status: "ready", campaign });
    },
    async commit(packet, options) {
      const current = requireCampaign(options?.basis);
      // An act can settle a family's matter (a signature, a withdrawal); the
      // case closes in the same save rather than at the next run.
      const acted = apply(current, withHeldRemoval(current, packet));
      const next = seatFamilyCases(acted);
      publish({ status: "ready", campaign: next, ...carriedStop() });
      return persist(next, eventIdsBetween(current, acted));
    },
    async commitAll(packets, onProgress, options) {
      const current = requireCampaign(options?.basis);
      if (packets.length === 0) return { eventIds: [], persisted: true };
      let next = current;
      for (let index = 0; index < packets.length; index += 1) {
        next = apply(next, withHeldRemoval(next, packets[index]!));
        onProgress?.(index + 1);
      }
      const seated = seatFamilyCases(next);
      publish({ status: "ready", campaign: seated, ...carriedStop() });
      return persist(seated, eventIdsBetween(current, next));
    },
    async retrySave() {
      const campaign = requireCampaign();
      return persist(campaign, []);
    },
    acknowledgeBrief() {
      if (state.status !== "ready" || !state.brief || state.briefAcknowledged) return;
      publish({ ...state, briefAcknowledged: true });
    },
    async continueUntilAttention(horizonDays, options) {
      const campaign = requireCampaign(options?.basis);
      // A presidency that has ended has no next week, whichever way it ended.
      // Refusing here rather than letting the run start is what makes an ending
      // an ending: every phase downstream would otherwise keep simulating a
      // government that no longer holds office, and it did — a president
      // defeated at the polls went on governing for as long as they kept
      // pressing Continue, because the only thing this refused on was removal.
      refuseEnded(campaign);
      // Silence is priced before the world runs, not after. A week's staged
      // documents that the President walked past are the record of a decision
      // not taken, and until this they cost nothing at all: measured over
      // 208-week terms, never answering anything ended with the BEST approval
      // and the LOWEST removal pressure of any policy, which made refusing to
      // govern the strongest way to play. Each unanswered document now charges
      // competence and one class-routed judgment, debits stability, and files a
      // `drift` wire item the country can read. It costs no treasury by
      // construction — money is not what refusing to govern should cost.
      // A document already put off was priced when it was: charging it again on
      // a second press in the same week would bill one silence twice. The same
      // is true of a one-day step: `inactionPacket` stamps a turn-scoped flag
      // marker on every document it charges, and a document that already
      // carries this turn's marker is skipped here too — without this, seven
      // one-day presses inside one quiet week charged the same document up to
      // seven times, because a document with no deadline is never deferred and
      // so was never excluded from the loop by the check above alone.
      return runFrom(campaign, campaign, horizonDays);
    },
    async handOffAndContinue(horizonDays, options) {
      const campaign = requireCampaign(options?.basis);
      refuseEnded(campaign);
      const handed = handOff(campaign, options?.settings);
      if (handed.kept.length === 0) return runFrom(campaign, handed.campaign, horizonDays);
      publish({ status: "ready", campaign: handed.campaign, ...carriedStop() });
      return persist(handed.campaign, eventIdsBetween(campaign, handed.campaign));
    },
    async stepClockDay(options) {
      const campaign = requireCampaign();
      refuseEnded(campaign);
      const seated = seatFamilyCases(seatScenarioCases(campaign));
      const run = advanceUntilAttention(seated, { ...advanceOptions(seated), horizonDays: 1 });
      const result = { ...run, campaign: seatFamilyCases(run.campaign) };
      publish({
        status: "ready",
        campaign: result.campaign,
        stop: result.stop,
        stopReason: result.stopReason,
        ambient: result.ambientEvents,
        brief: stopBriefOf(campaign, result),
      });
      // A running tick asks not to save; the day still advanced in memory, and
      // the runner is responsible for the rare safety and exit saves.
      if (options?.persist === false) return { eventIds: [], persisted: true };
      return persist(result.campaign, []);
    },
    async saveCampaign() {
      const campaign = requireCampaign();
      return persist(campaign, []);
    },
    async abandon() {
      await saves.clear();
      // Deleting the active slot promotes whatever else is stored, so the shell
      // re-reads the vault rather than assuming it is now empty: abandoning one
      // campaign of several leaves the player in the next one, not in nothing.
      await restore();
    },
    async discard(id) {
      const { activeCampaignId } = await saves.list();
      await saves.delete(id);
      if (id === activeCampaignId) await restore();
    },
    saves,
  };
}
