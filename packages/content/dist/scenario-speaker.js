import { z } from "zod";
// Split out of scenario.ts (file-size gate) — everything a scenario document
// needs to say about who is speaking: the role-hint vocabulary, the two
// speaker unions that use it (a beat's speaker and a rejoinder's), and the
// pre-narrowing `roleHint: "lead"` normalization both carry so a remote
// content service serving a shard cut before that narrowing still parses.
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
export const ScenarioRoleHint = z.enum([
    // The four a president convenes when a week goes wrong, and the interior.
    "foreign",
    "finance",
    "defense",
    "justice",
    "interior",
    // The domestic departments, in the order of precedence they sit in.
    "agriculture",
    "commerce",
    "labor",
    "health",
    "housing",
    "transportation",
    "energy",
    "education",
    "veterans",
    "homeland",
    // Cabinet rank with no department.
    "intelligence",
    // The player's own chair. A condition may read it; a speaker may not — see
    // `ScenarioSpeakerRoleHint`.
    "lead",
]);
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
export const ScenarioSpeakerRoleHint = ScenarioRoleHint.exclude(["lead"]);
// Speakers name chairs, not people: the campaign's own cabinet decides who
// answers to "defense", and a hint survives any charter's naming of its seats.
//
// The kinds are the presentation contract's, not a second list — `counterpart`
// is absent there and so absent here, which is what stops a foreign government
// from being written into the player's own secure thread.
//
// A shard cut before `ScenarioSpeakerRoleHint` narrowed away `"lead"` can still
// carry `{ kind: "cabinet", roleHint: "lead" }`. `ScenarioSpeakerRoleHint`'s own
// doc comment states the fact this rests on: the lead chair is, by
// construction, always the player, so that exact shape always meant "the
// player speaks" — never a guess, so normalizing it here is as exact as
// re-reading what the author wrote.
export const ScenarioSpeaker = z.preprocess((raw) => {
    if (raw &&
        typeof raw === "object" &&
        raw.kind === "cabinet" &&
        raw.roleHint === "lead") {
        return { kind: "player" };
    }
    return raw;
}, z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("cabinet"), roleHint: ScenarioSpeakerRoleHint }),
    z.object({ kind: z.literal("player") }),
    z.object({ kind: z.literal("narrator") }),
]));
const _speakerKindsAgree = true;
void _speakerKindsAgree;
/**
 * Who may answer the player after they have committed.
 *
 * The player is deliberately absent: they have just spoken, and a rejoinder in
 * their own mouth is the game writing their reaction for them. What comes back
 * is either a person in the room or the world itself, which is exactly the
 * cabinet/narrator pair.
 */
// Same pre-narrowing shard, same `roleHint: "lead"` shape — but a rejoinder
// has no `player` kind at all (the player is deliberately absent from their
// own rejoinder, see the doc comment above), so the only valid reading of a
// stale "the lead chair answers" is the narrator's voice, not a chair.
export const ScenarioRejoinderSpeaker = z.preprocess((raw) => {
    if (raw &&
        typeof raw === "object" &&
        raw.kind === "cabinet" &&
        raw.roleHint === "lead") {
        return { kind: "narrator" };
    }
    return raw;
}, z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("cabinet"), roleHint: ScenarioSpeakerRoleHint }),
    z.object({ kind: z.literal("narrator") }),
]));
const _rejoinderSpeakerIsScenarioSpeaker = true;
void _rejoinderSpeakerIsScenarioSpeaker;
