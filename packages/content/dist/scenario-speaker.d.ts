import { z } from "zod";
/**
 * The chairs a scenario may put words in the mouth of, or gate on.
 *
 * One hint per department, plus the intelligence chair and the player's own.
 * It was five for as long as the cabinet was five, and stayed five when the
 * cabinet became sixteen — so the Secretary of Agriculture could not speak in a
 * drought, no scenario could gate on the Homeland Security Secretary's
 * competence during a border week, and ten of the fifteen departments the game
 * models had no voice in any of its writing. A closed vocabulary is right — two
 * scenarios must be comparable by equality rather than by similarity — but it
 * has to be closed around the government that exists.
 *
 * These are *hints*, not role ids: a charter names its own seats, and
 * `ROLE_HINTS` in `scenario-cast.ts` resolves each of these against whatever
 * the campaign's charter happens to call the chair. A charter that seats no
 * agriculture minister resolves `agriculture` to nothing, and a beat that names
 * it falls to the narrator rather than inventing an official nobody seated.
 */
export declare const ScenarioRoleHint: z.ZodEnum<{
    justice: "justice";
    defense: "defense";
    interior: "interior";
    foreign: "foreign";
    finance: "finance";
    agriculture: "agriculture";
    commerce: "commerce";
    labor: "labor";
    health: "health";
    housing: "housing";
    transportation: "transportation";
    energy: "energy";
    education: "education";
    veterans: "veterans";
    homeland: "homeland";
    intelligence: "intelligence";
    lead: "lead";
}>;
export type ScenarioRoleHint = z.infer<typeof ScenarioRoleHint>;
/**
 * The `roleHint`s a SPEAKER may name — `ScenarioRoleHint` minus `"lead"`.
 *
 * `"lead"` is a legitimate hint for a `cabinetAttribute` *condition*: a scenario
 * gating on the integrity of the player-character's own office is a real thing
 * to want. It is not a legitimate hint for a *speaker*, because `matchRole`
 * resolves it against `Object.keys(campaign.player.cabinet)`, and the lead
 * chair is, by construction (see `founding.ts`'s `FoundingChoices.cabinet` doc
 * comment), always filled by the player's own persona. A `{ kind: "cabinet",
 * roleHint: "lead" }` speaker therefore always resolves to the player talking
 * to themselves in their own meeting transcript — this narrower enum is what
 * stops that shape from parsing. Use a real department hint, `{ kind:
 * "narrator" }`, or `{ kind: "player" }` if the beat is genuinely player-voiced.
 */
export declare const ScenarioSpeakerRoleHint: z.ZodEnum<{
    justice: "justice";
    defense: "defense";
    interior: "interior";
    foreign: "foreign";
    finance: "finance";
    agriculture: "agriculture";
    commerce: "commerce";
    labor: "labor";
    health: "health";
    housing: "housing";
    transportation: "transportation";
    energy: "energy";
    education: "education";
    veterans: "veterans";
    homeland: "homeland";
    intelligence: "intelligence";
}>;
export type ScenarioSpeakerRoleHint = z.infer<typeof ScenarioSpeakerRoleHint>;
export declare const ScenarioSpeaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"cabinet">;
    roleHint: z.ZodEnum<{
        justice: "justice";
        defense: "defense";
        interior: "interior";
        foreign: "foreign";
        finance: "finance";
        agriculture: "agriculture";
        commerce: "commerce";
        labor: "labor";
        health: "health";
        housing: "housing";
        transportation: "transportation";
        energy: "energy";
        education: "education";
        veterans: "veterans";
        homeland: "homeland";
        intelligence: "intelligence";
    }>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"player">;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"narrator">;
}, z.core.$strip>], "kind">>;
export type ScenarioSpeaker = z.infer<typeof ScenarioSpeaker>;
/**
 * Who may answer the player after they have committed.
 *
 * The player is deliberately absent: they have just spoken, and a rejoinder in
 * their own mouth is the game writing their reaction for them. What comes back
 * is either a person in the room or the world itself, which is exactly the
 * cabinet/narrator pair.
 */
export declare const ScenarioRejoinderSpeaker: z.ZodPreprocess<z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"cabinet">;
    roleHint: z.ZodEnum<{
        justice: "justice";
        defense: "defense";
        interior: "interior";
        foreign: "foreign";
        finance: "finance";
        agriculture: "agriculture";
        commerce: "commerce";
        labor: "labor";
        health: "health";
        housing: "housing";
        transportation: "transportation";
        energy: "energy";
        education: "education";
        veterans: "veterans";
        homeland: "homeland";
        intelligence: "intelligence";
    }>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"narrator">;
}, z.core.$strip>], "kind">>;
export type ScenarioRejoinderSpeaker = z.infer<typeof ScenarioRejoinderSpeaker>;
