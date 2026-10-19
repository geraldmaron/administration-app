import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { rememberDeparture } from "./return-context";

export type DoorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { readonly href: string; readonly children: ReactNode };

/**
 * A plain anchor that hands an ordinary click to the router, so a door built
 * from a player-core href navigates in place while a modified click still
 * opens a tab.
 */
export function Door({ href, children, onClick, ...rest }: DoorProps) {
  const navigate = useNavigate();
  return (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        rememberDeparture(event.currentTarget);
        event.preventDefault();
        void navigate({ href });
      }}
    >
      {children}
    </a>
  );
}
