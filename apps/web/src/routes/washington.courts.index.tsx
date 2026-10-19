import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { place } from "@admin/player-core";
import { InTerm } from "../shell/InTerm";
import { CourtsScreen } from "../washington/courts/CourtsScreen";
import { isCourtsView, type CourtsView } from "../washington/courts/views";

type CourtsSearch = { readonly judge?: string; readonly view?: CourtsView };

function CourtsPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate({ from: "/washington/courts/" });
  const onView = (next: CourtsView) => void navigate({ search: (current) => ({ ...current, view: next }), replace: true, resetScroll: false });
  return <InTerm>{(campaign) => <CourtsScreen campaign={campaign} view={view ?? "bench"} onView={onView} />}</InTerm>;
}

export const Route = createFileRoute("/washington/courts/")({
  validateSearch: (search: Record<string, unknown>): CourtsSearch => ({
    ...(typeof search["judge"] === "string" && search["judge"] ? { judge: search["judge"] } : {}),
    ...(isCourtsView(search["view"]) ? { view: search["view"] } : {}),
  }),
  // A judge's file was a view on this page; links to it (kept in Record entries and older saves) now open the person's dossier.
  beforeLoad: ({ search }) => {
    if (search.judge) throw redirect({ href: place.person(search.judge), replace: true });
  },
  component: CourtsPage,
});
