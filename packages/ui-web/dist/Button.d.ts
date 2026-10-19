import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
/** Source-owned shadcn/ui button pattern; application kinds preserve action semantics. */
export declare const buttonVariants: (props?: ({
    kind?: "secondary" | "primary" | "commit" | "danger" | "ghost" | null | undefined;
    size?: "md" | "sm" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export type ButtonKind = "primary" | "commit" | "danger" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    readonly ref?: Ref<HTMLButtonElement>;
    readonly kind?: ButtonKind;
    readonly size?: ButtonSize;
    readonly icon?: ReactNode;
    readonly busy?: boolean;
    readonly asChild?: boolean;
};
export declare function buttonClass(kind?: ButtonKind, size?: ButtonSize, extra?: string): string;
export declare function Button({ kind, size, icon, busy, className, children, type, disabled, ref, asChild, ...rest }: ButtonProps): import("react").JSX.Element;
