import { router, useLocalSearchParams } from "expo-router";
import { InTerm } from "../../../../src/shell/InTerm";
import { ReviewBoundary } from "../../../../src/review/PresidentialReview";
import { SecurityScreen } from "../../../../src/security/SecurityScreen";
import { securityActOf, securitySearch, viewOf } from "../../../../src/security/params";
import { flatQuery } from "../../../../src/world/params";

export default function SecurityRoute() {
  const search = securitySearch(flatQuery(useLocalSearchParams()));
  const update = (patch: Readonly<Record<string, string | undefined>>) => {
    const next = securitySearch({ ...search, ...patch });
    router.setParams({ view: next.view, service: next.service, action: next.action, subject: next.subject } as never);
  };
  return (
    <ReviewBoundary>
      <InTerm>
      {(campaign) => (
        <SecurityScreen
          campaign={campaign}
          view={viewOf(search)}
          onView={(view) => update({ view, service: view === "forces" ? search.service : undefined })}
          service={search.service}
          onService={(service) => update({ view: "forces", service })}
          action={securityActOf(search)}
          onAction={(action) => update({ action: action?.kind, subject: action && "id" in action ? action.id : undefined })}
        />
      )}
    </InTerm>
    </ReviewBoundary>
  );
}
