import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmergencyScreen } from "../nation/emergency/EmergencyScreen";
import { InTerm } from "../shell/InTerm";

type EmergencySearch = { readonly incident?: string; readonly declaration?: string };

function EmergencyPage() {
  const { incident, declaration } = Route.useSearch();
  const navigate = useNavigate({ from: "/nation/emergency" });
  const select = (next: string | undefined) => void navigate({ search: next ? { incident: next } : {}, replace: true });
  return <InTerm>{(campaign) => <EmergencyScreen campaign={campaign} selected={incident} onSelect={select} declaration={declaration} />}</InTerm>;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export const Route = createFileRoute("/nation/emergency")({
  validateSearch: (search: Record<string, unknown>): EmergencySearch => {
    const incident = text(search.incident);
    const declaration = text(search.declaration);
    return { ...(incident ? { incident } : {}), ...(declaration ? { declaration } : {}) };
  },
  component: EmergencyPage,
});
