import { useLocalSearchParams } from "expo-router";
import { NationHome } from "../../../src/nation/home/NationHome";
import { nationParams, nationSearch, type NationPatch } from "../../../src/nation/home/search";
import { setSearchParams } from "../../../src/nation/params";
import { InNation } from "../../../src/nation/NationTrail";
import { InTerm } from "../../../src/shell/InTerm";

export default function NationRoute() {
  const search = nationSearch(useLocalSearchParams());
  const onSearch = (patch: NationPatch) => setSearchParams(nationParams({ ...search, ...patch }));
  return <InTerm>{(campaign) => <InNation room="overview"><NationHome campaign={campaign} search={search} onSearch={onSearch} /></InNation>}</InTerm>;
}
