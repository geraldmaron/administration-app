import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Whether the system asks for reduced motion; read once and followed after. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (value) => live && setReduced(value),
      (cause: unknown) => console.warn("The system's motion setting could not be read; motion stays on.", cause),
    );
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
