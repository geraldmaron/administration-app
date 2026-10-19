import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "./lib/utils";
export function Input({ className, type, ref, ...props }) {
    return _jsx("input", { ref: ref, type: type, "data-slot": "input", className: cn("ui-input flex min-h-11 w-full min-w-0 rounded-md border bg-background border-input px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className), ...props });
}
