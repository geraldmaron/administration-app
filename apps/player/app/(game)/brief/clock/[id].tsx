import { useLocalSearchParams } from "expo-router";
import { Clock } from "../../../../src/decision/ClockScreen";
import { InTerm } from "../../../../src/shell/InTerm";

export default function ClockPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InTerm>{(campaign) => <Clock key={id} campaign={campaign} id={id} />}</InTerm>;
}
