import { View } from "@tamagui/core";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useInk } from "../icons/Icon";

/** What the frame's light says about the clock: nothing owed, matters waiting, or a matter holding time. */
export type AttentionState = "clear" | "waiting" | "held";

const LIGHT_HEIGHT = 360;
const GRADIENT_ID = "attention-light";

/**
 * A wide wash of light at the top of the work plane that tints with what the
 * clock is waiting on. It is decoration only: the command bar's pip and word
 * say the same thing in text, and the contrast themes set the roles
 * transparent so nothing relies on it.
 */
export function AttentionLight({ state }: { readonly state: AttentionState }) {
  const waiting = useInk("attentionWaiting");
  const held = useInk("attentionHeld");
  if (state === "clear") return null;
  const color = state === "held" ? held : waiting;
  return (
    <View position="absolute" top={0} left={0} right={0} height={LIGHT_HEIGHT} pointerEvents="none" aria-hidden>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={GRADIENT_ID} cx="50%" cy="0%" rx="60%" ry="100%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${GRADIENT_ID})`} />
      </Svg>
    </View>
  );
}
