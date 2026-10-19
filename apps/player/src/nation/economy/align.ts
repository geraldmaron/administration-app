/** A point on a shared horizontal axis: months since a stretch began, or a calendar year. */
export type AxisPoint = { readonly at: number; readonly label: string; readonly value: number | undefined };

export type Aligned = {
  /** Every position any series has a point at, ascending. */
  readonly positions: readonly number[];
  /** The label printed under each position: the first series' own label there, or the position itself. */
  readonly x: readonly string[];
  /** One value per position for each series; null where it published none. */
  readonly values: readonly (readonly (number | null)[])[];
};

/**
 * Several series lined up on one axis so a chart can draw them together. A
 * position a series does not cover is a gap, never an interpolated value.
 */
export function alignSeries(series: readonly (readonly AxisPoint[])[], label: (at: number) => string = String): Aligned {
  const positions = [...new Set(series.flatMap((points) => points.map((point) => point.at)))].sort((a, b) => a - b);
  const names = new Map<number, string>();
  for (const points of series) for (const point of points) if (!names.has(point.at)) names.set(point.at, point.label);
  return {
    positions,
    x: positions.map((at) => names.get(at) ?? label(at)),
    values: series.map((points) => {
      const byAt = new Map(points.map((point) => [point.at, point.value]));
      return positions.map((at) => {
        const value = byAt.get(at);
        return value === undefined ? null : value;
      });
    }),
  };
}
