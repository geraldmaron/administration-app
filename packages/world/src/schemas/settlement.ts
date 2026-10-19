import { z } from "zod";
import { NationId, SettlementId } from "./ids.js";
import { StateId } from "./state.js";

/** Geographic context only; these points carry no invented employment or production capacity. */
export const Settlement = z.object({
  id: SettlementId,
  nation: NationId,
  state: StateId,
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  population: z.number().positive(),
  source: z.literal("natural-earth-10m-5.1.2"),
  roadBorderCrossing: z.literal(true).optional(),
  commercialPort: z.literal(true).optional(),
}).strict();
export type Settlement = z.infer<typeof Settlement>;
