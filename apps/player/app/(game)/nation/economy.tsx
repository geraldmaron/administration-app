import { useLocalSearchParams } from "expo-router";
import { EconomyScreen } from "../../../src/nation/economy/EconomyScreen";
import { economyParams, economySearch, type EconomySearch } from "../../../src/nation/economy/search";
import { setSearchParams } from "../../../src/nation/params";
import { InNation } from "../../../src/nation/NationTrail";
import { InTerm } from "../../../src/shell/InTerm";

export default function EconomyRoute() {
  const search = economySearch(useLocalSearchParams());
  const onSearch = (patch: { readonly [K in keyof EconomySearch]?: EconomySearch[K] | undefined }) => setSearchParams(economyParams({ ...search, ...patch } as EconomySearch));
  return <InTerm>{(campaign) => <InNation room="economy"><EconomyScreen campaign={campaign} search={search} onSearch={onSearch} /></InNation>}</InTerm>;
}
