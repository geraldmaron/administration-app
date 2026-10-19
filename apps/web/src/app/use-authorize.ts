import { useRef, useState } from "react";
import type { Campaign, EffectPacket } from "@admin/engine";
import { formatDate, type CampaignStore } from "@admin/player-core";
import { dropPendingForecast } from "../modeling/file-forecast";
import { useReviewer, type ReviewSession } from "../review/PresidentialReview";
import type { ReviewLine, ReviewTier } from "../review/review-machine";
import { refusalWords } from "../shell/advance";
import { useCampaignStore } from "./hooks";
import { recordChange } from "./last-change";

/** Said when a press arrives with no administration open: nothing could be applied. */
export const NOT_READY_WORDS = "No administration is open, so nothing was applied.";
/** Said when the act applied but the administration could not be read back for its receipt. */
export const UNREAD_WORDS = "It was applied, but the administration could not be read afterward. Open the Record to see it.";
/** The fallback when a write failed without a sentence of its own. */
const UNSAVED_WORDS = "this device did not save it.";

/** One packet, or a run of packets that is one act: applied in order and saved once. */
export type Prepared = EffectPacket | readonly EffectPacket[];

/** Where the act happened, as the map frames it; given, the change is recorded for the delta lens. */
export type ActPlace = { readonly camera: string; readonly selection?: string };

/** What a press prepares: the packet, plus whatever the caller's receipt needs from the same build. */
export type Preparation = { readonly packet: Prepared };

/**
 * An act that applied. `saveError` is present exactly when the device did not
 * keep it: the act still stands and is never re-run here; the top bar's
 * Retry save is the way back.
 */
export type Authorized<T extends Preparation = Preparation> = {
  /** What `prepare` built, so the receipt reads the act that was committed. */
  readonly built: T;
  readonly before: Campaign;
  readonly after: Campaign;
  readonly date: string;
  readonly eventIds: readonly string[];
  /** The newest Record entry the act wrote. */
  readonly eventId?: string;
  readonly saveError?: string;
};

/** Said when an act needs a review and the frame has none mounted: nothing is applied unreviewed. */
export const NO_REVIEW_WORDS = "This act needs a presidential review, and none could be opened. Nothing was applied.";

/**
 * How the act is put to the President before it is committed. The tier is
 * required at every call site, so no act reaches the commit boundary without
 * a decision about its ceremony.
 *
 * Title and lines are the terms the screen already showed, never what
 * `prepare` built: a built act can carry its outcome (a Senate rejection, a
 * court challenge, a government's refusal), and showing that before the
 * confirmation would let the President see the result and walk away free.
 */
export type ReviewSpec = {
  readonly tier: ReviewTier;
  /** The act, as the screen offered it. */
  readonly title: string;
  readonly lines?: readonly ReviewLine[];
  /** The final control's words; "Confirm" when absent. */
  readonly verb?: string;
  /** Forceful or irreversible: the final control is drawn as danger. */
  readonly danger?: boolean;
};

/** The ceremony a wrapper's caller chooses for one act; a wrapper that knows the act's terms before it is built may supply its title and lines. */
export type ActReview = Omit<ReviewSpec, "title"> & { readonly title?: string };

async function apply(store: CampaignStore, basis: Campaign, prepared: Prepared) {
  return Array.isArray(prepared) ? store.commitAll(prepared, undefined, { basis }) : store.commit(prepared as EffectPacket, { basis });
}

/**
 * The one authorization path. Takes a single act per activation and prepares
 * its packet at press time, so an act the engine refuses is said in its own
 * words before any review opens. Unless its tier is `none`, the built act is
 * then put to the presidential review, and only a confirmation commits it,
 * against the campaign the screen priced (`basis`): terms that moved while
 * the President read them are refused with what moved, and a fresh press
 * means a fresh review. The receipt is returned for the screen to show in
 * place; this never navigates.
 */
export function useAuthorize(basis: Campaign) {
  const store = useCampaignStore();
  const reviewer = useReviewer();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function authorize<T extends Preparation>(prepare: () => T, review: ReviewSpec, place?: ActPlace | ((built: T) => ActPlace)): Promise<Authorized<T> | undefined> {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setProblem("");
    let session: ReviewSession | undefined;
    let applied = false;
    try {
      if (store.getState().status !== "ready") throw new Error(NOT_READY_WORDS);
      const built = prepare();
      if (review.tier !== "none") {
        if (!reviewer) throw new Error(NO_REVIEW_WORDS);
        session = reviewer.open({
          tier: review.tier,
          title: review.title,
          lines: review.lines ?? [],
          verb: review.verb ?? "Confirm",
          danger: review.danger === true,
        });
        if (!(await session.decision)) return undefined;
      }
      // Busy from confirmation on, not from the press: a control disabled while the review is open would drop the focus the review gives back to it.
      setBusy(true);
      const receipt = await apply(store, basis, built.packet);
      applied = true;
      const after = store.getState();
      if (after.status !== "ready") {
        setProblem(UNREAD_WORDS);
        session?.settle({ kind: "unread", words: UNREAD_WORDS });
        return undefined;
      }
      if (place) recordChange({ kind: "act", before: basis, after: after.campaign, ...(typeof place === "function" ? place(built) : place), eventIds: receipt.eventIds });
      const eventId = receipt.eventIds.at(-1);
      const date = formatDate(after.campaign.calendar);
      const saveError = receipt.persisted ? undefined : (receipt.saveError ?? UNSAVED_WORDS);
      session?.settle({ kind: "applied", date, ...(eventId ? { eventId } : {}), ...(saveError ? { saveError } : {}) });
      return {
        built,
        before: basis,
        after: after.campaign,
        date,
        eventIds: receipt.eventIds,
        ...(eventId ? { eventId } : {}),
        ...(saveError ? { saveError } : {}),
      };
    } catch (cause) {
      const words = refusalWords(cause, basis, store.getState());
      setProblem(words);
      session?.settle({ kind: "refused", words });
      return undefined;
    } finally {
      // A forecast filed for this press waits for its act; with no act, it must not attach to the next one.
      if (!applied) dropPendingForecast();
      inFlight.current = false;
      setBusy(false);
    }
  }

  return { busy, problem, authorize };
}

export type AuthorizeHandle = ReturnType<typeof useAuthorize>;
