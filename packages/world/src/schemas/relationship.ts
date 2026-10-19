import { z } from "zod";
import { NationId, TreatyId } from "./ids.js";

// Directed: how A sees B need not match how B sees A.
export const Grudge = z.object({
  cause: z.string().min(1),
  weight: z.number().min(0).max(1),
  createdTurn: z.number().int().nonnegative(),
  decayRate: z.number().min(0).max(1),
});
export type Grudge = z.infer<typeof Grudge>;

export const RelationshipEvent = z.object({
  turn: z.number().int().nonnegative(),
  kind: z.string().min(1),
  description: z.string().min(1),
});
export type RelationshipEvent = z.infer<typeof RelationshipEvent>;

export const Relationship = z.object({
  from: NationId,
  to: NationId,
  trust: z.number().min(-1).max(1),
  alignment: z.number().min(-1).max(1),
  tension: z.number().min(0).max(1),
  tradeDependence: z.number().min(0).max(1),
  militaryThreat: z.number().min(0).max(1),
  treaties: z.array(TreatyId),
  grudges: z.array(Grudge),
  history: z.array(RelationshipEvent),
});
export type Relationship = z.infer<typeof Relationship>;
