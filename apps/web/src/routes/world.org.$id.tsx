import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { orgScreenReading } from "@admin/player-core";
import { InTerm } from "../shell/InTerm";
import { orgSearch } from "../world/org/org-search";
import { NoSuchOrg, OrgScreen } from "../world/org/OrgScreen";

function OrgPage() {
  const { id } = Route.useParams();
  const { member } = Route.useSearch();
  const navigate = useNavigate({ from: "/world/org/$id" });
  return (
    <InTerm>
      {(campaign) => {
        const reading = orgScreenReading(campaign, id);
        return reading ? <OrgScreen key={id} reading={reading} member={member} onMember={(next) => void navigate({ search: { member: next }, replace: true, resetScroll: false })} /> : <NoSuchOrg />;
      }}
    </InTerm>
  );
}

export const Route = createFileRoute("/world/org/$id")({
  validateSearch: orgSearch,
  component: OrgPage,
});
