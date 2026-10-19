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

/** Only known action kinds and bounded subject identifiers enter the workspace URL. */
export function parseSecurityAct(kind: unknown, subject: unknown): SecurityAct | undefined {
  if (typeof kind !== "string" || !(SECURITY_ACT_KINDS as readonly string[]).includes(kind)) return undefined;
  if (SUBJECT_ACTS.has(kind as SecurityAct["kind"])) {
    if (typeof subject !== "string" || !subject.trim() || subject.length > 200 || /[\u0000-\u001f]/.test(subject)) return undefined;
    return { kind, id: subject } as SecurityAct;
  }
  return { kind } as SecurityAct;
}

export const SECURITY_ACT_LABELS: Readonly<Record<SecurityAct["kind"], string>> = {
  "sign-finding": "Covert finding",
  "close-finding": "Review a covert finding",
  task: "Intelligence collection",
  "close-tasking": "Review a standing tasking",
  "share-report": "Intelligence disclosure",
  commission: "Intelligence assessment",
  press: "Review assessment wording",
  commitment: "Review a commitment",
};
