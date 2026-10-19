import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InTerm } from "../shell/InTerm";
import { SecurityScreen } from "../world/security/SecurityScreen";
import { securityActOf, securitySearch, viewOf, type SecurityView } from "../world/security/security-search";

function SecurityPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/world/security/" });
  const update = (patch: Record<string, unknown>) => void navigate({ search: (current) => securitySearch({ ...current, ...patch }), replace: true, resetScroll: false });
  return (
    <InTerm>
      {(campaign) => (
        <SecurityScreen
          campaign={campaign}
          view={viewOf(search)}
          onView={(next: SecurityView) => update({ view: next, ...(next === "forces" ? {} : { service: undefined }) })}
          service={search.service}
          action={securityActOf(search)}
          onAction={(action) => void navigate({ search: (current) => securitySearch({ ...current, action: action?.kind, subject: action && "id" in action ? action.id : undefined }), replace: !action, resetScroll: false })}
          onService={(next) => update({ view: "forces", service: next })}
        />
      )}
    </InTerm>
  );
}

export const Route = createFileRoute("/world/security/")({
  validateSearch: securitySearch,
  component: SecurityPage,
});
