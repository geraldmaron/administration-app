import { useLocalSearchParams } from "expo-router";
import { BudgetScreen, isBudgetView } from "../../../src/nation/budget/BudgetScreen";
import { paramOf, setSearchParams } from "../../../src/nation/params";
import { InNation } from "../../../src/nation/NationTrail";
import { InTerm } from "../../../src/shell/InTerm";

export default function BudgetRoute() {
  const view = paramOf(useLocalSearchParams<{ view?: string }>().view);
  return <InTerm>{(campaign) => <InNation room="budget"><BudgetScreen campaign={campaign} view={isBudgetView(view) ? view : "proposal"} onView={(next) => setSearchParams({ view: next === "proposal" ? undefined : next })} /></InNation>}</InTerm>;
}
