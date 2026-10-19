import { useState } from "react";
import type { Campaign, EffectPacket } from "@admin/engine";
import type { ReceiptOutcome } from "@admin/ui-web";
import { useAuthorize, type ActReview } from "../../app/use-authorize";

/** What an act on the country did, kept beside its receipt so it is said from what the commit returned. */
export type Committed = {
  readonly title: string;
  readonly date: string;
  readonly before: Campaign;
  readonly after: Campaign;
  /** The Record entry the act wrote. */
  readonly eventId?: string;
  readonly saveError?: string;
  /** Lines the receipt reads: what was set and what it cost, as the comparison priced them. */
  readonly lines: readonly { readonly label: string; readonly value: string }[];
  /** Absent, it was done; "refused" when the act went through and the answer was no. */
  readonly outcome?: ReceiptOutcome;
};

export type Commission = {
  readonly title: string;
  readonly lines: Committed["lines"];
  readonly outcome?: ReceiptOutcome;
  /**
   * How the act is put to the President before it is committed. The title
   * defaults to the commission's own; the receipt's lines never stand in for
   * the review's, since a receipt line may state a projected result.
   */
  readonly review: ActReview;
  /**
   * Built on the campaign the screen priced, at press time; a refusal is thrown
   * in the engine's words. A run of packets is one act, applied in order and
   * saved once.
   */
  readonly packet: () => EffectPacket | readonly EffectPacket[];
};

/**
 * One act on the country, committed against the campaign the screen priced it
 * on, so a press after time has moved is refused rather than charged at a
 * price nobody quoted. The change is recorded for the delta lens.
 */
export function useNationCommit(campaign: Campaign) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const [committed, setCommitted] = useState<Committed | undefined>();

  async function commit(commission: Commission): Promise<void> {
    const authorized = await authorize(() => ({ packet: commission.packet() }), { title: commission.title, ...commission.review }, { camera: "us" });
    if (!authorized) return;
    setCommitted({
      title: commission.title,
      date: authorized.date,
      before: authorized.before,
      after: authorized.after,
      lines: commission.lines,
      ...(commission.outcome ? { outcome: commission.outcome } : {}),
      ...(authorized.eventId ? { eventId: authorized.eventId } : {}),
      ...(authorized.saveError ? { saveError: authorized.saveError } : {}),
    });
  }

  return { busy, problem, committed, commit, dismiss: () => setCommitted(undefined) };
}

export type NationCommit = ReturnType<typeof useNationCommit>;
