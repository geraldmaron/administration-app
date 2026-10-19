import { useLocalSearchParams } from "expo-router";
import { HandbookPage } from "../../../src/handbook/HandbookPage";
import { TermsBody } from "../../../src/handbook/TermsBody";
import { TERMS_ID } from "../../../src/handbook/selectors";

/** Every word the game uses, A to Z; `?at=` lands on one term. */
export default function HandbookTerms() {
  const { at } = useLocalSearchParams<{ at?: string }>();
  return (
    <HandbookPage eyebrow="Handbook" title="All terms" lede="Every word the game uses, from A to Z. When a term comes from a law, you'll see that law beside it." current={TERMS_ID} {...(typeof at === "string" ? { landOn: at } : {})}>
      <TermsBody />
    </HandbookPage>
  );
}
