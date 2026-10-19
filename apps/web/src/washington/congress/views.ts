export const CONGRESS_VIEWS = ["overview", "bills", "nominations", "members", "delegations", "powers"] as const;

export type CongressView = (typeof CONGRESS_VIEWS)[number];

export function isCongressView(value: unknown): value is CongressView {
  return typeof value === "string" && (CONGRESS_VIEWS as readonly string[]).includes(value);
}
