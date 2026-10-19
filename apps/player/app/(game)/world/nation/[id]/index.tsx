import { Redirect, router, useLocalSearchParams } from "expo-router";
import { place } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { InTerm } from "../../../../../src/shell/InTerm";
import { ReviewBoundary } from "../../../../../src/review/PresidentialReview";
import { NationScreen } from "../../../../../src/world/nation/NationScreen";
import { countrySearch, flatQuery, one } from "../../../../../src/world/params";

export default function NationRoute() {
  const query = useLocalSearchParams();
  const id = (one(query, "id") ?? "").toUpperCase();
  const search = countrySearch(flatQuery(query));
  const update = (patch: Readonly<Record<string, string | undefined>>) => {
    const next = countrySearch({ ...search, ...patch });
    router.setParams({ view: next.view, sector: next.sector } as never);
  };
  return (
    <ReviewBoundary>
      <InTerm>
      {(campaign) =>
        // The President's own country is not a foreign government with a file: it is the Nation screen, so its address goes there.
        id === campaign.founding.nation ? (
          <Redirect href={place.nation() as never} />
        ) : (
          <NationScreen key={id} campaign={campaign} id={id as NationId} view={search.view ?? "overview"} onView={(view) => update({ view, sector: search.sector })} {...(search.sector ? { sector: search.sector } : {})} onSector={(sector) => update({ view: search.view, sector })} />
        )
      }
    </InTerm>
    </ReviewBoundary>
  );
}
