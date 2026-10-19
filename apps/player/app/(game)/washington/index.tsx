import { useLocalSearchParams, useRouter } from "expo-router";
import { ExecutiveScreen } from "../../../src/executive/ExecutiveScreen";
import { executiveSearch, searchParams } from "../../../src/executive/cabinet-view";
import { InTerm } from "../../../src/shell/InTerm";

/** The executive branch. How the screen is set out lives in the address, so Back and reload keep it. */
export default function Washington() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const search = executiveSearch(params);
  return <InTerm>{(campaign) => <ExecutiveScreen campaign={campaign} search={search} onSearch={(next) => router.setParams(searchParams(next))} />}</InTerm>;
}
