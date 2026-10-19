import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { WORLD_REGIONS, isWorldReading, type WorldReadingId, type WorldRegionId } from "@admin/player-core";
import { InTerm } from "../shell/InTerm";
import { WorldScreen } from "../world/overview/WorldScreen";

type WorldSearch = { readonly reading?: WorldReadingId; readonly region?: WorldRegionId; readonly q?: string };

/** Old links named the map's color as `lens`; its forces and trade colors keep their meaning. */
const FROM_LENS: Readonly<Record<string, WorldReadingId>> = { forces: "forces", trade: "trade" };

function worldSearch(search: Record<string, unknown>): WorldSearch {
  const reading = isWorldReading(search.reading) ? search.reading : typeof search.lens === "string" ? FROM_LENS[search.lens] : undefined;
  return {
    ...(reading && reading !== "standing" ? { reading } : {}),
    ...(typeof search.region === "string" && WORLD_REGIONS.includes(search.region as WorldRegionId) ? { region: search.region as WorldRegionId } : {}),
    ...(typeof search.q === "string" && search.q.length > 0 ? { q: search.q.slice(0, 120) } : {}),
  };
}

function WorldPage() {
  const { reading, region, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/world/" });
  const update = (patch: Record<string, unknown>) => void navigate({ search: (current) => worldSearch({ ...current, ...patch }), replace: true, resetScroll: false });
  return (
    <InTerm>
      {(campaign) => (
        <WorldScreen campaign={campaign} reading={reading ?? "standing"} onReading={(next) => update({ reading: next })} region={region ?? null} onRegion={(next) => update({ region: next })} query={q ?? ""} onQuery={(next) => update({ q: next })} />
      )}
    </InTerm>
  );
}

export const Route = createFileRoute("/world/")({
  validateSearch: worldSearch,
  component: WorldPage,
});
