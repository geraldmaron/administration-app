import type { InputHTMLAttributes, Ref } from "react";
export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    readonly ref?: Ref<HTMLInputElement>;
};
export declare function Input({ className, type, ref, ...props }: InputProps): import("react").JSX.Element;
