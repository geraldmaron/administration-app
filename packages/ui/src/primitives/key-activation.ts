import { useRef } from "react";

export type ActivationKey = {
  readonly key: string;
  readonly target: unknown;
  readonly currentTarget: unknown;
  readonly repeat?: boolean;
  readonly defaultPrevented?: boolean;
  preventDefault(): void;
};

type Handlers<E extends ActivationKey> = { readonly onKeyDown?: (event: E) => void; readonly onKeyUp?: (event: E) => void; readonly onBlur?: (event: unknown) => void };

/**
 * The keys a native button answers, for a view drawn as `role="button"`: the
 * browser activates a real button on Enter as the key goes down and on Space
 * as it comes up, and does neither for a div. Only a key aimed at the control
 * itself counts, so Enter in a field inside a card does not press the card.
 * The caller's own handlers run first, and a key they prevent is theirs.
 */
export function keyActivation<E extends ActivationKey>(onPress: ((event: E) => void) | undefined, own: Handlers<E> = {}, spaceHeld: { current: boolean } = { current: false }): Handlers<E> {
  if (!onPress) return own;
  return {
    onKeyDown: (event) => {
      own.onKeyDown?.(event);
      if (event.defaultPrevented || event.target !== event.currentTarget) return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (!event.repeat) onPress(event);
      } else if (event.key === " ") {
        // Space scrolls the page unless the control claims it on the way down.
        event.preventDefault();
        spaceHeld.current = true;
      }
    },
    onKeyUp: (event) => {
      own.onKeyUp?.(event);
      // A Space that went down somewhere else, then moved focus here, does not press this control too.
      if (event.key !== " " || !spaceHeld.current) return;
      spaceHeld.current = false;
      if (event.defaultPrevented || event.target !== event.currentTarget) return;
      event.preventDefault();
      onPress(event);
    },
    // A Space held while focus leaves must not press this control when focus comes back before the key does.
    onBlur: (event) => {
      own.onBlur?.(event);
      spaceHeld.current = false;
    },
  };
}

/** `keyActivation` for a component, holding the Space latch across renders. */
export function useKeyActivation<E extends ActivationKey>(onPress: ((event: E) => void) | undefined, own: Handlers<E> = {}): Handlers<E> {
  const spaceHeld = useRef(false);
  if (!onPress) spaceHeld.current = false;
  return keyActivation(onPress, own, spaceHeld);
}
