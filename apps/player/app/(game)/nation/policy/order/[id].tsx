import { useLocalSearchParams } from "expo-router";
import { paramOf, setSearchParams } from "../../../../../src/nation/params";
import { OrderScreen } from "../../../../../src/nation/policy/OrderScreen";
import { InNation } from "../../../../../src/nation/NationTrail";
import { InTerm } from "../../../../../src/shell/InTerm";

export default function OrderRoute() {
  const params = useLocalSearchParams<{ id: string; record?: string }>();
  const id = paramOf(params.id) ?? "";
  const record = paramOf(params.record);
  return <InTerm>{(campaign) => <InNation room="policy"><OrderScreen key={id} campaign={campaign} id={id} recordId={record && record.length <= 200 ? record : undefined} onRecord={(next) => setSearchParams({ record: next })} /></InNation>}</InTerm>;
}
