import { useRef, useState } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import { Frame, SliderParts, keyedValue, snap, type Key, type SliderProps } from "./slider-shared";

export type { SliderProps } from "./slider-shared";

/**
 * A value along a range: dragged or pressed on the track, stepped with the
 * arrows on a keyboard, and adjusted by swipe under a screen reader. The
 * track is the only touch target, so a press anywhere on it lands there.
 */
export function Slider({ value, min, max, step = 1, onChange, valueText, label, centered, ...aria }: SliderProps) {
  const [width, setWidth] = useState(0);
  const latest = useRef(value);
  latest.current = value;
  const fraction = max === min ? 0 : (value - min) / (max - min);
  const set = (next: number) => {
    if (next !== latest.current) onChange(next);
  };
  const fromTouch = (event: GestureResponderEvent) => {
    if (width > 0) set(snap(min + (event.nativeEvent.locationX / width) * (max - min), min, max, step));
  };
  return (
    <Frame
      {...aria}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event: { nativeEvent: { actionName: string } }) => set(snap(value + (event.nativeEvent.actionName === "increment" ? step : -step), min, max, step))}
      onKeyDown={(event: Key) => {
        const next = keyedValue(event.key, value, min, max, step);
        if (next === undefined) return;
        event.preventDefault();
        set(next);
      }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={fromTouch}
      onResponderMove={fromTouch}
    >
      <SliderParts fraction={fraction} centered={centered} width={width} />
    </Frame>
  );
}
