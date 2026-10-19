import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { OVERSIGHT_VIEWS, OversightScreen, type OversightView } from "../washington/oversight/OversightScreen";

/** `seat` opens the appointments desk on one seat, the door a Brief vacancy row and an office page use. */
type OversightSearch = { readonly view?: OversightView; readonly seat?: string };

function OversightPage() {
  const { view = "inquiries", seat } = Route.useSearch();
  const navigate = useNavigate({ from: "/washington/oversight" });
  return <InTerm>{(campaign) => <OversightScreen campaign={campaign} view={view} {...(seat ? { seat } : {})} onView={(next) => void navigate({ search: { view: next } })} />}</InTerm>;
}

export const Route = createFileRoute("/washington/oversight")({
  validateSearch: (search: Record<string, unknown>): OversightSearch => {
    const view = OVERSIGHT_VIEWS.find((entry) => entry === search["view"]);
    const seat = typeof search["seat"] === "string" && search["seat"] ? search["seat"] : undefined;
    return { ...(view ? { view } : {}), ...(seat ? { seat } : {}) };
  },
  component: OversightPage,
});
