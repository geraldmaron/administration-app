import { useLocalSearchParams } from "expo-router";
import { PressDesk } from "../../../../../src/news/PressScreen";
import { pressParams } from "../../../../../src/news/press-params";
import { InTerm } from "../../../../../src/shell/InTerm";

/** The press: coverage, the desks, the response desk and the press abroad, with the view and the feed's filters in the address. */
export default function PressRoute() {
  const params = pressParams(useLocalSearchParams());
  return <InTerm>{(campaign) => <PressDesk campaign={campaign} params={params} />}</InTerm>;
}
