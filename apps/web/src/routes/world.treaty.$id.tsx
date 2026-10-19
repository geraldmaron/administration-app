import { createFileRoute } from "@tanstack/react-router";
import { treatyScreenReading } from "@admin/player-core";
import { InTerm } from "../shell/InTerm";
import { NoSuchTreaty, TreatyScreen } from "../world/treaty/TreatyScreen";

function TreatyPage() {
  const { id } = Route.useParams();
  return (
    <InTerm>
      {(campaign) => {
        const reading = treatyScreenReading(campaign, id);
        return reading ? <TreatyScreen key={id} campaign={campaign} reading={reading} /> : <NoSuchTreaty />;
      }}
    </InTerm>
  );
}

export const Route = createFileRoute("/world/treaty/$id")({
  component: TreatyPage,
});
