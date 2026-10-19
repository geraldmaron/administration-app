import type { ComponentProps } from "react";
import * as Primitive from "@radix-ui/react-tooltip";
export declare const TooltipProvider: import("react").FC<Primitive.TooltipProviderProps>;
export declare const Tooltip: import("react").FC<Primitive.TooltipProps>;
export declare const TooltipTrigger: import("react").ForwardRefExoticComponent<Primitive.TooltipTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
export declare function TooltipContent({ className, sideOffset, ...props }: ComponentProps<typeof Primitive.Content>): import("react").JSX.Element;
