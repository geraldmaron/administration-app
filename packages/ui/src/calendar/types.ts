import type { ReactNode } from "react";
import type { IconName } from "../icons/Icon";

/** The engine's three urgencies, which every dated row ranks on. */
export type Urgency = "hard" | "soft" | "ambient";

export type DayCell = {
  /** Stable key for the day, e.g. "2029-03-14". */
  readonly key: string;
  readonly day: number;
  readonly inMonth: boolean;
  readonly today: boolean;
  /** One mark per event, colored by urgency, at most a few drawn. */
  readonly marks: readonly { readonly id: string; readonly urgency: Urgency }[];
};

export type DatedRow = {
  readonly id: string;
  readonly title: string;
  readonly detail?: string;
  /** "War Powers", "Election", "Court". */
  readonly kindLabel: string;
  readonly icon: IconName;
  readonly urgency: Urgency;
  /** What happens if the President does nothing. */
  readonly lapse?: string;
  /** The statute or clause that sets the date. */
  readonly cite?: string;
  readonly onPress?: () => void;
  readonly onCite?: () => void;
  /** Who and what the row is about, as names that open a quick look; the screen builds them. */
  readonly refs?: ReactNode;
};

export type AgendaDayView = {
  readonly key: string;
  /** "Thursday, March 14". */
  readonly label: string;
  /** "In 6 days", "Today". */
  readonly relative: string;
  readonly rows: readonly DatedRow[];
};
