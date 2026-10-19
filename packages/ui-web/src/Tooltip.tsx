import type { ComponentProps } from "react";
import * as Primitive from "@radix-ui/react-tooltip";
import { cn } from "./lib/utils";
export const TooltipProvider = Primitive.Provider;
export const Tooltip = Primitive.Root;
export const TooltipTrigger = Primitive.Trigger;
export function TooltipContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Content data-slot="tooltip-content" sideOffset={sideOffset} className={cn("ui-tooltip z-50 max-w-72 rounded-md bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md", className)} {...props} /></Primitive.Portal>;
}
