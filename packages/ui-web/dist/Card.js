import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "./lib/utils";
/** Source-owned shadcn/ui Card structure, with shared compact analytical spacing. */
export function Card({ className, ...props }) {
    return _jsx("div", { "data-slot": "card", className: cn("ui-card rounded-xl border bg-card text-card-foreground shadow-sm", className), ...props });
}
export function CardHeader({ className, ...props }) {
    return _jsx("div", { "data-slot": "card-header", className: cn("ui-card__header flex gap-1.5 flex-col p-5", className), ...props });
}
export function CardTitle({ className, ...props }) {
    return _jsx("h3", { "data-slot": "card-title", className: cn("ui-card__title text-base font-semibold leading-none tracking-tight", className), ...props });
}
export function CardDescription({ className, ...props }) {
    return _jsx("p", { "data-slot": "card-description", className: cn("ui-card__description text-sm text-muted-foreground", className), ...props });
}
export function CardContent({ className, ...props }) {
    return _jsx("div", { "data-slot": "card-content", className: cn("ui-card__content p-5 pt-0", className), ...props });
}
export function CardFooter({ className, ...props }) {
    return _jsx("div", { "data-slot": "card-footer", className: cn("ui-card__footer flex items-center gap-2 p-5 pt-0", className), ...props });
}
