import { useLocalSearchParams } from "expo-router";
import { RecordScreen } from "../../../../src/record/RecordScreen";
import { recordParams } from "../../../../src/record/record-params";
import { InTerm } from "../../../../src/shell/InTerm";

/** One entry of the Record opened beside the list; the address is the deep link every receipt points to. */
export default function RecordEventRoute() {
  const { id, ...rest } = useLocalSearchParams<{ id: string }>();
  const params = { ...recordParams(rest), entry: id };
  return <InTerm>{(campaign) => <RecordScreen campaign={campaign} params={params} standalone />}</InTerm>;
}
