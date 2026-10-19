import { PLACES, type Mode } from "@admin/player-core";
import { EmptyState } from "@admin/ui-web";
import { InTerm } from "./InTerm";
import { Screen, type ScreenClass } from "./Screen";

export type ModeRootProps = {
  readonly mode: Exclude<Mode, "brief">;
  readonly eyebrow: string;
  readonly screenClass: ScreenClass;
  readonly camera: string;
  readonly lens?: string;
  /** What this mode will hold, said plainly while it is being built. */
  readonly holds: string;
};

/** A mode's home while its screens are built: its camera, its name, and what it will hold. */
export function ModeRoot({ mode, eyebrow, screenClass, camera, lens, holds }: ModeRootProps) {
  return (
    <InTerm>
      {() => (
        <Screen title={PLACES[mode].title} eyebrow={eyebrow} screenClass={screenClass} camera={camera} {...(lens ? { lens } : {})}>
          <EmptyState icon="emptyRecord" title="Not built yet">
            {holds}
          </EmptyState>
        </Screen>
      )}
    </InTerm>
  );
}
