import { useRef, useState } from "react";
import type { Campaign } from "@admin/engine";
import { useCampaignStore } from "../device/hooks";
import { authorizeAct, type ActPlace, type Authorized, type Preparation, type ReviewSpec } from "./authorize";
import { useReviewer } from "./PresidentialReview";

export type { ActPlace, ActReview, Authorized, Preparation, Prepared, ReviewSpec } from "./authorize";

/**
 * The authorize path as a screen holds it: one act per activation, busy from
 * confirmation on (a control disabled while the review is open would drop the
 * focus the review gives back to it), and the refusal in words. The receipt
 * is returned for the screen to show in place; this never navigates.
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
    try {
      const outcome = await authorizeAct({ store, reviewer, basis, onBusy: () => setBusy(true) }, prepare, review, place);
      if (!outcome.ok) {
        setProblem(outcome.problem);
        return undefined;
      }
      return outcome.authorized;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return { busy, problem, authorize };
}

export type AuthorizeHandle = ReturnType<typeof useAuthorize>;
