import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import type { NationId } from "@admin/world";
import { InTerm } from "../shell/InTerm";
import { countrySearch, type CountryView } from "../world/nation/country-search";
import { NationScreen } from "../world/nation/NationScreen";

function NationPage() {
  const { id } = Route.useParams();
  const { view, sector } = Route.useSearch();
  const navigate = useNavigate({ from: "/world/nation/$id/" });
  const update = (patch: Record<string, unknown>, replace = true) => void navigate({ search: (current) => countrySearch({ ...current, ...patch }), replace, resetScroll: false });
  return (
    <InTerm>
      {(campaign) =>
        // The President's own country is not a foreign government with a file: it is the Nation screen, so its address goes there.
        id.toUpperCase() === campaign.founding.nation ? (
          <Navigate to="/nation" replace />
        ) : (
        <NationScreen
          campaign={campaign}
          id={id.toUpperCase() as NationId}
          view={view ?? "overview"}
          onView={(next: CountryView) => update({ view: next }, false)}
          sector={sector}
          onSector={(next) => update({ sector: next })}
        />
        )
      }
    </InTerm>
  );
}

export const Route = createFileRoute("/world/nation/$id/")({
  validateSearch: countrySearch,
  component: NationPage,
});
