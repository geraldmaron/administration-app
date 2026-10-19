import { Ending } from "../src/ending/Ending";
import { InTerm } from "../src/shell/InTerm";

/** How the presidency ended, read once the term has closed. */
export default function EndingRoute() {
  return <InTerm>{(campaign) => <Ending campaign={campaign} />}</InTerm>;
}
