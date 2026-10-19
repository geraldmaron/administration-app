import { useImperativeHandle, useState, type Ref } from "react";

export interface TooltipContent {
  readonly name: string;
  readonly value: string;
  readonly x: number;
  readonly y: number;
}

export interface TooltipHandle {
  readonly show: (content: TooltipContent | null) => void;
}

/**
 * The hover and keyboard-cursor readout: the region's name and its lens value.
 * It owns its own state so a pointer move re-renders this and nothing else.
 * The same words are in the list, so it is hidden from assistive technology.
 */
export function MapTooltip({ handle }: { readonly handle: Ref<TooltipHandle> }) {
  const [content, setContent] = useState<TooltipContent | null>(null);
  useImperativeHandle(handle, () => ({ show: setContent }), []);
  if (!content) return null;
  return (
    <div className="map-tooltip" aria-hidden="true" style={{ transform: `translate(${Math.round(content.x)}px, ${Math.round(content.y)}px)` }}>
      <span className="map-tooltip__name">{content.name}</span>
      <span className="map-tooltip__value">{content.value}</span>
    </div>
  );
}
