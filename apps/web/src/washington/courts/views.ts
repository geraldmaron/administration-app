export const COURTS_VIEWS = ["bench", "docket", "nominations"] as const;

export type CourtsView = (typeof COURTS_VIEWS)[number];

export function isCourtsView(value: unknown): value is CourtsView {
  return typeof value === "string" && (COURTS_VIEWS as readonly string[]).includes(value);
}
