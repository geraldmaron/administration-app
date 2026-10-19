import { useLocalSearchParams } from "expo-router";
import { Dispatch } from "../../../../../src/news/Dispatch";
import { InTerm } from "../../../../../src/shell/InTerm";

/** One story opened whole; the address is the story's place in the campaign's feed. */
export default function DispatchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InTerm>{(campaign) => <Dispatch key={id} campaign={campaign} index={Number(id)} />}</InTerm>;
}
