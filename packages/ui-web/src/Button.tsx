import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "./lib/utils";

/** Source-owned shadcn/ui button pattern; application kinds preserve action semantics. */
export const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-normal rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", {
  variants: {
    kind: {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      commit: "bg-primary text-primary-foreground hover:bg-primary/90",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      secondary: "border bg-background border-input hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
    },
    size: { md: "min-h-11 px-4 py-2", sm: "min-h-11 px-3 py-1.5" },
  },
  defaultVariants: { kind: "secondary", size: "md" },
});
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
export function buttonClass(kind: ButtonKind = "secondary", size: ButtonSize = "md", extra?: string): string {
  return cn(buttonVariants({ kind, size }), "ui-button", `ui-button--${kind}`, size === "sm" && "ui-button--sm", extra);
}
export function Button({ kind = "secondary", size = "md", icon, busy = false, className, children, type = "button", disabled, ref, asChild = false, ...rest }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component {...rest} ref={ref} type={asChild ? undefined : type} data-slot="button" className={buttonClass(kind, size, className)} disabled={disabled || busy} aria-busy={busy || undefined}>
    {asChild ? children : <>{busy ? <span className="ui-button__spinner" aria-hidden="true" /> : icon}<span className="ui-button__label">{children}</span></>}
  </Component>;
}
