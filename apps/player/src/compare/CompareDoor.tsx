import type { CompareMetricId, Subject } from "@admin/player-core";
import { Button } from "@admin/ui";
import { go } from "../shell/navigate";
import { compareHref } from "./subjects";

const YOU_THEN_AND_NOW: readonly Subject[] = [{ kind: "self" }, { kind: "self-at", turn: 1 }];

/** The one door from a reading to the comparison workspace on the same metric, set in the reading's head. */
export function CompareDoor({ metric, subjects = YOU_THEN_AND_NOW }: { readonly metric: CompareMetricId; readonly subjects?: readonly Subject[] }) {
  return (
    <Button kind="quiet" size="compact" icon="graph" onPress={() => go(compareHref({ metric, subjects, window: "term" }))}>
      Compare
    </Button>
  );
}
