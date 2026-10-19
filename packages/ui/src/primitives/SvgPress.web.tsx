import { useState, type KeyboardEvent } from "react";
import type { SvgPressProps } from "./SvgPress";

export type { SvgPressProps } from "./SvgPress";

/**
 * The same group on the web, drawn as a plain SVG element. react-native-svg's
 * web build replaces any click handler a shape is given with its own press
 * value, and its press support puts React Native responder props on the DOM,
 * so the web draws the group itself and lets the browser's click do the work.
 * Hover, press and keyboard focus all light the highlight.
 */
export function SvgPress({ onPress, opacity, children, highlight, label }: SvgPressProps) {
  const [active, setActive] = useState(false);
  if (!onPress) return <g opacity={opacity}>{children}</g>;
  const on = () => setActive(true);
  const off = () => setActive(false);
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onPress();
  };
  return (
    <g
      opacity={opacity}
      onClick={onPress}
      onMouseEnter={on}
      onMouseLeave={off}
      onFocus={on}
      onBlur={off}
      style={{ cursor: "pointer", outline: "none" }}
      {...(label ? { tabIndex: 0, role: "button", "aria-label": label, onKeyDown } : {})}
    >
      {children}
      {active ? highlight : null}
    </g>
  );
}
