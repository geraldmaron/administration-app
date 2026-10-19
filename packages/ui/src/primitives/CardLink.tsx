import type { ComponentProps, ReactNode } from "react";
import { Surface } from "./Surface";

export type CardLinkProps = Omit<ComponentProps<typeof Surface>, "children" | "onPress" | "role" | "interactive"> & {
  readonly href?: string;
  readonly onPress: () => void;
  /** What the card does, worded the way a screen reader should say it: "Open Barry Brock's file". */
  readonly label: string;
  readonly role?: "link" | "button";
  /** The card is the chosen one in a group (a selected state, an open office). */
  readonly selected?: boolean;
  readonly children: ReactNode;
};

/**
 * A card that is one press target across its whole box, not a heading or a
 * small link inside it. A control placed inside the card (a button, a link, a
 * field) still works on its own: on a device a touch goes to the innermost
 * pressable, and the web file does the same for clicks.
 */
export function CardLink({ href: _href, onPress, label, role = "link", selected, children, ...surface }: CardLinkProps) {
  return (
    <Surface interactive role={role} aria-label={label} aria-current={selected ? "true" : undefined} tabIndex={0} onPress={onPress} {...surface}>
      {children}
    </Surface>
  );
}
