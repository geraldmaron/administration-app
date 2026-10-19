import { useLocalSearchParams } from "expo-router";
import { LEGACY_VIEWS, Legacy } from "../src/ending/Legacy";
import { InTerm } from "../src/shell/InTerm";

/** What the administration leaves, with the view in the address. */
export default function LegacyRoute() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const picked = LEGACY_VIEWS.find((candidate) => candidate === view) ?? "comparison";
  return <InTerm>{(campaign) => <Legacy campaign={campaign} view={picked} />}</InTerm>;
}
