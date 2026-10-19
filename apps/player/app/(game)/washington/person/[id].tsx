import { useLocalSearchParams, useRouter } from "expo-router";
import { PersonScreen } from "../../../../src/dossier/PersonScreen";
import { networkSearch, networkParams } from "../../../../src/dossier/network-search";
import { personViewOf } from "../../../../src/dossier/person-view";
import { InTerm } from "../../../../src/shell/InTerm";

/** A person's dossier. The view and the relationship map's scope live in the address, so Back returns to them. */
export default function PersonPage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const view = personViewOf(params.view);
  return (
    <InTerm>
      {(campaign) => (
        <PersonScreen
          key={id}
          campaign={campaign}
          id={id}
          view={view}
          onView={(next) => router.setParams({ view: next === "overview" ? undefined : next })}
          network={networkSearch(params)}
          onNetwork={(next) => router.setParams({ ...networkParams(next), view: "network" })}
        />
      )}
    </InTerm>
  );
}
