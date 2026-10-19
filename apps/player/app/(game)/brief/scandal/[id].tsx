import { useLocalSearchParams } from "expo-router";
import { Story } from "../../../../src/decision/ScandalScreen";
import { InTerm } from "../../../../src/shell/InTerm";

export default function ScandalPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InTerm>{(campaign) => <Story key={id} campaign={campaign} id={id} />}</InTerm>;
}
