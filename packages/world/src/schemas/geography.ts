import { z } from "zod";
import { ChokepointId, NationId, RegionId } from "./ids.js";

// Geography is a mechanic, not flavour. Everything in this file exists because
// something reads it: distance prices force projection, chokepoints price
// trade risk, and a cradle's position decides who a founding player wakes up
// next to.

export const Chokepoint = z.object({
  id: ChokepointId,
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  // The regions whose sea traffic passes through here. Closing a chokepoint
  // hurts nations trading across these regions even when they are nowhere
  // near it.
  connects: z.array(RegionId).min(2),
  // Share of world seaborne trade that transits, used to scale how loud a
  // closure is globally as distinct from how much it hurts one nation.
  globalTrafficShare: z.number().min(0).max(1),
  // Whether one state can physically close it. An unclosable chokepoint like
  // the Cape route is a detour cost, not a weapon.
  closableByOneState: z.boolean(),
});
export type Chokepoint = z.infer<typeof Chokepoint>;

export const ChokepointDependence = z.object({
  chokepoint: ChokepointId,
  // How badly this nation is hurt if the chokepoint closes.
  weight: z.number().min(0.05).max(1),
});
export type ChokepointDependence = z.infer<typeof ChokepointDependence>;

export const NationGeography = z.object({
  nation: NationId,
  neighbors: z.array(NationId),
  chokepointDependence: z.array(ChokepointDependence),
});
export type NationGeography = z.infer<typeof NationGeography>;
