import { useRef, useState, type ReactNode } from "react";
import type { Campaign, EffectPacket } from "@admin/engine";
import { formatDate } from "@admin/player-core";
import { useCampaignStore } from "../device/hooks";
import { refusalWords } from "../shell/advance";
import { useReviewSeat, type ReviewLine, type ReviewSpec } from "./review-seat";

export type { ReviewLine, ReviewSpec } from "./review-seat";

/** One act a screen offers: its receipt lines, its review, and the packet it commits, built at press time. */
export type Commission = {
  readonly title: string;
  readonly lines: readonly ReviewLine[];
  readonly review: ReviewSpec;
  /** A refusal is thrown in the engine's words; a run of packets is one act, applied in order and saved once. */
  readonly packet: () => EffectPacket | readonly EffectPacket[];
};

export type Committed = {
  readonly title: string;
  readonly date: string;
  readonly lines: readonly ReviewLine[];
  readonly before: Campaign;
  readonly after: Campaign;
  readonly eventId?: string;
  readonly saveError?: string;
};

export type ActCommit = {
  readonly busy: boolean;
  readonly problem: string;
  readonly committed?: Committed;
  /** Which block on the screen committed, so its receipt is drawn where the act was taken. */
  readonly by?: string;
  readonly commit: (commission: Commission, by?: string) => Promise<void>;
  readonly dismiss: () => void;
  /** The review layer; a screen renders it once. */
  readonly reviewSheet: ReactNode;
};

const UNSAVED = "this device didn't save it.";

/**
 * One commit path for every act on the Washington screens: the packet is
 * built at press time (so a refusal is said before any review opens), put to
 * the presidential review, and only on confirmation committed against the
 * campaign the screen priced, so terms that moved meanwhile are refused.
 */
export function useActCommit(basis: Campaign): ActCommit {
  const store = useCampaignStore();
  const { presentForReview, reviewSheet } = useReviewSeat();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [committed, setCommitted] = useState<Committed | undefined>(undefined);
  const [by, setBy] = useState<string | undefined>(undefined);

  async function commit(commission: Commission, block?: string): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setProblem("");
    setBy(block);
    try {
      const prepared = commission.packet();
      if (!(await presentForReview(commission.review))) return;
      setBusy(true);
      const receipt = Array.isArray(prepared) ? await store.commitAll(prepared as readonly EffectPacket[], undefined, { basis }) : await store.commit(prepared as EffectPacket, { basis });
      const after = store.getState();
      const eventId = receipt.eventIds.at(-1);
      const saveError = receipt.persisted ? undefined : (receipt.saveError ?? UNSAVED);
      setCommitted({
        title: commission.title,
        date: after.status === "ready" ? formatDate(after.campaign.calendar) : formatDate(basis.calendar),
        lines: commission.lines,
        before: basis,
        after: after.status === "ready" ? after.campaign : basis,
        ...(eventId ? { eventId } : {}),
        ...(saveError ? { saveError } : {}),
      });
    } catch (cause) {
      setProblem(refusalWords(cause, basis, store.getState()));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return { busy, problem, committed, by, commit, dismiss: () => setCommitted(undefined), reviewSheet };
}
