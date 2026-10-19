import { ContentsBody, HandbookPage } from "../../../src/handbook/HandbookPage";

/** The Handbook's contents. It reads without an administration, like Settings. */
export default function HandbookContents() {
  return (
    <HandbookPage eyebrow="How the game works" title="Handbook">
      <ContentsBody />
    </HandbookPage>
  );
}
