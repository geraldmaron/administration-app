import { useLocalSearchParams } from "expo-router";
import { CaseScreen } from "../../../../../src/courts/CaseScreen";
import { InTerm } from "../../../../../src/shell/InTerm";

export default function CaseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InTerm>{(campaign) => <CaseScreen key={String(id)} campaign={campaign} id={String(id)} />}</InTerm>;
}
