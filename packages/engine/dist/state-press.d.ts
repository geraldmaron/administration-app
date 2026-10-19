import type { PersonId } from "@admin/world";
export type PressAction = "interview" | "press-conference" | "leak";
/** The three ways a President answers a live scandal. */
export type ScandalVerb = "come-clean" | "fight-it" | "give-them-someone";
/** The President's answer to one scandal: which verb, the week it was given, and who was left acting when an officer was handed over. */
export type ScandalResponse = {
    readonly verb: ScandalVerb;
    readonly turn: number;
    readonly acting?: PersonId;
};
export type PressEngagement = {
    readonly id: string;
    readonly kind: PressAction;
    readonly turn: number;
    /** How it actually went, which is not always how it was projected to go. */
    readonly wentWell: boolean;
    readonly summary: string;
    /**
     * The masthead the play was with, where it was with one.
     *
     * The issued act carries it and the resolved record did not, so the corps
     * could say that an interview went badly and could not say whose interview it
     * was — which is the whole point of holding dispositions per outlet. Absent
     * means a play with the room rather than with one paper, which is what a press
     * conference is.
     */
    readonly outletId?: string;
};
export type PressCorps = {
    /**
     * How the corps as a whole is disposed toward this administration, 0..1.
     *
     * Derived, never authored: the evenly-weighted mean of `dispositions`. It is
     * carried in the state rather than recomputed at every read because three
     * systems already read it — the coalitions, a public appeal on the Hill, and
     * the capped press term in the six judgments — and none of them should have
     * to know the corps has parts. press.ts is its one writer.
     */
    readonly standing: number;
    /**
     * What each masthead thinks of this administration, by outlet id.
     *
     * The corps used to be one number wearing four hats: an outlet's disposition
     * was the standing plus its own lean, so nothing could move one paper without
     * moving all four by the same amount, and the four could never disagree about
     * a week. Held per outlet, an interview is with somebody, a leak is placed on
     * somebody's desk, and a paper hostile since the inauguration can be won round
     * without having to buy the other three.
     */
    readonly dispositions: Readonly<Record<string, number>>;
    /**
     * The last week the administration said anything on the record. Silence is
     * half of what press standing is made of: a government that stops explaining
     * itself is covered as a government with something to hide, and without this
     * field the model could only price what was said and never what was not.
     */
    readonly lastSpokeTurn: number;
    readonly engagements: readonly PressEngagement[];
    /**
     * The President's answers to scandals, keyed by the scandal's derived id.
     *
     * The story itself stays derived from the ledger, so this is the only
     * stored half of it. Absent until the first answer; a save from before the
     * field kept the answer as a dated `scandal-response:<id>:<verb>` flag, which
     * `scandalResponseOf` still reads, so no save-version bump.
     */
    readonly scandalResponses?: Readonly<Record<string, ScandalResponse>>;
};
