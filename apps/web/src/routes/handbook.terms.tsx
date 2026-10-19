import { createFileRoute } from "@tanstack/react-router";
import { HandbookLayout, TermsView, useHashScroll } from "../handbook";
import { Screen } from "../shell/Screen";

function HandbookTerms() {
  useHashScroll();
  return (
    <Screen icon="info" title="All terms" eyebrow="Handbook" lede="Every word the game uses, from A to Z." screenClass="workspace" camera="world">
      <HandbookLayout current="terms">
        <TermsView />
      </HandbookLayout>
    </Screen>
  );
}

export const Route = createFileRoute("/handbook/terms")({ component: HandbookTerms });
