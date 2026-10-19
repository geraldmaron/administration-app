import type { CommandAct } from "./CommandActs";
const ACTIONS: readonly CommandAct[] = ["posture", "relieve", "reassign", "amend"];
export function commandSearch(search: Record<string, unknown>): { readonly action?: CommandAct } {
  return typeof search.action === "string" && (ACTIONS as readonly string[]).includes(search.action) ? { action: search.action as CommandAct } : {};
}
