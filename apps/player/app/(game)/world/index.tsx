import { router, useLocalSearchParams } from "expo-router";
import { InTerm } from "../../../src/shell/InTerm";
import { WorldScreen } from "../../../src/world/overview/WorldScreen";
import { flatQuery, worldSearch } from "../../../src/world/params";

export default function WorldRoute() {
  const search = worldSearch(flatQuery(useLocalSearchParams()));
  const update = (patch: Readonly<Record<string, string | undefined>>) => {
    const next = worldSearch({ ...search, ...patch });
    router.setParams({ reading: next.reading, region: next.region, q: next.q } as never);
  };
  return (
    <InTerm>
      {(campaign) => (
        <WorldScreen
          campaign={campaign}
          reading={search.reading ?? "standing"}
          onReading={(reading) => update({ reading })}
          region={search.region ?? null}
          onRegion={(region) => update({ region: region ?? undefined })}
          query={search.q ?? ""}
          onQuery={(q) => update({ q: q || undefined })}
        />
      )}
    </InTerm>
  );
}
