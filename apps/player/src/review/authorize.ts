import type { Campaign, EffectPacket } from "@admin/engine";
import { formatDate, type CampaignStore } from "@admin/player-core";
import { refusalWords } from "../shell/advance";
import { dropPendingForecast } from "./file-forecast";
import { recordChange } from "./last-change";
import type { ReviewLine, ReviewResult, ReviewTerms, ReviewTier } from "./review-machine";

/** Said when a press arrives with no administration open: nothing could be applied. */
export const NOT_READY_WORDS = "No game is open, so nothing went through.";
/** Said when the act applied but the administration could not be read back for its receipt. */
export const UNREAD_WORDS = "It went through, but the game couldn't show you the result. Open the Record to see it.";
/** Said when an act needs a presidential review and none could be opened: nothing is applied unreviewed. */
export const NO_REVIEW_WORDS = "This needs your final review, and the review couldn't open. Nothing went through.";
/** The fallback when a write failed without a sentence of its own. */
const UNSAVED_WORDS = "The device didn't say why.";

/** One packet, or a run of packets that is one act: applied in order and saved once. */
export type Prepared = EffectPacket | readonly EffectPacket[];

/** Where the act happened, as the map frames it; given, the change is recorded for the delta lens. */
export type ActPlace = { readonly camera: string; readonly selection?: string };

/** What a press prepares: the packet, plus whatever the caller's receipt needs from the same build. */
export type Preparation = { readonly packet: Prepared };

/**
 * An act that applied. `saveError` is present exactly when the device did not
 * keep it: the act still stands and is never re-run here.
 */
export type Authorized<T extends Preparation = Preparation> = {
  readonly built: T;
  readonly before: Campaign;
  readonly after: Campaign;
  readonly date: string;
  readonly eventIds: readonly string[];
  /** The newest Record entry the act wrote. */
  readonly eventId?: string;
  readonly saveError?: string;
};

/**
 * How the act is put to the President before it is committed. Title and
 * lines are the terms the screen already showed, never what `prepare` built:
 * a built act can carry its outcome, and showing that before the
 * confirmation would let the President see the result and walk away free.
 */
export type ReviewSpec = {
  readonly tier: ReviewTier;
  readonly title: string;
  readonly lines?: readonly ReviewLine[];
  /** The final control's words; "Confirm" when absent. */
  readonly verb?: string;
  readonly danger?: boolean;
};

/** The ceremony a wrapper's caller chooses for one act; a wrapper that knows the act's terms may supply its title and lines. */
export type ActReview = Omit<ReviewSpec, "title"> & { readonly title?: string };

export type ReviewSessionPort = { readonly decision: Promise<boolean>; readonly settle: (result: ReviewResult) => void };
export type ReviewerPort = { readonly open: (terms: ReviewTerms) => ReviewSessionPort };

export type AuthorizeDeps = {
  readonly store: CampaignStore;
  readonly reviewer: ReviewerPort | null;
  /** The campaign the screen priced the act on. */
  readonly basis: Campaign;
  /** Told when the commit starts, after confirmation, and never from the press. */
  readonly onBusy: () => void;
};

export type AuthorizeOutcome<T extends Preparation> = { readonly ok: true; readonly authorized: Authorized<T> } | { readonly ok: false; readonly problem: string };

const CANCELED: AuthorizeOutcome<never> = { ok: false, problem: "" };

async function apply(store: CampaignStore, basis: Campaign, prepared: Prepared) {
  return Array.isArray(prepared) ? store.commitAll(prepared as readonly EffectPacket[], undefined, { basis }) : store.commit(prepared as EffectPacket, { basis });
}

function termsOf(review: ReviewSpec): ReviewTerms {
  return { tier: review.tier === "none" ? "confirm" : review.tier, title: review.title, lines: review.lines ?? [], verb: review.verb ?? "Confirm", danger: review.danger === true };
}

/** Commits a confirmed act against its basis and reads the result back, settling the review with what actually happened. */
async function commitConfirmed<T extends Preparation>(deps: AuthorizeDeps, built: T, session: ReviewSessionPort | undefined, place: ActPlace | ((built: T) => ActPlace) | undefined): Promise<AuthorizeOutcome<T>> {
  const { store, basis } = deps;
  const receipt = await apply(store, basis, built.packet);
  const after = store.getState();
  if (after.status !== "ready") {
    session?.settle({ kind: "unread", words: UNREAD_WORDS });
    return { ok: false, problem: UNREAD_WORDS };
  }
  if (place) recordChange({ kind: "act", before: basis, after: after.campaign, ...(typeof place === "function" ? place(built) : place), eventIds: receipt.eventIds });
  const eventId = receipt.eventIds.at(-1);
  const date = formatDate(after.campaign.calendar);
  const saveError = receipt.persisted ? undefined : (receipt.saveError ?? UNSAVED_WORDS);
  session?.settle({ kind: "applied", date, ...(eventId ? { eventId } : {}), ...(saveError ? { saveError } : {}) });
  return { ok: true, authorized: { built, before: basis, after: after.campaign, date, eventIds: receipt.eventIds, ...(eventId ? { eventId } : {}), ...(saveError ? { saveError } : {}) } };
}

/**
 * The one authorization path. It prepares the act at press time, so an act
 * the engine refuses is said in its own words before any review opens; unless
 * its tier is `none` the built act is put to the presidential review, and only
 * a confirmation commits it, against the campaign the screen priced (`basis`).
 * Terms that moved while the President read them are refused with what moved.
 * A canceled review returns `ok: false` with no problem to say.
 */
export async function authorizeAct<T extends Preparation>(deps: AuthorizeDeps, prepare: () => T, review: ReviewSpec, place?: ActPlace | ((built: T) => ActPlace)): Promise<AuthorizeOutcome<T>> {
  let session: ReviewSessionPort | undefined;
  let applied = false;
  try {
    if (deps.store.getState().status !== "ready") throw new Error(NOT_READY_WORDS);
    const built = prepare();
    if (review.tier !== "none") {
      if (!deps.reviewer) throw new Error(NO_REVIEW_WORDS);
      session = deps.reviewer.open(termsOf(review));
      if (!(await session.decision)) return CANCELED;
    }
    deps.onBusy();
    const outcome = await commitConfirmed(deps, built, session, place);
    applied = true;
    return outcome;
  } catch (cause) {
    const words = refusalWords(cause, deps.basis, deps.store.getState());
    session?.settle({ kind: "refused", words });
    return { ok: false, problem: words };
  } finally {
    // A forecast filed for this press waits for its act; with no act, it must not attach to the next one.
    if (!applied) dropPendingForecast();
  }
}
