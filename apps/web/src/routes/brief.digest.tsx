import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseBriefSearch } from "../brief/search";

/** Retained bookmarks enter the single Brief workspace at their recorded week. */
export const Route = createFileRoute("/brief/digest")({
  validateSearch: parseBriefSearch,
  beforeLoad: ({ search }) => {
    const suffix = search.week === undefined ? "" : `&week=${search.week}`;
    throw redirect({ href: `/brief?view=history${suffix}`, replace: true });
  },
});
