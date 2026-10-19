// Zod mirror of the engine's DomesticSignature. Magnitude steps and route
// caps are imported from the engine rather than restated, so a generation
// brief that quotes them and the router that enforces them cannot drift.
import { MAGNITUDE_STEP, STATE_ROUTE_CAP, STATE_ROUTE_TURN_CAP, } from "@admin/engine";
import { IdeologyVector, SectorId } from "@admin/world";
import { z } from "zod";
const DOMESTIC_MAGNITUDES = Object.keys(MAGNITUDE_STEP);
export const DomesticMagnitudeSchema = z.enum(DOMESTIC_MAGNITUDES);
const AxisWeight = z.number().min(-1).max(1);
/** Partial economy-axis weights; omitted axes read as 0 at fold time. */
const DomesticAxes = z
    .object({
    industrial: AxisWeight.optional(),
    agricultural: AxisWeight.optional(),
    energy: AxisWeight.optional(),
    tech: AxisWeight.optional(),
    services: AxisWeight.optional(),
    defense: AxisWeight.optional(),
})
    .strict();
/** Partial ideology-axis weights; omitted axes read as 0 at fold time. */
const DomesticValues = IdeologyVector.partial().strict();
/** The policy channels an act may move (DECISIONS 5.8); omitted channels read as 0 at fold time. */
const DomesticChannels = z
    .object({
    civilRights: AxisWeight.optional(),
    immigration: AxisWeight.optional(),
    healthAccess: AxisWeight.optional(),
    disabilityPrograms: AxisWeight.optional(),
    veterans: AxisWeight.optional(),
})
    .strict();
/**
 * Who a nationally-scoped act hits at home. Declared by the reply, never
 * inferred from prose. Compiles through `domesticSignatureEffects` into
 * `routeDomestic` StateEffects and `routeCohorts` CohortEffects at cast time.
 *
 * `values` is the field that lets a reply about something other than an
 * industry — an identity or rights question, a religious-liberty dispute, an
 * immigration-status decision — still land with real state and cohort
 * texture instead of falling through to a national-only effect. It reads the
 * same `IdeologyVector` a reply's `pull` already commits to, so declaring
 * both is naming one fact once: what this decision says about the country.
 */
export const DomesticSignatureShape = z
    .object({
    axes: DomesticAxes.optional(),
    sectors: z.array(SectorId).min(1).optional(),
    urban: AxisWeight.optional(),
    federal: AxisWeight.optional(),
    values: DomesticValues.optional(),
    channels: DomesticChannels.optional(),
    magnitude: DomesticMagnitudeSchema,
    signature: z.string().min(1),
    reason: z.string().min(1),
})
    .strict();
export { MAGNITUDE_STEP, STATE_ROUTE_CAP, STATE_ROUTE_TURN_CAP };
