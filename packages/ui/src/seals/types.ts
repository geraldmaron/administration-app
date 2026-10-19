/**
 * The seal spec the design system draws. Structurally identical to
 * player-core's `SealSpec` (packages/ui never imports player-core: it renders
 * the specs it is handed), so a registry entry passes straight in.
 * `scripts/verify-seal-coverage.mjs` holds the vocabularies in step.
 */
export type SealShape = "roundel" | "shield" | "star" | "masthead" | "rosette" | "octagon";

export type SealSpec = {
  readonly id: string;
  readonly shape: SealShape;
  readonly field: string;
  readonly rim: string;
  readonly ring?: { readonly text: string; readonly color: string };
  readonly device: string;
  readonly deviceColor: string;
  readonly charge?: { readonly device: string; readonly color: string; readonly field?: string };
  readonly accents?: { readonly stars?: number; readonly motto?: string; readonly wreath?: boolean; readonly rays?: boolean };
  readonly monogram?: string;
  readonly nameplate?: { readonly face: "serif" | "sans"; readonly caps: boolean; readonly rule: "double" | "single" | "thick" };
};

/**
 * One layer of a device drawing on its 100×100 grid. `ink` is the device's
 * color, `field` cuts detail back to the ground it sits on, `rim` picks it
 * out in the seal's rim metal.
 */
export type DevicePart = {
  readonly d: string;
  readonly tone?: "ink" | "field" | "rim";
  /** Draw as a line of this width instead of filling. */
  readonly stroke?: number;
  readonly evenOdd?: boolean;
};

export type DeviceDrawing = {
  readonly parts: readonly DevicePart[];
  /** Where a charge's escutcheon sits on this device, on the same grid. */
  readonly charge?: { readonly x: number; readonly y: number; readonly size: number };
};
