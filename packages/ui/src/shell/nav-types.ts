import type { ComponentType, ReactNode } from "react";
import type { IconName } from "../icons/Icon";

export type NavItem = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: IconName;
  /** New since the President last looked. */
  readonly fresh?: number;
  /** Waiting on a decision. */
  readonly waiting?: number;
};

export type NavGroup = {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly items: readonly NavItem[];
};

/**
 * The router's link, handed in by the app: the design system names where a
 * press goes but never imports a router, so the same shell serves any host.
 */
export type LinkComponent = ComponentType<{ readonly href: string; readonly children: ReactNode; readonly label?: string; readonly current?: boolean }>;
