import type { Ref, SelectHTMLAttributes } from "react";
export type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    readonly ref?: Ref<HTMLSelectElement>;
};
/** shadcn NativeSelect pattern: native platform selection, shared field semantics and focus. */
export declare function NativeSelect({ className, ref, children, ...props }: NativeSelectProps): import("react").JSX.Element;
