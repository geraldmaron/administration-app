import { router, useLocalSearchParams } from "expo-router";
import { Decision, type DecisionView } from "../../../../src/decision/Decision";
import { InTerm } from "../../../../src/shell/InTerm";

export default function DecisionPage() {
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>();
  const shown: DecisionView = view === "background" ? "background" : "advisers";
  return <InTerm>{(campaign) => <Decision key={id} campaign={campaign} id={id} view={shown} onView={(next) => router.setParams({ view: next === "advisers" ? undefined : next })} />}</InTerm>;
}
