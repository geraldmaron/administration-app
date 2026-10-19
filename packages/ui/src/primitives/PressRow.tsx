import type { ComponentProps, ReactNode } from "react";
import { Pressable } from "./Button";

export type PressRowProps = Omit<ComponentProps<typeof Pressable>, "children" | "onPress" | "role"> & {
  readonly onPress: () => void;
  /** What a press does, the way a screen reader should say it: "Open Ohio". */
  readonly label?: string;
  /** "row" keeps a table's rows and cells readable; "link" for a list entry that is a door. */
  readonly role?: "row" | "link" | "button";
  /** The chosen row in a set the screen is showing. */
  readonly selected?: boolean;
  readonly children: ReactNode;
};

/**
 * A row (of a table, a list, a timeline) that is one press target across
 * its whole width, with hover, press and focus states. A button or link set
 * inside it still works on its own: on a device a touch goes to the
 * innermost pressable, and the web file does the same for clicks. CardLink
 * is the same idea for a card that has its own surface.
 */
export function PressRow({ onPress, label, role = "link", selected, children, ...rest }: PressRowProps) {
  return (
    <Pressable role={role} aria-label={label} aria-current={selected ? "true" : undefined} onPress={onPress} borderRadius={0} {...rest}>
      {children}
    </Pressable>
  );
}
