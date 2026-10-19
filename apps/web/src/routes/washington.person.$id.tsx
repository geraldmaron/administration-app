import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import type { RelationshipSearch } from "../washington/person/RelationshipNavigator";
import { InTerm } from "../shell/InTerm";
import { PERSON_VIEWS, PersonScreen, type PersonView } from "../washington/person/PersonScreen";
import "../washington/executive/washington.css";

const LEGACY_PERSON_VIEW: Readonly<Partial<Record<string, PersonView>>> = {
  "person-circle": "network",
  "person-career": "career",
  "person-counsel": "career",
  "person-ratings": "overview",
  "person-faction": "overview",
  "person-record": "overview",
};

function PersonPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const { view: selectedView, ...network } = search;
  const { hash } = useLocation();
  const fragment = hash.replace(/^#/, "");
  const legacyView = Object.hasOwn(LEGACY_PERSON_VIEW, fragment) ? LEGACY_PERSON_VIEW[fragment] : undefined;
  const view = selectedView ?? legacyView ?? "overview";
  const navigate = useNavigate({ from: "/washington/person/$id" });
  return <InTerm>{(campaign) => <PersonScreen key={id} campaign={campaign} id={id} view={view} network={network} onNetwork={(next) => void navigate({ search: { ...next, view: "network" }, replace: true, hash: "", resetScroll: false })} onView={(next) => void navigate({ search: { ...search, view: next }, hash: "", resetScroll: false })} />}</InTerm>;
}

export const Route = createFileRoute("/washington/person/$id")({
  validateSearch: (search: Record<string, unknown>): RelationshipSearch & { readonly view?: PersonView } => {
    const view = PERSON_VIEWS.find((value) => value === search["view"]);
    const text = (key: string) => typeof search[key] === "string" ? String(search[key]).slice(0, 120) : undefined;
    const count = Number(search["count"]);
    return { ...(view ? { view } : {}), ...(text("contact") ? { contact: text("contact")! } : {}), ...(search["evidence"] === "recorded" || search["evidence"] === "inferred" ? { evidence: search["evidence"] } : {}), ...(text("scope") ? { scope: text("scope")! } : {}), ...(text("subject") ? { subject: text("subject")! } : {}), ...(text("query") ? { query: text("query")! } : {}), ...(Number.isInteger(count) && count >= 8 && count <= 16 ? { count } : {}) };
  },
  component: PersonPage,
});
