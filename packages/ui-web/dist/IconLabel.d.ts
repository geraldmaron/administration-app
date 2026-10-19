import type { ReactNode } from "react";
import { type IconName, type IconWeight } from "./Icon";
export type IconLabelProps = {
    readonly icon: IconName;
    readonly size?: number;
    readonly weight?: IconWeight;
    readonly className?: string;
    readonly children: ReactNode;
};
export declare function IconLabel({ icon, size, weight, className, children }: IconLabelProps): import("react").JSX.Element;
