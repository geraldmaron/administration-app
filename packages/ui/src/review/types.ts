import type { ReactNode } from "react";
import type { IconName } from "../icons/Icon";

// The comparison and review views, structural so a producer's outcome is
// passed straight through without this package knowing where it was made.

export type EffectTone = "favorable" | "neutral" | "caution" | "adverse";

/** One reading an option moves. `value` is the likely move in `unit`; `ifWell` and `ifBadly` bound it where it can land either way. */
export type EffectView = {
  readonly metric: string;
  readonly label: string;
  readonly value: number;
  readonly text: string;
  readonly tone: EffectTone;
  /** "pts", or "band" for a move on the ±3 magnitude scale. */
  readonly unit: string;
  readonly ifWell?: number;
  readonly ifBadly?: number;
};

export type OutcomeView = {
  readonly cost: { readonly text: string; readonly figure?: { readonly value: number }; readonly borrowing?: { readonly text: string; readonly amount: number } };
  readonly odds?: { readonly share: number; readonly word: string; readonly confidence?: string };
  readonly effects: readonly EffectView[];
  readonly worstCase?: string;
  readonly details: readonly { readonly label: string; readonly text: ReactNode }[];
};

/** An option's character at a glance: force red, accord blue, principle gold, plain. */
export type OptionAccent = "red" | "blue" | "gold" | "neutral";

export type CompareLine = { readonly label: string; readonly icon?: IconName; readonly value: ReactNode };

export type CompareOption = {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly accent?: OptionAccent;
  readonly recommended?: boolean;
  /** Why it cannot be authorized today; it can still be read and compared. */
  readonly unavailable?: string;
  /** The option's own words, set under its name. */
  readonly lead?: ReactNode;
  readonly outcome?: OutcomeView;
  /** For an option drawn without an outcome: its readings, each a labeled line on the card. */
  readonly lines?: readonly CompareLine[];
  /** Set at the foot of the card: the law the act rests on, a source. */
  readonly foot?: ReactNode;
};

/**
 * A forward projection laid into the list by the screen that can run one: a
 * control over the list, one cell per option id, and the picked option's
 * opened detail. Nodes, not numbers, so this package never runs a model.
 */
export type CompareProjection = {
  readonly control: ReactNode;
  readonly perItem: Readonly<Record<string, ReactNode>>;
  readonly detail?: ReactNode;
  /** Told which option was authorized, before the act is sent, so the screen can file the forecast it showed. */
  readonly onAuthorize?: (id: string) => void;
};

export type ReviewTier = "full" | "confirm";

export type ReviewLineView = { readonly label: string; readonly value: string };

export type ReviewTermsView = {
  readonly tier: ReviewTier;
  readonly title: string;
  readonly lines: readonly ReviewLineView[];
  /** The final control's words: "Confirm and sign". */
  readonly verb: string;
  /** Forceful or irreversible: the final control is drawn as danger. */
  readonly danger: boolean;
};

export type ReviewResultView =
  | { readonly kind: "applied"; readonly date: string; readonly eventId?: string; readonly saveError?: string }
  | { readonly kind: "refused"; readonly words: string }
  | { readonly kind: "unread"; readonly words: string };

export type ReviewPhase = "ready" | "resolving" | "result";
