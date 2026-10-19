import type { Ref, SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { cn } from "./lib/utils";

export type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & { readonly ref?: Ref<HTMLSelectElement> };

/** shadcn NativeSelect pattern: native platform selection, shared field semantics and focus. */
export function NativeSelect({ className, ref, children, ...props }: NativeSelectProps) {
  return <div data-slot="native-select-wrapper" className="ui-native-select">
    <select ref={ref} data-slot="native-select" className={cn("ui-input", className)} {...props}>{children}</select>
    <Icon name="chevron" size={16} className="ui-native-select__chevron" />
  </div>;
}
