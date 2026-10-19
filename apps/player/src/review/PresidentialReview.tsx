import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from "react";
import { ReviewSheet } from "@admin/ui/review";
import { CLOSED, reviewStep, type ReviewResult, type ReviewTerms } from "./review-machine";

/** One review: whether the President confirmed it, and where the authorize path reports what then happened. */
export type ReviewSession = {
  readonly decision: Promise<boolean>;
  readonly settle: (result: ReviewResult) => void;
};

export type Reviewer = { readonly open: (terms: ReviewTerms) => ReviewSession };

const ReviewerContext = createContext<Reviewer | null>(null);

/** The review the authorize path asks before it commits; null where none is mounted. */
export function useReviewer(): Reviewer | null {
  return useContext(ReviewerContext);
}

const NOT_OPENED: ReviewSession = { decision: Promise.resolve(false), settle: () => undefined };

/** The one presidential review, opened by the authorize path; mount it once in the frame. */
export function PresidentialReviewProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(reviewStep, CLOSED);
  const phase = useRef(state.phase);
  phase.current = state.phase;
  const answer = useRef<((confirmed: boolean) => void) | null>(null);

  const reply = useCallback((confirmed: boolean) => {
    answer.current?.(confirmed);
    answer.current = null;
  }, []);

  const open = useCallback((terms: ReviewTerms): ReviewSession => {
    // One review at a time; the authorize path's own single-flight guard means this only meets a stray second press.
    if (phase.current !== "closed") return NOT_OPENED;
    phase.current = "ready";
    const decision = new Promise<boolean>((resolve) => (answer.current = resolve));
    dispatch({ type: "open", terms });
    return { decision, settle: (result) => dispatch({ type: "settle", result }) };
  }, []);

  const confirm = () => {
    if (phase.current !== "ready") return;
    phase.current = "resolving";
    dispatch({ type: "confirm" });
    reply(true);
  };
  const close = () => {
    if (phase.current === "ready") {
      dispatch({ type: "cancel" });
      reply(false);
    } else dispatch({ type: "dismiss" });
  };
  const reviewer = useMemo(() => ({ open }), [open]);
  return (
    <ReviewerContext.Provider value={reviewer}>
      {children}
      <ReviewSheet
        phase={state.phase}
        terms={state.phase === "closed" ? undefined : state.terms}
        {...(state.phase === "result" ? { result: state.result } : {})}
        onConfirm={confirm}
        onClose={close}
      />
    </ReviewerContext.Provider>
  );
}

/**
 * A screen that authorizes acts is reviewed by the frame's review where one is
 * mounted, and by its own otherwise, so no act is ever committed unreviewed.
 */
export function ReviewBoundary({ children }: { readonly children: ReactNode }) {
  const outer = useReviewer();
  return outer ? <>{children}</> : <PresidentialReviewProvider>{children}</PresidentialReviewProvider>;
}
