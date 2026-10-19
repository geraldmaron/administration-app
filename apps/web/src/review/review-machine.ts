// The presidential review, as states and the moves between them. Kept free of
// React and the DOM so every rule that protects a commitment is tested here:
// only a ready review can be confirmed, nothing but the named confirm moves it
// on, and once confirmed it cannot be canceled, only watched or dismissed.

/**
 * How much ceremony an act gets. `full`: a terms review and a second,
 * named confirmation, for what cannot be taken back or carries high stakes.
 * `confirm`: a short confirmation, for routine plays. `none`: filing,
 * drafts and anything else that commits nothing the President must answer for.
 */
export type ReviewTier = "full" | "confirm" | "none";

export type ReviewLine = { readonly label: string; readonly value: string };

export type ReviewTerms = {
  readonly tier: Exclude<ReviewTier, "none">;
  /** What it will do, as the receipt will say it. */
  readonly title: string;
  readonly lines: readonly ReviewLine[];
  /** The final control's words: "Confirm and sign". */
  readonly verb: string;
  /** Forceful or irreversible: the final control is drawn as danger. */
  readonly danger: boolean;
};

export type ReviewResult =
  | { readonly kind: "applied"; readonly date: string; readonly eventId?: string; readonly saveError?: string }
  | { readonly kind: "refused"; readonly words: string }
  /** Applied, but the administration could not be read back to say how. */
  | { readonly kind: "unread"; readonly words: string };

export type ReviewState =
  | { readonly phase: "closed" }
  | { readonly phase: "ready"; readonly terms: ReviewTerms }
  | { readonly phase: "resolving"; readonly terms: ReviewTerms }
  | { readonly phase: "result"; readonly terms: ReviewTerms; readonly result: ReviewResult };

export type ReviewEvent =
  | { readonly type: "open"; readonly terms: ReviewTerms }
  | { readonly type: "confirm" }
  | { readonly type: "cancel" }
  | { readonly type: "settle"; readonly result: ReviewResult }
  | { readonly type: "dismiss" };

export const CLOSED: ReviewState = { phase: "closed" };

/** Every move the review can make; an event a state does not accept leaves it as it was. */
export function reviewStep(state: ReviewState, event: ReviewEvent): ReviewState {
  switch (event.type) {
    case "open":
      if (state.phase !== "closed") return state;
      return { phase: "ready", terms: event.terms };
    case "confirm":
      return state.phase === "ready" ? { phase: "resolving", terms: state.terms } : state;
    case "cancel":
      return state.phase === "ready" ? CLOSED : state;
    case "settle":
      if (state.phase !== "resolving") return state;
      // A routine act that applied and saved needs no result screen: its receipt is already on the page.
      if (state.terms.tier === "confirm" && event.result.kind === "applied" && event.result.saveError === undefined) return CLOSED;
      return { phase: "result", terms: state.terms, result: event.result };
    case "dismiss":
      return state.phase === "resolving" || state.phase === "result" ? CLOSED : state;
  }
}
