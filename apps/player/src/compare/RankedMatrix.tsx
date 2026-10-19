import { CompareMatrix, ReadingFrame, swatchEntries, type MatrixMetric, type MatrixRow } from "@admin/ui";

const SHADING = swatchEntries([
  { key: "bottom", label: "Bottom fifth of the column", ink: "dangerSoft" },
  { key: "low", label: "Second fifth", ink: "warningFill" },
  { key: "mid", label: "Middle fifth", ink: "pendingFill" },
  { key: "high", label: "Fourth fifth", ink: "infoFill" },
  { key: "top", label: "Top fifth", ink: "successFill" },
]);

/** Many subjects on many readings, framed with the key to the shading and how to read the ranks. */
export function RankedMatrix({ title, metrics, rows, initialSort }: { readonly title: string; readonly metrics: readonly MatrixMetric[]; readonly rows: readonly MatrixRow[]; readonly initialSort?: string }) {
  return (
    <ReadingFrame
      title="Where each number ranks"
      unit="Each box: the figure and its rank in the column"
      legend={SHADING}
      pressHint="Press a row to open its file. Press a column's name to sort by it."
      help={{ meaning: "Each box shows a number and where it ranks among the rows in its column. The shading shows where it falls, from the bottom fifth to the top fifth, and the rank is always printed too. Your own row stays in view when you sort." }}
    >
      <CompareMatrix title={title} metrics={metrics} rows={rows} {...(initialSort ? { initialSort } : {})} />
    </ReadingFrame>
  );
}
