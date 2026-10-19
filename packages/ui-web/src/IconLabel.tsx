import type { ReactNode } from "react";
import { Icon, type IconName, type IconWeight } from "./Icon";

export type IconLabelProps = {
  readonly icon: IconName;
  readonly size?: number;
  readonly weight?: IconWeight;
  readonly className?: string;
  readonly children: ReactNode;
};

export function IconLabel({ icon, size = 18, weight = "regular", className, children }: IconLabelProps) {
  return <span className={["ui-icon-label", className].filter(Boolean).join(" ")}><Icon name={icon} size={size} weight={weight} /><span>{children}</span></span>;
}
