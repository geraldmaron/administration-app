import type { KeyboardEvent } from "react";
import { Surface } from "./Surface";
import type { CardLinkProps } from "./CardLink";
import { landedOnCard, type Pressed } from "./press-target";
import { anchorHref, DOOR_STYLE, pressLink, type LinkPress } from "./link-press";

export type { CardLinkProps } from "./CardLink";

export function CardLink({ href, onPress, label, role = "link", selected, children, ...surface }: CardLinkProps) {
  const press = (event: Pressed) => {
    if (href) pressLink(event as LinkPress, onPress);
    else if (landedOnCard(event)) onPress();
  };
  const key = (event: KeyboardEvent) => {
    if (href) return;
    if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
      event.preventDefault();
      onPress();
    }
  };
  return (
    <Surface interactive {...(href ? { render: "a", href: anchorHref(href), style: DOOR_STYLE } as const : {})} role={href ? "link" : role === "link" ? "button" : role} aria-label={label} aria-current={selected ? "true" : undefined} tabIndex={0} onPress={press as never} onKeyDown={key as never} {...surface}>
      {children}
    </Surface>
  );
}
