import type { KeyboardEvent } from "react";
import { Pressable } from "./Button";
import { landedOnCard, type Pressed } from "./press-target";
import type { PressRowProps } from "./PressRow";

export type { PressRowProps } from "./PressRow";

export function PressRow({ href, onPress, label, role = "link", selected, children, ...rest }: PressRowProps) {
  const press = (event: Pressed) => {
    if (landedOnCard(event)) onPress();
  };
  const key = (event: KeyboardEvent) => {
    if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
      event.preventDefault();
      onPress();
    }
  };
  if (href) {
    // A row's cells hold their own links, and an anchor cannot hold an anchor. The row is a plain
    // press area that routes a click on its cells; the real link is an anchor laid under the cells
    // (negative z-index inside the row's own stacking context), so the keyboard, the context menu and
    // an open-in-new-tab still reach the destination.
    return (
      <Pressable role={role === "link" ? "group" : role} aria-current={selected ? "true" : undefined} position="relative" zIndex={0} tabIndex={-1} onPress={press as never} borderRadius={0} {...rest}>
        <Pressable href={href} role="link" aria-label={label} position="absolute" zIndex={-1} top={0} right={0} bottom={0} left={0} borderRadius={0} onPress={onPress as never} />
        {children}
      </Pressable>
    );
  }
  return (
    <Pressable role={role === "link" ? "button" : role} aria-label={label} aria-current={selected ? "true" : undefined} tabIndex={0} onPress={press as never} onKeyDown={key as never} borderRadius={0} {...rest}>
      {children}
    </Pressable>
  );
}
