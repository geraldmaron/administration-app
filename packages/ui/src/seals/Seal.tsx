import { useMemo } from "react";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { FONT_FACES } from "../theme/tamagui.config";
import { sealInk } from "../theme/seal-palette";
import { composeSeal, type SealElement } from "./compose";
import type { SealSpec } from "./types";

export type SealProps = {
  readonly spec: SealSpec;
  /** Pixels square. Below 56 the seal shows its device alone, without legend or ornament. */
  readonly size?: number;
  /** Given only when no visible text beside the seal already names the body. */
  readonly label?: string;
};

function render(element: SealElement, key: number): React.ReactElement {
  switch (element.kind) {
    case "group":
      return (
        <G key={key} transform={element.transform}>
          {element.children.map(render)}
        </G>
      );
    case "text":
      return (
        <G key={key} transform={`rotate(${element.rotate.toFixed(2)} ${element.x.toFixed(2)} ${element.y.toFixed(2)})`}>
          <SvgText
            x={element.x}
            y={element.y}
            fontSize={element.size}
            fontFamily={element.face === "serif" ? FONT_FACES.serif[700] : FONT_FACES.sans[700]}
            fontWeight="700"
            fill={sealInk(element.color)}
            textAnchor="middle"
          >
            {element.text}
          </SvgText>
        </G>
      );
    case "path":
      return (
        <Path
          key={key}
          d={element.d}
          fill={element.fill ? sealInk(element.fill) : "none"}
          {...(element.stroke ? { stroke: sealInk(element.stroke), strokeWidth: element.width, strokeLinecap: "round" as const, strokeLinejoin: "round" as const } : {})}
          {...(element.evenOdd ? { fillRule: "evenodd" as const } : {})}
          {...(element.opacity !== undefined ? { opacity: element.opacity } : {})}
        />
      );
  }
}

/**
 * An institution's emblem, drawn from its spec. Decorative unless labeled:
 * a seal beside the body's name says nothing a screen reader needs twice.
 * The artwork keeps its own colors in every theme, as a printed seal does.
 */
export function Seal({ spec, size = 64, label }: SealProps) {
  const elements = useMemo(() => composeSeal(spec, size), [spec, size]);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      {...(label
        ? { role: "img" as const, "aria-label": label }
        : { "aria-hidden": true as const })}
    >
      {elements.map(render)}
    </Svg>
  );
}
