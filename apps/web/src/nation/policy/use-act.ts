import { useState } from "react";
import type { Campaign, EffectPacket } from "@admin/engine";
import type { ReceiptLine, ReceiptOutcome } from "@admin/ui-web";
import { useAuthorize, type ActReview } from "../../app/use-authorize";

/** What an act built from the campaign on screen hands back to be committed and receipted. */
export type BuiltAct = {
  readonly packet: EffectPacket;
  /** The receipt's title: what was done, in the past tense. */
  readonly title: string;
  readonly lines?: readonly ReceiptLine[];
  /** Absent, it was done; "refused" when someone with the last word said no, which the receipt says rather than checks. */
  readonly outcome?: ReceiptOutcome;
  /** Where it happened, as the map frames it. */
  readonly camera: string;
};

/** A committed act, kept beside the receipt so it is said from what the commit returned. */
export type DoneAct = {
  readonly title: string;
  readonly date: string;
  readonly lines: readonly ReceiptLine[];
  readonly before: Campaign;
  readonly after: Campaign;
  readonly camera: string;
  readonly outcome?: ReceiptOutcome;
  readonly eventId?: string;
  readonly saveError?: string;
};

/**
 * Commits a domestic act against the campaign the screen priced it on
 * (`basis`), so a press on a board that has moved is refused rather than
 * charged at a price nobody quoted. Records the change for the delta lens and
 * holds the receipt until the player moves on.
 */
export function useAct(campaign: Campaign) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const [done, setDone] = useState<DoneAct | undefined>();

  async function run(build: () => BuiltAct, review: ActReview & { readonly title: string }) {
    const authorized = await authorize(build, review, (act) => ({ camera: act.camera }));
    if (!authorized) return;
    const act = authorized.built;
    setDone({
      title: act.title,
      date: authorized.date,
      lines: act.lines ?? [],
      before: authorized.before,
      after: authorized.after,
      camera: act.camera,
      ...(act.outcome ? { outcome: act.outcome } : {}),
      ...(authorized.eventId ? { eventId: authorized.eventId } : {}),
      ...(authorized.saveError ? { saveError: authorized.saveError } : {}),
    });
  }

  return { busy, problem, done, run, dismiss: () => setDone(undefined) };
}

export type ActHandle = ReturnType<typeof useAct>;
