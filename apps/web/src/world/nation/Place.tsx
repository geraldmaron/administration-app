import type { ReactNode } from "react";
import { Door } from "../../shell/Door";
import { useBuilt } from "../../shell/built-routes";

/**
 * A door to a screen that may not be built yet. Where the route exists it is a
 * link; where a later build adds it, the words stand alone rather than point
 * at nothing.
 */
export function Place({ href, className, children }: { readonly href: string; readonly className?: string; readonly children: ReactNode }) {
  const built = useBuilt();
  return built(href) ? (
    <Door href={href} {...(className ? { className } : {})}>
      {children}
    </Door>
  ) : (
    <span {...(className ? { className } : {})}>{children}</span>
  );
}
