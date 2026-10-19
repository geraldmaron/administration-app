import { useEffect, useState } from "react";

/** The value once it has stopped changing for `ms`: a projection starts on the draft a player has settled on, not on every step of a drag. */
export function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
