import { z } from "zod";
import { NationId, PartyId } from "./ids.js";
import { NameForm } from "./people-pool.js";
/**
 * What a foreign government's leader must match, as of a stated date.
 *
 * The leaders are fictional and faithful: an invented person who shares the
 * real officeholder's sex, age band, title, regime and name culture, seated by
 * the parties that actually govern. So the row carries exactly the facts a
 * draw is held to and nothing that identifies the real person. There is no
 * name field and no source prose; the sources stay with the research record,
 * which is never rendered.
 */
export const LeaderSeat = z.enum(["head_of_state", "head_of_government"]);
export const LeaderAgeBand = z.enum(["30-39", "40-49", "50-59", "60-69", "70-79", "80+"]);
export const RegimeType = z.enum([
    "full_democracy",
    "flawed_democracy",
    "hybrid_regime",
    "authoritarian",
    "one_party_state",
    "military_junta",
    "absolute_monarchy",
    "constitutional_monarchy_executive",
    "theocracy",
]);
export const LeaderSex = z.enum(["M", "F"]);
export const LeaderConstraint = z
    .object({
    nation: NationId,
    /** The day the row was true, ISO: a provenance chip names it. */
    asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    seat: LeaderSeat,
    title: z.string().trim().min(1),
    sex: LeaderSex,
    ageBand: LeaderAgeBand,
    /** The other executive chair's title, or "same" when one person holds both. */
    secondSeatTitle: z.string().trim().min(1),
    regime: RegimeType,
    nameCulture: z.string().min(1),
    /** How the table's surname rule writes a name there: family name first, "bin" and the father's, and so on. */
    nameForm: NameForm,
    governing: z.array(PartyId),
    /** A government that runs no parties, which is a researched fact, not a gap. */
    partyless: z.boolean(),
    /** Women's share of the cabinet, 0..1. */
    womenCabinetShare: z.number().min(0).max(1),
    /** The share predates the sitting cabinet, so a draw reads it as a prior rather than a rule. */
    shareFlagged: z.boolean(),
})
    .refine((row) => row.partyless === (row.governing.length === 0), {
    message: "a partyless government names no governing party, and every other government names at least one",
    path: ["governing"],
});
