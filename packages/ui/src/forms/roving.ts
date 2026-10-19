import { useRef } from "react";
import type { TamaguiElement } from "@tamagui/core";

type KeyEvent = { readonly key: string; preventDefault(): void };
type Focusable = { focus?: () => void };

const STEP: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * One tab stop for a group of radios, with the arrows moving the choice, the
 * way a native radio group behaves: Tab enters at the chosen option (or the
 * first), arrows choose and focus the neighbor, Home and End jump to the ends.
 */
export function useRoving<T>(values: readonly T[], selected: T | undefined, onChange: (value: T) => void) {
  const nodes = useRef<(Focusable | null)[]>([]);
  const chosen = selected === undefined ? -1 : values.indexOf(selected);
  const move = (next: number) => {
    const value = values[next];
    if (value === undefined) return;
    onChange(value);
    nodes.current[next]?.focus?.();
  };
  return {
    refFor: (index: number) => (node: TamaguiElement | null) => {
      nodes.current[index] = node as Focusable | null;
    },
    tabIndexFor: (index: number): 0 | -1 => (index === (chosen === -1 ? 0 : chosen) ? 0 : -1),
    keyDownFor: (index: number) => (event: KeyEvent) => {
      const last = values.length - 1;
      const target = event.key === "Home" ? 0 : event.key === "End" ? last : STEP[event.key] === undefined ? undefined : (index + STEP[event.key]! + values.length) % values.length;
      if (target === undefined) return;
      event.preventDefault();
      move(target);
    },
  };
}
