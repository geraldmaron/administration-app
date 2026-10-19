import { useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Popover, Sheet } from "./Layer";

export type HelpTipProps = {
  /** What the button is about, said by a screen reader: "About approval". */
  readonly label: string;
  /** The short note: what it means, its basis or date, its uncertainty, what the President can do. Anything needed to act belongs on the screen. */
  readonly children: ReactNode;
  /** Deeper context, opened from the note into an inspector beside the page. */
  readonly more?: { readonly title: string; readonly body: ReactNode };
};

/**
 * The one help affordance: an "i" that opens a short note on click, tap or
 * Enter (never hover alone), anchored to it in the top layer so no card can
 * clip it. "More context" opens the deeper explanation in an inspector, and
 * closing that returns focus to the "i". A press on the "i" inside a card's
 * door opens only the note.
 */
export function HelpTip({ label, children, more }: HelpTipProps) {
  const [inspecting, setInspecting] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  return (
    <span className="ui-helptip">
      <Popover label={label} triggerClassName="ui-helptip__button" className="ui-helptip__bubble" triggerRef={(element) => (trigger.current = element)} trigger={<Icon name="info" size={16} />}>
        {(close) => (
          <>
            {children}
            {more ? (
              <Button
                kind="ghost" size="sm"
                type="button"
                className="ui-helptip__more"
                onClick={() => {
                  close();
                  setInspecting(true);
                }}
              >
                More context
              </Button>
            ) : null}
          </>
        )}
      </Popover>
      {more ? (
        <Sheet open={inspecting} onClose={() => setInspecting(false)} placement="side" title={more.title} returnFocus={() => trigger.current}>
          {more.body}
        </Sheet>
      ) : null}
    </span>
  );
}
