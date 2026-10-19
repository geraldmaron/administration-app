import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from "react";
import { Button, Icon, Sheet, Stages, type Stage } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { CLOSED, reviewStep, type ReviewResult, type ReviewState, type ReviewTerms } from "./review-machine";
import "./review.css";

/** One review: whether the President confirmed it, and where the authorize path reports what then happened. */
export type ReviewSession = {
  readonly decision: Promise<boolean>;
  readonly settle: (result: ReviewResult) => void;
};

export type Reviewer = { readonly open: (terms: ReviewTerms) => ReviewSession };

/** Exported so a test can stand in a scripted reviewer; the app mounts it only through the provider below. */
export const ReviewerContext = createContext<Reviewer | null>(null);

/** The review the authorize path asks before it commits; null where none is mounted. */
export function useReviewer(): Reviewer | null {
  return useContext(ReviewerContext);
}

const NOT_OPENED: ReviewSession = { decision: Promise.resolve(false), settle: () => undefined };

/** The one presidential review: mounted once in the frame, opened by the authorize path. */
export function PresidentialReviewProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(reviewStep, CLOSED);
  const phase = useRef(state.phase);
  phase.current = state.phase;
  const answer = useRef<((confirmed: boolean) => void) | null>(null);

  const reply = useCallback((confirmed: boolean) => {
    answer.current?.(confirmed);
    answer.current = null;
  }, []);

  const open = useCallback(
    (terms: ReviewTerms): ReviewSession => {
      // One review at a time; the authorize path's own single-flight guard means this only meets a stray second press.
      if (phase.current !== "closed") return NOT_OPENED;
      phase.current = "ready";
      const decision = new Promise<boolean>((resolve) => (answer.current = resolve));
      dispatch({ type: "open", terms });
      return { decision, settle: (result) => dispatch({ type: "settle", result }) };
    },
    [],
  );

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
      <Sheet
        open={state.phase !== "closed"}
        onClose={close}
        backdropDismiss={false}
        className="review"
        title={state.phase === "closed" ? "" : state.terms.title}
        lead={state.phase === "closed" ? undefined : leadOf(state)}
        foot={<Foot state={state} onConfirm={confirm} onClose={close} />}
      >
        {state.phase === "closed" || !hasBody(state) ? null : <Body state={state} />}
      </Sheet>
    </ReviewerContext.Provider>
  );
}

function leadOf(state: Exclude<ReviewState, { phase: "closed" }>): string {
  if (state.phase === "result") return state.result.kind === "refused" ? "It was not done." : state.result.kind === "unread" ? "It was applied." : "It is done.";
  if (state.phase === "resolving") return "Confirmed. It is being applied.";
  return state.terms.tier === "full" ? "Presidential review. Nothing is done until you confirm." : "Confirm this act. Nothing is done until you do.";
}

/** A short confirmation with no terms is its title and its two controls; an empty body would only be a gap. */
function hasBody(state: Exclude<ReviewState, { phase: "closed" }>): boolean {
  return state.terms.tier === "full" || state.terms.lines.length > 0 || state.phase === "resolving" || state.phase === "result";
}

function Body({ state }: { readonly state: Exclude<ReviewState, { phase: "closed" }> }) {
  const terms = state.terms;
  return (
    <div className="review__body">
      {terms.lines.length > 0 ? (
        <dl className="review__terms">
          {terms.lines.map((line) => (
            <div key={line.label} className="review__term">
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {state.phase === "ready" && terms.tier === "full" ? <div className="review__authority"><Icon name="sign" size={24} /><div><strong>Presidential authorization</strong><p>{terms.danger ? "This action is consequential. Confirm only after reviewing its terms and downside assessment." : "Your confirmation authorizes this action under the terms above."}</p></div></div> : null}
      {state.phase === "resolving" || state.phase === "result" ? <Progress state={state} /> : null}
    </div>
  );
}

/** What actually happened after confirmation: each stage is reached only when the commit reports it. */
function Progress({ state }: { readonly state: Extract<ReviewState, { phase: "resolving" | "result" }> }) {
  const result = state.phase === "result" ? state.result : undefined;
  const applied: Stage["state"] = !result ? "now" : result.kind === "refused" ? "ended" : "done";
  const saved: Stage["state"] = result?.kind !== "applied" ? "ahead" : result.saveError ? "ended" : "done";
  const stages: readonly Stage[] = [
    { id: "reviewed", label: "Reviewed", state: "done" },
    { id: "confirmed", label: "Confirmed", state: "done" },
    { id: "applied", label: "Applied", state: applied, ...(result?.kind === "applied" ? { note: result.date } : {}) },
    { id: "saved", label: "Saved on this device", state: saved },
  ];
  return (
    <div className="review__progress" aria-live="polite">
      <Stages label="Where the act stands" stages={stages} />
      {result?.kind === "refused" ? <p className="review__refused">{result.words}</p> : null}
      {result?.kind === "unread" ? <p className="review__unsaved">{result.words}</p> : null}
      {result?.kind === "applied" && result.saveError ? (
        <p className="review__unsaved">Applied, but not saved. Reason: {result.saveError} Use Retry save in the top bar. The act is not run again.</p>
      ) : null}
    </div>
  );
}

function Foot({ state, onConfirm, onClose }: { readonly state: ReviewState; readonly onConfirm: () => void; readonly onClose: () => void }) {
  if (state.phase === "closed") return null;
  if (state.phase === "ready") {
    return (
      <>
        {/* The dialog opens with focus on its close control, never here: an Enter carried over from the press that opened it cannot confirm. */}
        <Button kind="secondary" onClick={onClose}>
          Return to the terms
        </Button>
        <Button kind={state.terms.danger ? "danger" : "commit"} disabled={state.phase !== "ready"} onClick={onConfirm}>
          {state.terms.verb}
        </Button>
      </>
    );
  }
  const eventId = state.phase === "result" && state.result.kind === "applied" ? state.result.eventId : undefined;
  return (
    <>
      {eventId ? (
        <Door href={`/record/event/${encodeURIComponent(eventId)}`} className="ui-button ui-button--secondary" onClick={onClose}>
          Open it on the Record
        </Door>
      ) : null}
      <Button kind="primary" onClick={onClose}>
        {state.phase === "resolving" ? "Hide this while it finishes" : "Close"}
      </Button>
    </>
  );
}
