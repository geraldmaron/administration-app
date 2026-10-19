// The security desk's and a command's address: the view, the service the
// forces view is opened on, and the one act open in its sheet. Only known
// action kinds and bounded subject identifiers enter the address, so a reload
// or Back reads the same act state as the visible sheet.

export const SECURITY_VIEWS = ["theaters", "forces", "intelligence", "operations"] as const;
export type SecurityView = (typeof SECURITY_VIEWS)[number];

export const SECURITY_VIEW_LABELS: Readonly<Record<SecurityView, string>> = {
  theaters: "Theaters",
  forces: "Forces",
  intelligence: "Intelligence",
  operations: "Operations",
};

/** The act the player has open on the security desk, if any. */
export type SecurityAct =
  | { readonly kind: "sign-finding" }
  | { readonly kind: "close-finding"; readonly id: string }
  | { readonly kind: "task" }
  | { readonly kind: "close-tasking"; readonly id: string }
  | { readonly kind: "share-report"; readonly id: string }
  | { readonly kind: "commission" }
  | { readonly kind: "press"; readonly id: string }
  | { readonly kind: "commitment"; readonly id: string };

export const SECURITY_ACT_KINDS = ["sign-finding", "close-finding", "task", "close-tasking", "share-report", "commission", "press", "commitment"] as const;
const SUBJECT_ACTS: ReadonlySet<SecurityAct["kind"]> = new Set(["close-finding", "close-tasking", "share-report", "press", "commitment"]);

export const SECURITY_ACT_LABELS: Readonly<Record<SecurityAct["kind"], string>> = {
  "sign-finding": "Covert finding",
  "close-finding": "Close a covert finding",
  task: "Gather intelligence",
  "close-tasking": "Stop an intelligence request",
  "share-report": "Share intelligence",
  commission: "Ask for an assessment",
  press: "Change an assessment's wording",
  commitment: "Change a commitment",
};

export function parseSecurityAct(kind: unknown, subject: unknown): SecurityAct | undefined {
  if (typeof kind !== "string" || !(SECURITY_ACT_KINDS as readonly string[]).includes(kind)) return undefined;
  if (SUBJECT_ACTS.has(kind as SecurityAct["kind"])) {
    if (typeof subject !== "string" || !subject.trim() || subject.length > 200 || /[\u0000-\u001f]/.test(subject)) return undefined;
    return { kind, id: subject } as SecurityAct;
  }
  return { kind } as SecurityAct;
}

export type SecuritySearch = { readonly view?: SecurityView; readonly service?: string; readonly action?: SecurityAct["kind"]; readonly subject?: string };

export function isSecurityView(value: unknown): value is SecurityView {
  return typeof value === "string" && (SECURITY_VIEWS as readonly string[]).includes(value);
}

export function securitySearch(search: Readonly<Record<string, unknown>>): SecuritySearch {
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

export function securityHref(view: SecurityView): string {
  return view === "theaters" ? "/world/security" : `/world/security?view=${view}`;
}

export const securityActOf = (search: SecuritySearch): SecurityAct | undefined => parseSecurityAct(search.action, search.subject);

export const COMMAND_ACTS = ["posture", "relieve", "reassign", "amend"] as const;
export type CommandAct = (typeof COMMAND_ACTS)[number];

export function commandSearch(search: Readonly<Record<string, unknown>>): { readonly action?: CommandAct } {
  return typeof search.action === "string" && (COMMAND_ACTS as readonly string[]).includes(search.action) ? { action: search.action as CommandAct } : {};
}
