/** Signed rates retain their negative observations; shared bars still consume 0..1 positions. */
export function legacyDomain(values: readonly number[], full = false): readonly [number, number] {
  if (full) return [0, 100];
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const padding = Math.max(1, (high - low) * 0.2);
  return [low < 0 ? low - padding : 0, high + padding];
}

export function legacyPosition(value: number, domain: readonly [number, number]): number {
  return Math.min(1, Math.max(0, (value - domain[0]) / (domain[1] - domain[0])));
}
