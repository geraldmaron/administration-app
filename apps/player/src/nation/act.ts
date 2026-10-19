import { useRef, useState, type ReactNode } from "react";
import type { Campaign, EffectPacket } from "@admin/engine";
import { formatDate, type CampaignStore } from "@admin/player-core";
import { useCampaignStore } from "../device/hooks";
import { refusalWords } from "../shell/advance";
import { usePresidentialReview, type ReviewSpec } from "./presidential-review-seam";

/** What an act built from the campaign on screen hands back to be committed and receipted. */
export type BuiltAct = {
  /** One packet, or a run of packets that is one act: applied in order and saved once. */
  readonly packet: EffectPacket | readonly EffectPacket[];
  /** The receipt's title: what was done, in the past tense. */
  readonly title: string;
  readonly lines?: readonly { readonly label: string; readonly value: string }[];
  /** "refused" when the one with the last word said no, which the receipt says rather than checks. */
  readonly outcome?: "refused";
};

/** A committed act, kept beside its receipt so it is said from what the commit returned. */
export type DoneAct = {
  readonly title: string;
  readonly date: string;
  readonly lines: readonly { readonly label: string; readonly value: string }[];
  readonly before: Campaign;
  readonly after: Campaign;
  readonly outcome?: "refused";
  readonly eventId?: string;
  readonly saveError?: string;
};

export type NationAct = {
  readonly busy: boolean;
  readonly problem: string;
  readonly done: DoneAct | undefined;
  /** Builds the act at press time, puts it to the review, and commits it on confirmation against the campaign the screen priced. */
  readonly run: (build: () => BuiltAct, review: ReviewSpec) => Promise<void>;
  readonly dismiss: () => void;
  /** The review layer; a screen that takes acts renders it once. */
  readonly layer: ReactNode;
};

const NOT_READY = "No game is open right now, so nothing happened.";
const UNREAD = "It went through, but we couldn't load the game afterward. You can check the Record to see it.";

function apply(store: CampaignStore, basis: Campaign, packet: BuiltAct["packet"]) {
  return Array.isArray(packet) ? store.commitAll(packet, undefined, { basis }) : store.commit(packet as EffectPacket, { basis });
}

/**
 * The one authorization path for the Nation and Compare screens. The act is
 * built first, so one the engine refuses is said in its own words before any
 * review opens; then the President reviews its terms and confirms by name;
 * then it is committed against `basis`, so terms that moved while being read
 * are refused with what moved rather than charged at a price nobody quoted.
 */
export function useNationAct(basis: Campaign): NationAct {
  const store = useCampaignStore();
  const review = usePresidentialReview();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState<DoneAct | undefined>(undefined);

  async function run(build: () => BuiltAct, spec: ReviewSpec): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setProblem("");
    try {
      if (store.getState().status !== "ready") throw new Error(NOT_READY);
      const built = build();
      if (!(await review.open(spec))) return;
      setBusy(true);
      const receipt = await apply(store, basis, built.packet);
      const after = store.getState();
      if (after.status !== "ready") {
        setProblem(UNREAD);
        return;
      }
      const eventId = receipt.eventIds.at(-1);
      const saveError = receipt.persisted ? undefined : (receipt.saveError ?? "We don't know why.");
      setDone({
        title: built.title,
        date: formatDate(after.campaign.calendar),
        lines: built.lines ?? [],
        before: basis,
        after: after.campaign,
        ...(built.outcome ? { outcome: built.outcome } : {}),
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

  return { busy, problem, done, run, dismiss: () => setDone(undefined), layer: review.layer };
}
