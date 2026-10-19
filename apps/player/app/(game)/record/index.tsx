import { useLocalSearchParams } from "expo-router";
import { RecordScreen } from "../../../src/record/RecordScreen";
import { recordParams } from "../../../src/record/record-params";
import { InTerm } from "../../../src/shell/InTerm";

/** The Record: every entry of the term, searchable, with the open entry beside the list. */
export default function RecordRoute() {
  const params = recordParams(useLocalSearchParams());
  return <InTerm>{(campaign) => <RecordScreen campaign={campaign} params={params} />}</InTerm>;
}
