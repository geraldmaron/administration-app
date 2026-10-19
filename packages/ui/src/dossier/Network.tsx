import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { View } from "@tamagui/core";
import Svg, { Defs, Line, Marker, Path } from "react-native-svg";
import { Key } from "../data/Key";
import { Icon, useInk, type IconName } from "../icons/Icon";
import { Pressable } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { tieKeyEntries } from "./keys";
import { Monogram, READ_INK, type ReadTone } from "./Readings";

export type TieNodeView = {
  readonly id: string;
  readonly name: string;
  /** Percent across the plot. */
  readonly x: number;
  /** Pixels down the plot. */
  readonly y: number;
  readonly kind: string;
  readonly tone: ReadTone;
  /** Grows the face: how many contacts the person carries in this scope. */
  readonly reach: number;
  readonly spoken: string;
  readonly href?: string;
};

export type TieLinkView = { readonly id: string; readonly from: { readonly x: number; readonly y: number }; readonly to: { readonly x: number; readonly y: number }; readonly evidence: "recorded" | "inferred"; readonly tone: ReadTone; readonly strength: number };

export type TieMapProps = {
  readonly subject: { readonly name: string; readonly x: number; readonly y: number };
  readonly nodes: readonly TieNodeView[];
  readonly links: readonly TieLinkView[];
  readonly height: number;
  readonly headings: readonly { readonly label: string; readonly y: number }[];
  /** Spokes from the top: formal membership, never personal trust. */
  readonly formalHub?: boolean;
  readonly label: string;
  readonly onOpen: (id: string) => void;
  /** Print the key for the rings and lines under the map; off when the screen's frame keys it. */
  readonly keyed?: boolean;
};

// Half the widest face plus its ring, so a line stops at the face's edge and its arrowhead stays visible.
const FACE_CLEARANCE = 28;

/** The segment between two face centers, pulled back from each face by its clearance. */
function trimmed(x1: number, y1: number, x2: number, y2: number) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length <= FACE_CLEARANCE * 2) return { x1, y1, x2, y2 };
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  return { x1: x1 + ux * FACE_CLEARANCE, y1: y1 + uy * FACE_CLEARANCE, x2: x2 - ux * FACE_CLEARANCE, y2: y2 - uy * FACE_CLEARANCE };
}

function Lines({ links, nodes, height, width, formalHub }: Pick<TieMapProps, "links" | "nodes" | "height" | "formalHub"> & { readonly width: number }) {
  const neutral = useInk("colorTertiary");
  const good = useInk("successInk");
  const bad = useInk("danger");
  const gold = useInk("goldRule");
  const ink = (tone: ReadTone) => (tone === "good" ? good : tone === "bad" ? bad : neutral);
  const x = (percent: number) => (percent / 100) * width;
  return (
    <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <Marker id="tie-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <Path d="M0 0 L10 5 L0 10 Z" fill={neutral} />
        </Marker>
      </Defs>
      {formalHub ? nodes.map((node) => <Line key={`hub:${node.id}`} {...trimmed(x(50), 20, x(node.x), node.y)} stroke={gold} strokeWidth={1} />) : null}
      {links.map((link) => (
        <Line key={link.id} {...trimmed(x(link.from.x), link.from.y, x(link.to.x), link.to.y)} stroke={ink(link.tone)} strokeWidth={1 + link.strength * 2} strokeDasharray={link.evidence === "inferred" ? "6 5" : undefined} markerEnd={link.evidence === "recorded" ? "url(#tie-arrow)" : undefined} />
      ))}
    </Svg>
  );
}

/** Public ties around one official, drawn as faces around the subject; every face is a door to its dossier. */
export function TieMap({ keyed = true, ...props }: TieMapProps) {
  if (!keyed) return <TieField {...props} />;
  return (
    <View gap="sm">
      <TieField {...props} />
      <Key entries={tieKeyEntries(props)} label="What the rings and lines mean" />
    </View>
  );
}

function TieField({ subject, nodes, links, height, headings, formalHub, label, onOpen }: Omit<TieMapProps, "keyed">) {
  const [width, setWidth] = useState(0);
  return (
    <View position="relative" height={height} width="100%" role="group" aria-label={label} borderRadius="card" backgroundColor="backgroundStrong" overflow="hidden" onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? <Lines links={links} nodes={nodes} height={height} width={width} formalHub={formalHub} /> : null}
      {headings.map((heading) => (
        <Text key={heading.label} position="absolute" top={heading.y} left={12} variant="eyebrow" tone="tertiary" backgroundColor="backgroundStrong" paddingHorizontal="2xs">
          {heading.label}
        </Text>
      ))}
      <View position="absolute" top={subject.y - 32} left={`${subject.x}%`} marginLeft={-32} alignItems="center">
        <Monogram name={subject.name} size={64} />
      </View>
      {nodes.map((node) => (
        <Pressable href={node.href} key={node.id} onPress={() => onOpen(node.id)} role="link" aria-label={node.spoken} position="absolute" top={node.y - 24} left={`${node.x}%`} marginLeft={-48} width={96} alignItems="center" gap="2xs" padding="2xs" borderWidth={1} borderColor={{ default: "transparent", hover: "borderColorStrong", press: "borderColorStrong" }}>
          <View borderWidth={2} borderColor={READ_INK[node.tone]} borderRadius="pill">
            <Monogram name={node.name} size={Math.round(36 * (1 + Math.min(0.28, node.reach * 0.06)))} />
          </View>
          <Text variant="caption" weight="strong" numberOfLines={1} center backgroundColor="backgroundStrong" paddingHorizontal="2xs">
            {node.name.split(" ").slice(-1)[0]}
          </Text>
          <Text variant="caption" tone="tertiary" numberOfLines={1} center backgroundColor="backgroundStrong" paddingHorizontal="2xs">
            {node.kind}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export type CareerBandView = { readonly key: string; readonly label: string; readonly icon: IconName; readonly from: number; readonly width: number; readonly years: string };

/** A working life as bands along the years it covers, each as long as the stint was, with its field's mark. A gap is drawn as a gap. */
export function CareerBands({ bands }: { readonly bands: readonly CareerBandView[] }) {
  if (bands.length === 0) return null;
  return (
    <Column gap="sm" role="list" aria-label="Career by years">
      {bands.map((band) => (
        <Row key={band.key} gap="sm" role="listitem" aria-label={`${band.label}, ages ${band.years}`}>
          <Icon name={band.icon} size={16} tone="gold" />
          <Text variant="caption" width={150} numberOfLines={2}>
            {band.label}
          </Text>
          <View flex={1} height={10} borderRadius="pill" backgroundColor="borderColor" position="relative">
            <View position="absolute" top={0} bottom={0} left={`${band.from}%`} width={`${band.width}%`} borderRadius="pill" backgroundColor="accent" />
          </View>
          <Text variant="caption" tone="secondary" width={64} tabular>
            {band.years}
          </Text>
        </Row>
      ))}
    </Column>
  );
}
