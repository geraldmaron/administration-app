import { useState, type ReactNode } from "react";
import { G } from "react-native-svg";

export type SvgPressProps = {
  readonly onPress?: (() => void) | undefined;
  readonly opacity?: number;
  readonly children: ReactNode;
  /**
   * Drawn over the mark while a finger or pointer is on it or the keyboard is
   * on it (a ring round a seat, an outline round a column), so a pressable
   * mark shows it is one on every platform, not only by a web cursor.
   */
  readonly highlight?: ReactNode;
  /** Names the mark and, on the web, puts it in the tab order; marks a list beside the chart already reaches stay out of it. */
  readonly label?: string;
};

/** A group of SVG shapes that can be pressed. On a device it is react-native-svg's own group, lit while the finger is down. */
export function SvgPress({ onPress, opacity, children, highlight }: SvgPressProps) {
  const [active, setActive] = useState(false);
  return (
    <G {...(opacity === undefined ? {} : { opacity })} {...(onPress ? { onPress, onPressIn: () => setActive(true), onPressOut: () => setActive(false) } : {})}>
      {children}
      {onPress && active ? highlight : null}
    </G>
  );
}
