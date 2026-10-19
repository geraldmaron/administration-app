/** The selected coalition member stays attached to its body when returning from an action. */
export function orgSearch(search: Record<string, unknown>): { readonly member?: string } {
  return typeof search.member === "string" && /^[A-Z]{3}$/.test(search.member) ? { member: search.member } : {};
}
