import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import type { FillAct } from "../washington/executive/ChairActs";
import { OFFICE_VIEWS, OfficeScreen, type OfficeView } from "../washington/executive/OfficeScreen";
import "../washington/executive/washington.css";

const LEGACY_OFFICE_VIEW: Readonly<Partial<Record<string, OfficeView>>> = {
  "office-actions": "actions",
  "office-leadership": "leadership",
  "exec-record": "record",
  "exec-agencies": "organization",
  "exec-commands": "organization",
  "exec-condition": "overview",
  "office-mandate-title": "overview",
};

type OfficeSearch = { readonly fill?: FillAct; readonly view?: OfficeView };

function OfficePage() {
  const { id } = Route.useParams();
  const { fill, view: selectedView } = Route.useSearch();
  const { hash } = useLocation();
  const fragment = hash.replace(/^#/, "");
  const legacyView = Object.hasOwn(LEGACY_OFFICE_VIEW, fragment) ? LEGACY_OFFICE_VIEW[fragment] : undefined;
  const view = selectedView ?? legacyView ?? "overview";
  const navigate = useNavigate({ from: "/washington/office/$id" });
  return <InTerm>{(campaign) => <OfficeScreen key={id} campaign={campaign} id={id} {...(fill ? { fill } : {})} view={view} onView={(next) => void navigate({ search: (current) => ({ ...current, view: next }), hash: "", resetScroll: false })} onFill={(next) => void navigate({ search: (current) => { const { fill: _fill, ...rest } = current; return next ? { ...rest, fill: next } : rest; } })} />}</InTerm>;
}

export const Route = createFileRoute("/washington/office/$id")({
  validateSearch: (search: Record<string, unknown>): OfficeSearch => { const view = OFFICE_VIEWS.find((value) => value === search["view"]); const fill = search["fill"] === "appoint" || search["fill"] === "acting" ? search["fill"] : undefined; return { ...(view ? { view } : {}), ...(fill ? { fill } : {}) }; },
  component: OfficePage,
});
