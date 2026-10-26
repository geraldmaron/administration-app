import type { BudgetDraftInput, TariffStatute } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { TariffGood } from "../act/tariff-package";

// A draft is a change the President has written down and not yet signed. It
// is keyed by its subject, so editing the same thing twice revises one draft
// rather than queueing two acts that would each be priced on a world the
// other has already changed.

/**
 * Who acts on a draft once it is signed. Separate powers never commit as one:
 * Congress can refuse a budget while an executive order stands, so each group
 * is its own set of acts, each reviewed and signed on its own.
 */
export type DraftAuthority = "on-signing" | "congress" | "senate";

export const DRAFT_AUTHORITY_ORDER: readonly DraftAuthority[] = ["on-signing", "congress", "senate"];

export const DRAFT_AUTHORITY_LABEL: Readonly<Record<DraftAuthority, string>> = {
  "on-signing": "Takes effect on signing",
  congress: "Sent to Congress",
  senate: "Needs the Senate",
};

/** What the draft would do, as plain data so it is written beside the save unchanged. */
export type DraftSpec =
  | { readonly kind: "budget"; readonly lines: BudgetDraftInput }
  | { readonly kind: "tariff"; readonly nation: NationId; readonly goods: readonly TariffGood[]; readonly statute?: TariffStatute };

export type DraftKind = DraftSpec["kind"];

/**
 * The campaign a draft was priced against, as a fingerprint that survives a
 * reload. The store's own stale-terms guard compares campaign objects, which a
 * reload replaces, so a persisted draft needs a stamp to know it has gone stale.
 */
export type CampaignStamp = {
  readonly seed: string;
  readonly turn: number;
  /** The game date, "YYYY-MM-DD". */
  readonly date: string;
  /** How many records the ledger held: every applied packet appends one. */
  readonly ledger: number;
  /**
   * A hash of the newest ledger record, so two campaigns that reached the same
   * length by different acts (one reloaded past a lost act, then acted again)
   * do not read as the same.
   */
  readonly last: number;
};

export type DraftLine = { readonly label: string; readonly value: string };

/** The law a draft's act rests on, resolved from the authority registry. */
export type DraftCitation = { readonly id: string; readonly cite: string; readonly title: string; readonly sourceUrl: string };

/** The draft as it was priced: everything the tray and the sign-off say about it. */
export type DraftPreview = {
  /** The subject in a few words: "Your budget", "Tariff order on China". */
  readonly subject: string;
  /** Today's value, struck in the tray. */
  readonly was: string;
  /** The drafted value. */
  readonly now: string;
  /** What signing would do, in one line. */
  readonly effect: string;
  readonly effectTone: "favorable" | "neutral" | "caution" | "adverse";
  /** The review's title. */
  readonly title: string;
  /** The terms, in order; a package lists its steps in the order they apply. */
  readonly steps: readonly DraftLine[];
  /** The named verb that signs it: "Send to Congress", "Sign the order". */
  readonly verb: string;
  /** Where the act goes once signed, in words. */
  readonly route: string;
  readonly citation?: DraftCitation;
};

export type Draft = {
  readonly subject: string;
  /** Counts the edits to this subject, so a sign-off can refuse terms revised after it was opened. */
  readonly revision: number;
  readonly spec: DraftSpec;
  readonly authority: DraftAuthority;
  readonly basis: CampaignStamp;
  readonly preview: DraftPreview;
};
