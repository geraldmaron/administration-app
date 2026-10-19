import { z } from "zod";
import { CityId, NationId } from "./ids.js";
import { StateId } from "./state.js";
// Major metros as a geography mechanic: named places the engine can bind,
// score, and mutate. Not map flavour. Ids are CITY-{ISO3}-{slug}.
export const CityKind = z.enum(["capital", "port", "interior", "border", "industrial", "financial"]);
const CityObject = z.object({
    id: CityId,
    nation: NationId,
    name: z.string().min(1),
    kind: CityKind,
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    population: z.number().positive(),
    employment: z.number().int().nonnegative(),
    taxBase: z.number().nonnegative(),
    demShare: z.number().min(0).max(1).optional(),
    state: StateId.optional(),
});
export const City = CityObject.superRefine((city, ctx) => {
    const isUsa = city.nation === "USA";
    const hasShare = city.demShare !== undefined;
    if (isUsa && !hasShare) {
        ctx.addIssue({ code: "custom", message: "demShare is required on US cities", path: ["demShare"] });
    }
    if (!isUsa && hasShare) {
        ctx.addIssue({ code: "custom", message: "demShare is forbidden outside the United States", path: ["demShare"] });
    }
    const hasState = city.state !== undefined;
    if (isUsa && !hasState) {
        ctx.addIssue({ code: "custom", message: "state is required on US cities", path: ["state"] });
    }
    if (!isUsa && hasState) {
        ctx.addIssue({ code: "custom", message: "state is forbidden outside the United States", path: ["state"] });
    }
});
// Unrefined object so the consumer-registry walk can see leaf fields.
export const CityObjectSchema = CityObject;
