import type { DeviceId, SealColor, SealShape, SealSpec } from "../types.js";

export type Tincture = readonly [field: SealColor, rim: SealColor, device: SealColor];

type Extra = Omit<Partial<SealSpec>, "id" | "shape" | "field" | "rim" | "device" | "deviceColor" | "ring">;

/** One seal: its shape, its tinctures (field, rim, device), its device and the legend around it. */
export function seal(id: string, shape: SealShape, [field, rim, device]: Tincture, deviceId: DeviceId, legend?: string, extra: Extra = {}): SealSpec {
  return {
    id,
    shape,
    field,
    rim,
    ...(legend ? { ring: { text: legend, color: rim === field ? device : rim } } : {}),
    device: deviceId,
    deviceColor: device,
    ...extra,
  };
}

export const USA = "UNITED STATES OF AMERICA";

export function byId(specs: readonly SealSpec[]): Readonly<Record<string, SealSpec>> {
  return Object.fromEntries(specs.map((spec) => [spec.id, spec]));
}
