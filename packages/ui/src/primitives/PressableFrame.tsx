import { createElement, type ComponentProps, type ComponentType } from "react";
import { View, styled } from "@tamagui/core";
import { useKeyActivation, type ActivationKey } from "./key-activation";

type KeyHandler = (event: ActivationKey) => void;
type KeyProps = { readonly onPress?: unknown; readonly onKeyDown?: unknown; readonly onKeyUp?: unknown; readonly onBlur?: unknown; readonly render?: unknown; readonly role?: unknown; readonly disabled?: unknown };

/**
 * A view drawn as `role="button"` answers Enter and Space the way a button
 * does. Drawn as an anchor it is a link, which the browser already opens on
 * Enter and which Space must not open, so it keeps only its own keys.
 */
export function withButtonKeys<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  function Keyed(props: P) {
    const { onPress, onKeyDown, onKeyUp, onBlur, render, role, disabled } = props as P & KeyProps;
    const inert = render === "a" || role === "link" || disabled === true;
    const keys = useKeyActivation(inert ? undefined : (onPress as KeyHandler | undefined), { onKeyDown: onKeyDown as KeyHandler | undefined, onKeyUp: onKeyUp as KeyHandler | undefined, onBlur: onBlur as ((event: unknown) => void) | undefined });
    return createElement(Component, { ...props, ...keys });
  }
  Keyed.displayName = `Keyed(${Component.displayName ?? Component.name})`;
  return Keyed;
}

const Frame = styled(View, {
  name: "Pressable",
  role: "button",
  tabIndex: 0,
  cursor: "pointer",
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 2,
  outlineWidth: { default: 0, "focus-visible": 2 },
  borderRadius: "control",
  backgroundColor: { default: "transparent", hover: "surfaceHover", press: "backgroundPress" },
});

/** A bare pressable area with the shared focus ring, for rows and cards that are doors. */
export const PressableFrame = withButtonKeys(Frame as ComponentType<ComponentProps<typeof Frame>>);
