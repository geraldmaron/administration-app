import { View } from "@tamagui/core";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { useInk } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { STANDARD_DASH, type KeyEntry, type KeyInk, type KeyShape } from "./key-entries";

const W = 22;
const H = 14;
const MID = H / 2;

/** An entry's ink as a color: a theme role resolves through the theme, an exact color passes through. */
function useKeyInk(ink: KeyInk): string {
  const role = useInk(typeof ink === "string" ? ink : "color");
  return typeof ink === "string" ? role : ink.color;
}

const SHAPE_PATH: Readonly<Record<Exclude<KeyShape, "circle">, string>> = {
  square: "M5 1 H17 V13 H5 Z",
  diamond: `M11 0.5 L17.5 ${MID} L11 13.5 L4.5 ${MID} Z`,
  triangleUp: "M11 1 L17.5 13 H4.5 Z",
  triangleDown: "M4.5 1 H17.5 L11 13 Z",
};

function ShapeSample({ shape, ink, hollow }: { readonly shape: KeyShape; readonly ink: string; readonly hollow: boolean }) {
  const paint = hollow ? { fill: "none", stroke: ink, strokeWidth: 2 } : { fill: ink };
  return shape === "circle" ? <Circle cx={W / 2} cy={MID} r={5.5} {...paint} /> : <Path d={SHAPE_PATH[shape]} strokeLinejoin="round" {...paint} />;
}

/**
 * One entry drawn the way its chart draws it: a filled swatch, a solid or
 * dashed line (over a see-through band for a range), a dot, a ring, a tick
 * across a track, or a shape. Decorative: the words beside it are the entry.
 * `size` draws only the square middle at that size, for a chart that uses the
 * same glyph as its mark (a day's urgency).
 */
export function KeySample({ entry, size }: { readonly entry: KeyEntry; readonly size?: number }) {
  const ink = useKeyInk(entry.ink);
  const edge = useInk("borderColorStrong");
  const weight = entry.weight ?? 2;
  const dash = entry.dash ?? (entry.kind === "dash" ? STANDARD_DASH : undefined);
  const stroke = { stroke: ink, strokeWidth: weight, ...(dash ? { strokeDasharray: dash } : {}) };
  const sample = (() => {
    switch (entry.kind) {
      case "swatch":
        return <Rect x={5} y={1} width={12} height={12} rx={2} fill={entry.hollow ? "none" : ink} stroke={entry.hollow ? ink : edge} strokeWidth={entry.hollow ? 2 : 1} />;
      case "line":
      case "dash":
        return (
          <>
            {entry.band ? <Rect x={1} y={2} width={W - 2} height={H - 4} fill={ink} opacity={0.22} /> : null}
            {entry.band ? (
              <>
                <Line x1={1} x2={W - 1} y1={2} y2={2} {...stroke} />
                <Line x1={1} x2={W - 1} y1={H - 2} y2={H - 2} {...stroke} />
              </>
            ) : (
              <Line x1={1} x2={W - 1} y1={MID} y2={MID} {...stroke} />
            )}
          </>
        );
      case "tick":
        return <Line x1={W / 2} x2={W / 2} y1={0} y2={H} {...stroke} />;
      case "dot":
        return <Circle cx={W / 2} cy={MID} r={5} fill={entry.hollow ? "none" : ink} {...(entry.hollow ? { stroke: ink, strokeWidth: 2 } : {})} />;
      case "ring":
        return <Circle cx={W / 2} cy={MID} r={5} fill="none" stroke={ink} strokeWidth={entry.weight ?? 2} />;
      case "shape":
        return <ShapeSample shape={entry.shape ?? "square"} ink={ink} hollow={entry.hollow ?? false} />;
    }
  })();
  return (
    <View width={size ?? W} height={size ?? H} flexShrink={0} opacity={entry.faint ? 0.35 : 1} aria-hidden>
      {size ? (
        <Svg width={size} height={size} viewBox={`${(W - H) / 2} 0 ${H} ${H}`}>
          {sample}
        </Svg>
      ) : (
        <Svg width={W} height={H}>
          {sample}
        </Svg>
      )}
    </View>
  );
}

const spoken = (entry: KeyEntry) => (entry.figure === undefined ? entry.label : `${entry.label}: ${entry.figure}`);

export type KeyProps = {
  readonly entries: readonly KeyEntry[];
  /** What the key is for, said to a screen reader and, with `title`, printed over it. */
  readonly label?: string;
  /** Printed as "Key · title" above the entries: the lens or measure the key decodes. */
  readonly title?: string;
  /** One entry to a line, for a key that reads as a list (benchmarks, a long party roll). */
  readonly stacked?: boolean;
};

/**
 * What every mark on a drawn reading means: a list of samples, each drawn
 * the way the chart draws it, with its words and count. A screen reader hears
 * it as a list of those words; nothing is hidden from it.
 */
export function Key({ entries, label, title, stacked = false }: KeyProps) {
  if (entries.length === 0) return null;
  const list = (
    <View flexDirection={stacked ? "column" : "row"} flexWrap="wrap" columnGap="md" rowGap="xs" maxWidth="100%" flexShrink={1} role="list" aria-label={label ?? (title ? `Key: ${title}` : "Key")}>
      {entries.map((entry) => (
        <Row key={entry.id} gap="xs" maxWidth="100%" flexShrink={1} role="listitem" aria-label={spoken(entry)}>
          <KeySample entry={entry} />
          <Text variant="caption" tone="secondary" flexShrink={1}>
            {entry.label}
            {entry.figure !== undefined ? (
              <Text variant="caption" weight="strong" tone="primary" tabular>
                {` ${entry.figure}`}
              </Text>
            ) : null}
          </Text>
        </Row>
      ))}
    </View>
  );
  if (!title) return list;
  // Beside other keys in a wrapping row, a titled key shrinks to the row rather than holding its widest line.
  return (
    <Column gap="xs" maxWidth="100%" flexShrink={1} minWidth={0}>
      <Text variant="eyebrow" tone="secondary" aria-hidden>
        Key · {title}
      </Text>
      {list}
    </Column>
  );
}
