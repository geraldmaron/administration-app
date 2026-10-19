// The view models the Handbook's parts draw. They mirror the explainer,
// glossary and authority records the app reads, field for field, so a screen
// hands a record straight in; the design system never imports where they
// come from.

export type CastMemberView = { readonly label: string; readonly role: string; readonly icon?: string };

export type StepView = {
  readonly label: string;
  readonly detail: string;
  readonly icon?: string;
  readonly exit?: string;
  readonly duration?: string;
  readonly youCan?: string;
};

export type ThresholdView = { readonly label: string; readonly needed: number; readonly of: number; readonly note: string };

export type InfluenceView = {
  readonly from: string;
  readonly to: string;
  readonly how: string;
  readonly direction: "raises" | "lowers" | "shifts";
  readonly weight: "strong" | "moderate" | "weak";
  readonly outcome?: "helps" | "hurts";
};

export type ExampleView = { readonly title: string; readonly kind: "history" | "illustration"; readonly lines: readonly string[] };

/** A named thing the reader can open: a term, an explainer. */
export type NamedRef = { readonly id: string; readonly label: string };

export type ExplainerViewModel = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly cast?: readonly CastMemberView[];
  readonly steps?: readonly StepView[];
  readonly thresholds?: readonly ThresholdView[];
  readonly links?: readonly InfluenceView[];
  readonly examples?: readonly ExampleView[];
  readonly youCan?: readonly string[];
};

/** One authority as the Handbook draws it: the record's own words, never a paraphrase. */
export type LawCardView = {
  readonly id: string;
  readonly cite: string;
  readonly title: string;
  readonly kindLabel: string;
  readonly summary: string;
  readonly enables: readonly string[];
  readonly limits: readonly string[];
  readonly sourceLabel: string;
  readonly inForce: boolean;
  readonly lapsed?: string;
};

export type GlossaryCardView = {
  readonly id: string;
  readonly term: string;
  readonly definition: string;
  readonly inGame?: string;
  readonly example?: string;
  readonly icon?: string;
  readonly related: readonly NamedRef[];
  /** The authorities the term rests on, drawn beside the definition. */
  readonly law: readonly LawCardView[];
};
