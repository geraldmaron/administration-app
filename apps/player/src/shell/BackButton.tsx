import { Button } from "@admin/ui";
import { back, cameFromInside } from "./navigate";

/**
 * The one way back from a working screen. It names where it goes: "Back" when
 * the player came from inside the game, the parent's name when they did not.
 */
export function BackButton({ parent, parentLabel }: { readonly parent: string; readonly parentLabel: string }) {
  const inside = cameFromInside();
  return (
    <Button kind="quiet" size="compact" icon="return" label={inside ? "Back to the previous screen" : `Open ${parentLabel}`} onPress={() => back(parent)}>
      {inside ? "Back" : parentLabel}
    </Button>
  );
}
