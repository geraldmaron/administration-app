import { createFileRoute } from "@tanstack/react-router";
import { ContentsView } from "../handbook";
import { Screen } from "../shell/Screen";

/** The Handbook's contents. It works without an administration, like Settings. */
function HandbookContents() {
  return (
    <Screen icon="info" title="Handbook" eyebrow="How the game works" screenClass="workspace" camera="world">
      <ContentsView />
    </Screen>
  );
}

export const Route = createFileRoute("/handbook/")({ component: HandbookContents });
