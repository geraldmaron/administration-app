import type { NetworkSearch } from "./PersonNetwork";

const one = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);
const text = (value: unknown): string | undefined => {
  const raw = one(value);
  return typeof raw === "string" && raw.length > 0 ? raw.slice(0, 120) : undefined;
};

/** The relationship map's settings read back from the address, refusing what the map does not offer. */
export function networkSearch(params: Readonly<Record<string, unknown>>): NetworkSearch {
  const evidence = one(params.evidence);
  const count = Number(one(params.count));
  const scope = text(params.scope);
  const subject = text(params.subject);
  const query = text(params.query);
  const contact = text(params.contact);
  return {
    ...(scope ? { scope } : {}),
    ...(subject ? { subject } : {}),
    ...(query ? { query } : {}),
    ...(contact ? { contact } : {}),
    ...(evidence === "recorded" || evidence === "inferred" ? { evidence } : {}),
    ...(Number.isInteger(count) && count >= 8 && count <= 16 ? { count } : {}),
  };
}

/** The settings as address parameters, every key present so a cleared one leaves the address. */
export function networkParams(search: NetworkSearch): Record<string, string | undefined> {
  return {
    scope: search.scope,
    subject: search.subject,
    query: search.query || undefined,
    contact: search.contact || undefined,
    evidence: search.evidence === "all" ? undefined : search.evidence,
    count: search.count === undefined ? undefined : String(search.count),
  };
}
