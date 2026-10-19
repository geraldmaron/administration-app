import { parseSecurityAct, type SecurityAct } from "./security-act";
export const SECURITY_VIEWS = ["theaters", "forces", "intelligence", "operations"] as const;
export type SecurityView = (typeof SECURITY_VIEWS)[number];

export const SECURITY_VIEW_LABELS: Readonly<Record<SecurityView, string>> = {
  theaters: "Theaters",
  forces: "Forces",
  intelligence: "Intelligence",
  operations: "Operations",
};

export type SecuritySearch = { readonly view?: SecurityView; readonly service?: string; readonly action?: SecurityAct["kind"]; readonly subject?: string };

export function isSecurityView(value: unknown): value is SecurityView {
  return typeof value === "string" && (SECURITY_VIEWS as readonly string[]).includes(value);
}

/** The desk's address: its view, and the service the forces view is opened on (`place.service` builds this link). */
export function securitySearch(search: Record<string, unknown>): SecuritySearch {
  const action = parseSecurityAct(search.action, search.subject);
  return {
    ...(action ? { action: action.kind, ...("id" in action ? { subject: action.id } : {}) } : {}),
    ...(isSecurityView(search.view) && search.view !== "theaters" ? { view: search.view } : {}),
    ...(typeof search.service === "string" && search.service.length > 0 && search.service.length <= 60 ? { service: search.service } : {}),
  };
}

/** A service link opens the forces view even when the address names no view. */
export function viewOf(search: SecuritySearch): SecurityView {
  return search.view ?? (search.service ? "forces" : "theaters");
}

/** The desk's address for one view; the theaters view is the bare address. */
export function securityHref(view: SecurityView): string {
  return view === "theaters" ? "/world/security" : `/world/security?view=${view}`;
}

/** Reload and browser Back read the same action state as the visible inspector. */
export const securityActOf = (search: SecuritySearch): SecurityAct | undefined => parseSecurityAct(search.action, search.subject);
