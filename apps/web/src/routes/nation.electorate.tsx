import { createFileRoute, redirect } from "@tanstack/react-router";
import { nationSearch } from "../nation/state/nation-search";

/** Legacy public-opinion addresses retain the same validated investigation context. */
export const Route = createFileRoute("/nation/electorate")({
  validateSearch: nationSearch,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/nation", search, replace: true });
  },
});
