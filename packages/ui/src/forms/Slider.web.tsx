import { useRef, useState } from "react";
import { Frame, SliderParts, keyedValue, snap, type Key, type SliderProps } from "./slider-shared";

export type { SliderProps } from "./slider-shared";

type PointerLike = {
  readonly clientX: number;
  readonly buttons: number;
  readonly pointerId: number;
  readonly currentTarget: { getBoundingClientRect(): { left: number; width: number }; setPointerCapture(id: number): void };
};

/**
 * A value along a range on the web: dragged with a mouse or a finger through
 * pointer events, stepped with the arrow keys, and read by a screen reader as a
 * slider. React Native's responder handlers do not exist on a DOM element, so
 * the web draws the same slider with the events the browser has.
 */
export function Slider({ value, min, max, step = 1, onChange, valueText, label, centered, ...aria }: SliderProps) {
  const [width, setWidth] = useState(0);
  const latest = useRef(value);
  latest.current = value;
  const fraction = max === min ? 0 : (value - min) / (max - min);
  const set = (next: number) => {
    if (next !== latest.current) onChange(next);
  };
  const fromPointer = (event: PointerLike) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    setWidth(box.width);
    set(snap(min + ((event.clientX - box.left) / box.width) * (max - min), min, max, step));
  };
  const pointer = {
    onPointerDown: (event: PointerLike) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      fromPointer(event);
    },
    onPointerMove: (event: PointerLike) => {
      if (event.buttons === 1) fromPointer(event);
    },
  };
  return (
    <Frame
      {...aria}
      {...(pointer as object)}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      onKeyDown={(event: Key) => {
        const next = keyedValue(event.key, value, min, max, step);
        if (next === undefined) return;
        event.preventDefault();
        set(next);
      }}
      onLayout={(event: { nativeEvent: { layout: { width: number } } }) => setWidth(event.nativeEvent.layout.width)}
    >
      <SliderParts fraction={fraction} centered={centered} width={width} />
    </Frame>
  );
}
