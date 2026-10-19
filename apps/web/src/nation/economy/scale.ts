/** A chart's ends around its values, padded a tenth of the span either side so a flat line is not drawn on the frame. */
export function domainOf(values: readonly number[]): readonly [number, number] {
  if (values.length === 0) return [0, 1];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low) * 0.1 || Math.abs(high) * 0.05 || 1;
  return [low - pad, high + pad];
}
