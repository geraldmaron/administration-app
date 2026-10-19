import { createFileRoute, redirect } from "@tanstack/react-router";

/** A state's act desk at the address player-core builds for it: the state page draws the desk for the matter named, or federal power where none is. */
export const Route = createFileRoute("/nation/state/$id_/act")({
  validateSearch: (search: Record<string, unknown>): { readonly cause?: string } => (typeof search.cause === "string" && search.cause ? { cause: search.cause } : {}),
  beforeLoad: ({ params, search }) => {
    const desk = search.cause ? `act=${encodeURIComponent(search.cause)}` : "power=1";
    throw redirect({ href: `/nation/state/${encodeURIComponent(params.id)}?${desk}`, replace: true });
  },
});
